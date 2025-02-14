import { PokemonService } from '~features/pokemon/services/pokemon.service';
import { inject, Injectable, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, Validators } from '@angular/forms';
import {
  BehaviorSubject,
  catchError,
  combineLatestWith,
  filter,
  map,
  Observable,
  startWith,
  switchMap,
  throwError,
  withLatestFrom,
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
  readonly totalPages$;
  private readonly totalPages;
  readonly pageInput;
  private page$ = new BehaviorSubject(1);
  private page = toSignal(this.page$, { initialValue: 1 });
  readonly nameFilter = new FormControl('', { nonNullable: true });
  readonly sortOptions: Array<keyof Pokemon> = ['order', 'name', 'height', 'weight'];
  readonly selectedSortOption = new FormControl<keyof Pokemon>('order', { nonNullable: true });

  readonly isSortedDescending = signal(true);
  readonly data$: Observable<Pokemon[]>;
  readonly canGetPrevious$;

  readonly canGetNext$;

  constructor() {
    this.totalPages$ = this.pokemonService.getPageCount();
    this.totalPages = toSignal(this.totalPages$, { initialValue: 1 });
    this.pageInput = new FormControl<number>(1, {
      nonNullable: true,
      validators: [(x) => (isNaN(Number.parseInt(x.value)) ? { invalidNumber: x.value } : null)],
    });
    this.canGetPrevious$ = this.page$.pipe(map((x) => x > 1));
    this.canGetNext$ = this.page$.pipe(
      withLatestFrom(this.totalPages$),
      map(([currentPage, totalPages]) => currentPage < totalPages && currentPage >= 1),
    );

    this.data$ = this.page$.pipe(
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

    this.page$.subscribe((x) => this.pageInput.setValue(x));
  }

  fetchPage() {
    if (this.pageInput.invalid) {
      this.alertService.createErrorAlert(JSON.stringify(this.pageInput.errors, null, 2));
      return;
    }
    this.page$.next(this.pageInput.value);
  }

  next() {
    this.page$.next(Math.min(this.page() + 1, this.totalPages()));
  }

  previous() {
    this.page$.next(Math.max(this.page() - 1, 1));
  }
}
