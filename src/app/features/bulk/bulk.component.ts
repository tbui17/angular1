/* eslint-disable max-lines */
import { PokemonService } from '~features/pokemon/services/pokemon.service';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { PokemonCardComponent } from '../pokemon/components/pokemon-card/pokemon-card.component';
import { AlertService } from '../../core/services/alert.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  BehaviorSubject,
  catchError,
  combineLatestWith,
  filter,
  map,
  onErrorResumeNext,
  startWith,
  Subject,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import type { SelectablePokemon } from '../pokemon/types/pokemon.type';
import { UserService } from '../authentication/services/user.service';
import type { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';

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
  readonly pageCount$;
  private readonly pokemonCollectionElement = viewChild.required<ElementRef<HTMLDivElement>>(
    'pokemonCollectionElement',
  );
  private readonly renderer = inject(Renderer2);

  private selectedPokemonImpl() {
    return this.pokemonCollection().filter((pokemon) => pokemon.isSelected);
  }

  // eslint-disable-next-line max-lines-per-function
  constructor() {
    this.renderer.listen('document', 'click', (event: Event) => {
      if (!this.pokemonCollectionElement().nativeElement.contains(event.target as Node)) {
        this.deselectAll();
      }
    });
    this.allPokemon$ = this.pageNumberEnterPressed$.pipe(
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
      combineLatestWith(this.nameFilter$),
      map(([pokemonCollection, filterValue]) => {
        if (filterValue.length === 0) {
          return pokemonCollection;
        }
        return pokemonCollection.filter((pokemon) =>
          pokemon.name.toLowerCase().includes(filterValue),
        );
      }),
    );
    this.filteredPokemon$.subscribe((items) => {
      this.pokemonCollection.set(items);
      this.lastIndex.set(-1);
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
    this.catchClicked$.next(true);
  }

  // eslint-disable-next-line max-lines-per-function
  getNextSelectionState<T extends { isSelected: boolean }>({
    collection,
    hasCtrlKey,
    hasShiftKey,
    index,
    lastIndex,
  }: GetNextSelectionStateArguments<T>) {
    const lastIndexIsUninitialized = () => lastIndex < 0;

    const singleClickAction = () => ({
      collection: collection.map((item, index_) => ({
        ...item,
        isSelected: index_ === index,
      })),
      nextLastIndexValue: index,
    });

    if (lastIndexIsUninitialized()) {
      return singleClickAction();
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
        collection: updatedShiftClickSelection({
          collection,
          lastIndex,
          currentIndex: index,
        }),
        nextLastIndexValue: lastIndex,
      };
    }

    return singleClickAction();
  }

  // eslint-disable-next-line max-lines-per-function
  onPokemonClicked({ index, event }: PokemonCardClickEvent) {
    const lastIndex = this.lastIndex();

    const collection = this.pokemonCollection();

    const hasShiftKey = event.shiftKey;
    const hasCtrlKey = event.ctrlKey;

    const lastIndexIsUninitialized = () => lastIndex < 0;

    const singleClickAction = () => ({
      pokemonCollection: collection.map((item, index_) => ({
        ...item,
        isSelected: index_ === index,
      })),
      nextLastIndexValue: index,
    });

    const impl = (): UpdateValues => {
      if (lastIndexIsUninitialized()) {
        return singleClickAction();
      }
      if (hasCtrlKey) {
        return {
          pokemonCollection: collection.map((item, index_) => {
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
          pokemonCollection: this.updatedShiftClickSelection({
            pokemonCollection: collection,
            lastIndex,
            currentIndex: index,
          }),
          nextLastIndexValue: lastIndex,
        };
      }

      return singleClickAction();
    };

    const { pokemonCollection, nextLastIndexValue } = impl();

    this.pokemonCollection.set(pokemonCollection);
    this.lastIndex.set(nextLastIndexValue);
  }

  private updatedShiftClickSelection({
    pokemonCollection,
    lastIndex,
    currentIndex,
  }: {
    pokemonCollection: SelectablePokemon[];
    lastIndex: number;
    currentIndex: number;
  }) {
    const [start, end] = [lastIndex, currentIndex].sort((itemA, itemB) => itemA - itemB);

    return pokemonCollection.map((item, index) => ({
      ...item,
      isSelected: index >= start && index <= end,
    }));
  }

  private updatedShiftClickSelectionReverse({
    pokemonCollection,
    lastIndex,
    currentIndex,
  }: {
    pokemonCollection: SelectablePokemon[];
    lastIndex: number;
    currentIndex: number;
  }) {
    const updated = pokemonCollection.map((item, index) => {
      if (index >= currentIndex && index <= lastIndex) {
        return {
          ...item,
          isSelected: true,
        };
      }
      return {
        ...item,
        isSelected: false,
      };
    });
    return updated;
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
}

type UpdateValues = {
  pokemonCollection: SelectablePokemon[];
  nextLastIndexValue: number;
};

type PokemonCardClickEvent = {
  index: number;
  event: MouseEvent;
};

type GetNextSelectionStateArguments<T extends { isSelected: boolean }> = {
  index: number;
  lastIndex: number;
  hasShiftKey: boolean;
  hasCtrlKey: boolean;
  collection: T[];
};

function updatedShiftClickSelection<T>({
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
