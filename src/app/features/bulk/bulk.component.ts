import { PokemonService } from '~features/pokemon/services/pokemon.service';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PokemonCardComponent } from '../pokemon/components/pokemon-card/pokemon-card.component';
import { AlertService } from '../../core/services/alert.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { sortBy } from 'remeda';

import {
  BehaviorSubject,
  catchError,
  combineLatestWith,
  filter,
  fromEvent,
  map,
  onErrorResumeNext,
  startWith,
  Subject,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import type { Selectable, SelectablePokemon } from '../pokemon/types/pokemon.type';
import { UserService } from '../authentication/services/user.service';
import type { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-bulk',
  imports: [PokemonCardComponent, ReactiveFormsModule, AsyncPipe],
  templateUrl: './bulk.component.html',
  styleUrl: './bulk.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BulkComponent {
  private readonly pokemonService: PokemonService = inject(PokemonService);
  private readonly alertService = inject(AlertService);
  private readonly userService = inject(UserService);

  private readonly allPokemon$;

  readonly pageNumber = new FormControl(1, { nonNullable: true });
  readonly pageNumberEnterPressed$ = new BehaviorSubject<number>(1);
  readonly filteredPokemon$;
  readonly pokemonCollection = signal(new Array<SelectablePokemon>());
  readonly nameFilter = new FormControl('', { nonNullable: true });
  readonly nameFilter$ = this.nameFilter.valueChanges.pipe(startWith(''));
  readonly selectedPokemon = computed(this.selectedPokemonImpl.bind(this));
  readonly catchClicked$ = new Subject<boolean>();
  readonly lastIndex = signal(-1);
  readonly sortOptions = ['Order', 'Name', 'Height', 'Weight'];
  readonly selectedSortOption = new FormControl('Order', { nonNullable: true });
  readonly isSortedDescending = signal(true);

  readonly pageCount$;
  private readonly pokemonCollectionElement = viewChild.required<ElementRef<HTMLDivElement>>(
    'pokemonCollectionElement',
  );
  private readonly catchElement = viewChild.required<ElementRef<HTMLButtonElement>>('catch');
  readonly isLoading = signal(false);

  private selectedPokemonImpl() {
    return this.pokemonCollection().filter((pokemon) => pokemon.isSelected);
  }

  // eslint-disable-next-line max-lines-per-function
  constructor() {
    fromEvent(window, 'click')
      .pipe(
        filter(({ target }) => {
          const node = target as Node;
          const collection = this.pokemonCollectionElement().nativeElement;
          const catchElement = this.catchElement().nativeElement;
          return !collection.contains(node) && node !== catchElement;
        }),
      )
      .subscribe(() => {
        this.deselectAll();
      });
    this.allPokemon$ = this.pageNumberEnterPressed$.pipe(
      tap(() => {
        this.isLoading.set(true);
      }),
      switchMap((pageNumber) => this.pokemonService.getPokemonPage(pageNumber)),
      catchError((error) => {
        this.alertService.createErrorAlert(error);
        return [];
      }),
    );
    this.filteredPokemon$ = this.allPokemon$.pipe(
      map((pokemonlist) =>
        pokemonlist.map((pokemon): SelectablePokemon => {
          const result: SelectablePokemon = { ...pokemon, isSelected: false };
          return result;
        }),
      ),
      combineLatestWith(
        this.nameFilter$,
        this.selectedSortOption.valueChanges.pipe(startWith(this.selectedSortOption.value)),
        toObservable(this.isSortedDescending),
      ),
      map(([pokemonCollection, filterValue, sortValue, isSortedAscending]) => {
        const lowerFilterValue = filterValue.toLowerCase();
        const filtered = pokemonCollection.filter((pokemon) =>
          pokemon.name.toLowerCase().includes(lowerFilterValue),
        );

        const sorted = sortBy(
          filtered,
          (pokemon) => pokemon[sortValue.toLowerCase() as keyof SelectablePokemon],
        );
        if (!isSortedAscending) {
          return sorted.reverse();
        }
        return sorted;
      }),
    );
    this.filteredPokemon$.subscribe((items) => {
      this.pokemonCollection.set(items);
      this.lastIndex.set(-1);
      this.isLoading.set(false);
    });

    this.catchClicked$
      .pipe(
        filter((canCatch) => canCatch),
        map(() => this.selectedPokemon()),
        tap(() => {
          this.deselectAll();
        }),
        switchMap((pokemonList) => {
          const obs = pokemonList.map((pokemon) =>
            this.userService.catchPokemon({ pokemonId: pokemon.id }).pipe(
              map(() => pokemon),
              catchError((error: HttpErrorResponse) => {
                this.alertService.createErrorAlert(error.message);
                return throwError(() => error);
              }),
            ),
          );
          return onErrorResumeNext(...obs);
        }),
      )
      .subscribe((response) => {
        this.alertService.createSuccessAlert(`Caught ${response.name}`);
      });
    this.pageCount$ = this.pokemonService.getPageCount();
  }

  onPageNumberEnter() {
    this.pageNumberEnterPressed$.next(this.pageNumber.value);
  }

  catchPokemon() {
    if (this.selectedPokemon().length === 0) {
      return;
    }
    this.catchClicked$.next(true);
  }

  onPokemonClicked({ index, event }: PokemonCardClickEvent) {
    const { collection, nextLastIndexValue } = getNextSelectionState({
      collection: this.pokemonCollection(),
      lastIndex: this.lastIndex(),
      hasShiftKey: event.shiftKey,
      hasCtrlKey: event.ctrlKey,
      index,
    });

    this.pokemonCollection.set(collection);
    this.lastIndex.set(nextLastIndexValue);
  }

  private deselectAll() {
    this.pokemonCollection.update((item) => this.deselectedAll(item));
  }

  private deselectedAll(items: SelectablePokemon[]) {
    return items.map((item) => ({
      ...item,
      isSelected: false,
    }));
  }

  toggleSortOrder() {
    this.isSortedDescending.update((value) => !value);
  }
}

type PokemonCardClickEvent = {
  index: number;
  event: MouseEvent;
};

type GetNextSelectionStateArguments<T extends Selectable> = {
  index: number;
  lastIndex: number;
  hasShiftKey: boolean;
  hasCtrlKey: boolean;
  collection: T[];
};

function getShiftClickSelectionState<T>({
  collection,
  lastIndex,
  currentIndex,
}: {
  collection: T[];
  lastIndex: number;
  currentIndex: number;
}) {
  const [start, end] = [lastIndex, currentIndex].sort((itemA, itemB) => itemA - itemB);

  return collection.map((item, index) => ({
    ...item,
    isSelected: index >= start && index <= end,
  }));
}

// eslint-disable-next-line max-lines-per-function
function getNextSelectionState<T extends Selectable>({
  collection,
  hasCtrlKey,
  hasShiftKey,
  index,
  lastIndex,
}: GetNextSelectionStateArguments<T>) {
  const lastIndexIsUninitialized = lastIndex < 0;

  const getSingleLeftClickSelectionState = () => ({
    collection: collection.map((item, index_) => ({
      ...item,
      isSelected: index_ === index,
    })),
    nextLastIndexValue: index,
  });

  if (lastIndexIsUninitialized) {
    return getSingleLeftClickSelectionState();
  }
  if (hasCtrlKey) {
    return {
      collection: collection.map((item, index_) => {
        if (index_ === index) {
          return { ...item, isSelected: true };
        }
        return item;
      }),
      nextLastIndexValue: index,
    };
  }
  if (hasShiftKey) {
    return {
      collection: getShiftClickSelectionState({
        collection,
        lastIndex,
        currentIndex: index,
      }),
      nextLastIndexValue: lastIndex,
    };
  }

  return getSingleLeftClickSelectionState();
}
