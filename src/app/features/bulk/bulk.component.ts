import { PokemonService } from '~features/pokemon/services/pokemon.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
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

import type { Pokemon, SelectablePokemon } from '../pokemon/types/pokemon.type';
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

  private selectedPokemonImpl() {
    return this.pokemonCollection().filter((pokemon) => pokemon.isSelected);
  }

  // eslint-disable-next-line max-lines-per-function
  constructor() {
    this.allPokemon$ = this.pageNumberEnterPressed$.pipe(
      switchMap((pageNumber) => this.pokemonService.getPokemonPage(pageNumber)),
      catchError((error) => {
        this.alertService.createErrorAlert(error);
        return [];
      }),
    );
    this.filteredPokemon$ = this.allPokemon$.pipe(
      map((pokemonlist) =>
        pokemonlist.map((pokemon): SelectablePokemon => ({ ...pokemon, isSelected: false })),
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

  onPokemonClicked({ pokemon, event }: PokemonCardClickEvent) {
    const mouseEvent = event as MouseEvent;
    if (!pokemon) {
      throw new Error('Unexpected undefined pokemon');
    }
    const value = pokemon as SelectablePokemon;
    const lastIndex = this.lastIndex();
    const pokemonCollection = this.pokemonCollection();

    this.handlePokemonSelection({
      value,
      lastIndex,
      mouseEvent,
      pokemonCollection,
    });
  }

  private handlePokemonSelection({
    value,
    lastIndex,
    mouseEvent,
    pokemonCollection,
  }: {
    value: SelectablePokemon;
    lastIndex: number;
    mouseEvent: MouseEvent;
    pokemonCollection: SelectablePokemon[];
  }) {
    const index = pokemonCollection.findIndex((pokemon2) => pokemon2.id === value.id);
    if (mouseEvent.shiftKey && lastIndex >= 0) {
      this.updateShiftClickSelection({
        pokemonCollection,
        lastIndex,
        currentIndex: index,
      });
    } else {
      this.pokemonCollection.update((items) => this.selectionReversedItems(items, value.id));
    }
    this.lastIndex.set(index);
  }

  private updateShiftClickSelection({
    pokemonCollection,
    lastIndex,
    currentIndex,
  }: {
    pokemonCollection: SelectablePokemon[];
    lastIndex: number;
    currentIndex: number;
  }) {
    let lastItem: SelectablePokemon | undefined;
    const updated = pokemonCollection.map((item, index_) => {
      if (!lastItem) {
        if (index_ === lastIndex) {
          lastItem = item;
          return item;
        }
        return item;
      }
      if (index_ <= currentIndex) {
        return {
          ...item,
          isSelected: lastItem.isSelected,
        };
      }
      return item;
    });
    this.pokemonCollection.set(updated);
  }
  private selectionReversedItems(items: SelectablePokemon[], id: number) {
    return items.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return {
        ...item,
        isSelected: !item.isSelected,
      };
    });
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
  pokemon: Pokemon | undefined;
  event: Event;
};