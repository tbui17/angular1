import { PokemonService } from '~features/pokemon/services/pokemon.service';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { PokemonCardComponent } from '../pokemon/components/pokemon-card/pokemon-card.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertService } from '../../core/services/alert.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, catchError, switchMap } from 'rxjs';
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
  private readonly allPokemon$;

  readonly pageNumber = new FormControl(1, { nonNullable: true });
  readonly pageNumberEnterPressed$;
  readonly filteredPokemon;

  constructor() {
    this.pageNumberEnterPressed$ = new BehaviorSubject<number>(1);
    this.allPokemon$ = this.pageNumberEnterPressed$.pipe(
      switchMap((pageNumber) => this.pokemonService.getPokemonPage(pageNumber)),
      catchError((error) => {
        this.alertService.createErrorAlert(error);
        return [];
      }),
      takeUntilDestroyed(),
    );
    this.filteredPokemon = this.allPokemon$;
  }

  onPageNumberEnter() {
    this.pageNumberEnterPressed$.next(this.pageNumber.value);
  }
}
