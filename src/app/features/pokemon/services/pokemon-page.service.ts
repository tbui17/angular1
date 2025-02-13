import { PokemonService } from '~features/pokemon/services/pokemon.service';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, catchError, combineLatestWith, map, startWith, switchMap } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { sortBy } from 'remeda';
import { Pokemon } from '../types/pokemon.type';

@Injectable({
  providedIn: 'root',
})
export class PokemonPageService {
  private readonly pokemonService = inject(PokemonService);
  private readonly alertService = inject(AlertService);
  pageInput = new FormControl<number>(1, { nonNullable: true });
  private pages$ = new BehaviorSubject(1);
  readonly nameFilter = new FormControl('', { nonNullable: true });
  readonly selectedSortOption = new FormControl('Order', { nonNullable: true });
  totalPages$ = this.pokemonService.getPageCount();
  readonly isSortedDescending = signal(true);
  private readonly fullData$ = this.pages$.pipe(
    switchMap((pageNumber) => this.pokemonService.getPokemonPage(pageNumber)),
    catchError((error) => {
      this.alertService.createErrorAlert(error);
      return [];
    }),
  );
  readonly data$ = this.fullData$.pipe(
    // triggered on filter, sort option, sort order change
    combineLatestWith(
      this.nameFilter.valueChanges.pipe(startWith('')),
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
        (pokemon) => pokemon[sortValue.toLowerCase() as keyof Pokemon],
      );
      if (!isSortedAscending) {
        return sorted.reverse();
      }
      return sorted;
    }),
  );

  fetchPage() {
    this.pages$.next(this.pageInput.value);
  }
}
