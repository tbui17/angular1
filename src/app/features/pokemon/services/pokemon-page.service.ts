import { PokemonService } from '~features/pokemon/services/pokemon.service';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import {
  BehaviorSubject,
  catchError,
  combineLatestWith,
  map,
  Observable,
  shareReplay,
  startWith,
  switchMap,
  throwError,
} from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { sortBy } from 'remeda';
import { Pokemon } from '../types/pokemon.type';

@Injectable({
  providedIn: 'root',
})
export class PokemonPageService {
  private readonly pokemonService = inject(PokemonService);
  private readonly alertService = inject(AlertService);
  private pages$ = new BehaviorSubject(1);

  readonly pageInput = new FormControl<number>(1, { nonNullable: true });
  readonly nameFilter = new FormControl('', { nonNullable: true });
  readonly sortOptions: Array<keyof Pokemon> = ['order', 'name', 'height', 'weight'];
  readonly selectedSortOption = new FormControl<keyof Pokemon>('order', { nonNullable: true });
  readonly totalPages$ = this.pokemonService.getPageCount();
  readonly isSortedDescending = signal(true);
  readonly data$: Observable<Pokemon[]>;

  constructor() {
    this.data$ = this.pages$.pipe(
      switchMap((pageNumber) => this.pokemonService.getPokemonPage(pageNumber)),
      catchError((error) => {
        this.alertService.createErrorAlert(error);
        return throwError(() => error);
      }),
      combineLatestWith(
        this.nameFilter.valueChanges.pipe(startWith('')),
        this.selectedSortOption.valueChanges.pipe(startWith(this.selectedSortOption.value)),
        toObservable(this.isSortedDescending),
      ),
      map(([pokemonCollection, filterValue, sortValue, isSortedAscending]) => {
        const lowerFilterValue = filterValue.toLocaleLowerCase();
        const filtered = pokemonCollection.filter((pokemon) =>
          pokemon.name.toLocaleLowerCase().includes(lowerFilterValue),
        );

        const sorted = sortBy(filtered, (pokemon) => pokemon[sortValue]);
        if (!isSortedAscending) {
          return sorted.reverse();
        }
        return sorted;
      }),
    );
  }

  fetchPage() {
    this.pages$.next(this.pageInput.value);
  }
}
