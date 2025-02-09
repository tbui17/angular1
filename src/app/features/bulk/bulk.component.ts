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

  // eslint-disable-next-line max-lines-per-function, max-statements, complexity
  onPokemonClicked({ index, event }: PokemonCardClickEvent) {
    const mouseEvent = event as MouseEvent;

    const lastIndex = this.lastIndex();
    let pokemonCollection = this.pokemonCollection();
    const value = pokemonCollection[index];

    const latestIndex = pokemonCollection.findIndex((pokemon2) => pokemon2.id === value.id);
    let nextLastIndexValue = lastIndex;

    if (mouseEvent.shiftKey && lastIndex >= 0) {
      pokemonCollection = pokemonCollection.map((pokemon2, index_) => ({
        ...pokemon2,
        isSelected: index_ === latestIndex,
      }));
      if (latestIndex === lastIndex) {
        pokemonCollection = pokemonCollection.map((item) =>
          item.id === value.id ? { ...item, isSelected: true } : item,
        );
      } else if (latestIndex > lastIndex) {
        pokemonCollection = this.updatedShiftClickSelection({
          pokemonCollection,
          lastIndex,
          currentIndex: latestIndex,
        });
      } else {
        pokemonCollection = this.updatedShiftClickSelectionReverse({
          pokemonCollection,
          lastIndex,
          currentIndex: latestIndex,
        });
      }
    } else if (mouseEvent.ctrlKey) {
      pokemonCollection = pokemonCollection.map((item, index2) => {
        if (index2 === latestIndex) {
          return { ...item, isSelected: true };
        }
        return item;
      });
      nextLastIndexValue = latestIndex;
    } else {
      pokemonCollection = pokemonCollection.map((item) =>
        item.id === value.id ? { ...item, isSelected: true } : { ...item, isSelected: false },
      );
      nextLastIndexValue = latestIndex;
    }
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
    const updated = pokemonCollection.map((item, index) => {
      if (index <= currentIndex && index >= lastIndex) {
        return {
          ...item,
          isSelected: true,
        };
      }
      return item;
    });
    return updated;
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
      return item;
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

type PokemonCardClickEvent = {
  index: number;
  event: Event;
};
