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
import { PokemonCardComponent } from '../../../pokemon/components/pokemon-card/pokemon-card.component';
import { AlertService } from '../../../../core/services/alert.service';
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

import type { SelectablePokemon } from '../../../pokemon/types/pokemon.type';
import { UserService } from '../../../authentication/services/user.service';
import type { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-bulk',
  imports: [PokemonCardComponent, ReactiveFormsModule, AsyncPipe],
  templateUrl: './bulk.component.html',
  styleUrl: './bulk.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [SelectionService],
})
export class BulkComponent {
  private readonly pokemonService: PokemonService = inject(PokemonService);
  private readonly alertService = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly selectionService = inject(SelectionService);

  private readonly allPokemon$;
  readonly filteredPokemon$;
  readonly selectedPokemon = computed(this.selectedPokemonImpl.bind(this));

  readonly pageNumber = new FormControl(1, { nonNullable: true });
  readonly pageNumberEnterPressed$ = new BehaviorSubject<number>(1);

  readonly pokemonCollection = signal(new Array<SelectablePokemon>());
  readonly nameFilter = new FormControl('', { nonNullable: true });
  readonly nameFilter$ = this.nameFilter.valueChanges.pipe(startWith(''));

  readonly catchClicked$ = new Subject();
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
    const collection = this.pokemonCollection();
    return this.selectionService.selected().map((index) => collection[index]);
  }

  // eslint-disable-next-line max-lines-per-function
  constructor() {
    this.pageCount$ = this.pokemonService.getPageCount();

    // reset selection after clicking outside
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
        this.selectionService.clear();
      });

    // fetch a page of data from server
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

    // client side filter and sort applied to page data
    this.filteredPokemon$ = this.allPokemon$.pipe(
      map((pokemonlist) =>
        pokemonlist.map((pokemon): SelectablePokemon => {
          const result: SelectablePokemon = { ...pokemon, isSelected: false };
          return result;
        }),
      ),
      // triggered on filter, sort option, sort order change
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

    // finish data fetching
    this.filteredPokemon$.subscribe((items) => {
      this.pokemonCollection.set(items);
      this.selectionService.clear();
      this.isLoading.set(false);
    });

    // send selected items to caught database
    this.catchClicked$
      .pipe(
        map(() => this.selectedPokemon()),
        tap(() => {
          this.selectionService.clear();
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
  }

  onPageNumberEnter() {
    this.pageNumberEnterPressed$.next(this.pageNumber.value);
  }

  catchPokemon() {
    if (this.selectionService.isEmpty()) {
      this.alertService.createErrorAlert('Please select a pokemon to catch.');
      return;
    }
    this.catchClicked$.next(true);
  }

  isSelected(index: number) {
    return this.selectionService.isSelected(index);
  }

  onPokemonClicked(data: PokemonCardClickEvent) {
    this.selectionService.select(data);
  }

  toggleSortOrder() {
    this.isSortedDescending.update((value) => !value);
  }
}

type PokemonCardClickEvent = {
  index: number;
  event: MouseEvent;
};
