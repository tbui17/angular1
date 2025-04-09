import type { ElementRef, OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  viewChild,
} from '@angular/core';
import { PokemonCardComponent } from '../../../pokemon/components/pokemon-card/pokemon-card.component';
import { AlertService } from '../../../../core/services/alert.service';
import { ReactiveFormsModule } from '@angular/forms';

import { filter, fromEvent, map, Subject, switchMap, tap, withLatestFrom } from 'rxjs';

import { UserService } from '../../../authentication/services/user.service';
import { AsyncPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { SelectionService } from '../../services/selection.service';
import { PokemonPageService } from '../../../pokemon/services/pokemon-page.service';
import { partition } from 'remeda';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-bulk',
  imports: [
    PokemonCardComponent,
    ReactiveFormsModule,
    AsyncPipe,
    FontAwesomeModule,
    PaginationComponent,
  ],
  templateUrl: './bulk.component.html',
  styleUrl: './bulk.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [SelectionService],
})
export class BulkComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly selectionService = inject(SelectionService);
  private readonly pokemonService = inject(PokemonPageService);

  readonly selectedPokemon = computed(() => {
    const collection = this.pokemonCollection();
    return this.selectionService.selected().map((index) => collection[index]);
  });
  private readonly catchClicked$ = new Subject();

  private readonly pokemonCollectionElement = viewChild.required<ElementRef<HTMLDivElement>>(
    'pokemonCollectionElement',
  );
  private readonly catchElement = viewChild.required<ElementRef<HTMLButtonElement>>('catch');

  readonly pokemonCollection = toSignal(this.pokemonService.data$, { initialValue: [] });
  readonly pageNumber = this.pokemonService.pageInput;
  readonly nameFilter = this.pokemonService.nameFilter;
  readonly sortOptions = this.pokemonService.sortOptions;
  readonly selectedSortOption = this.pokemonService.selectedSortOption;
  readonly isSortedDescending = this.pokemonService.isSortedDescending;
  readonly totalPages$ = this.pokemonService.totalPages$;
  readonly previousDisabled$ = this.pokemonService.canGetPrevious$.pipe(map((x) => !x));
  readonly nextDisabled$ = this.pokemonService.canGetNext$.pipe(map((x) => !x));

  readonly sortDirectionArrow = computed(() =>
    this.isSortedDescending() ? faArrowUp : faArrowDown,
  );

  ngOnInit(): void {
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
        switchMap(this.userService.catchPokemons.bind(this.userService)),
      )
      .subscribe((responses) => {
        const [errors, successes] = partition(responses, (x): x is Error => x instanceof Error);
        if (errors.length) {
          const msg = errors.map((x) => x.message).join(',');
          this.alertService.createErrorAlert(msg);
        }
        if (successes.length) {
          const msg = successes.map((x) => x.name).join(',');
          this.alertService.createSuccessAlert(`Caught: ${msg}`);
        }
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

  next() {
    this.pokemonService.next();
  }

  previous() {
    this.pokemonService.previous();
  }

  onCardBlur() {
    this.pokemonService.resetInput();
  }
}

type PokemonCardClickEvent = {
  index: number;
  event: MouseEvent | KeyboardEvent;
};
