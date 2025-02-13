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

import { UserService } from '../../../authentication/services/user.service';
import type { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { SelectionService } from '../../services/selection.service';
import { PokemonPageService } from '../../../pokemon/services/pokemon-page.service';

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
  private readonly alertService = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly selectionService = inject(SelectionService);
  private readonly pokemonService = inject(PokemonPageService);

  readonly selectedPokemon = computed(() => {
    const collection = this.pokemonCollection();
    return this.selectionService.selected().map((index) => collection[index]);
  });

  readonly pageNumber = this.pokemonService.pageInput;

  readonly pokemonCollection = toSignal(this.pokemonService.data$, { initialValue: [] });
  readonly nameFilter = this.pokemonService.nameFilter;

  readonly catchClicked$ = new Subject();
  readonly sortOptions = this.pokemonService.sortOptions;
  readonly selectedSortOption = this.pokemonService.selectedSortOption;
  readonly isSortedDescending = this.pokemonService.isSortedDescending;

  readonly totalPages$ = this.pokemonService.totalPages$;
  private readonly pokemonCollectionElement = viewChild.required<ElementRef<HTMLDivElement>>(
    'pokemonCollectionElement',
  );
  private readonly catchElement = viewChild.required<ElementRef<HTMLButtonElement>>('catch');

  // eslint-disable-next-line max-lines-per-function
  constructor() {
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

    this.pokemonService.data$.subscribe(() => {
      this.selectionService.clear();
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
    this.pokemonService.fetchPage();
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
  event: MouseEvent | KeyboardEvent;
};
