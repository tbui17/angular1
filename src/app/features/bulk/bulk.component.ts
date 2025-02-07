import { PokemonService } from '~features/pokemon/services/pokemon.service';
import type { OnInit, WritableSignal } from '@angular/core';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import type { Pokemon } from '../pokemon/types/pokemon.type';
import { PokemonCardComponent } from '../pokemon/components/pokemon-card/pokemon-card.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertService } from '../../core/services/alert.service';
import { translations } from '../../../locale/translations';

@Component({
  selector: 'app-bulk',
  imports: [PokemonCardComponent],
  templateUrl: './bulk.component.html',
  styleUrl: './bulk.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BulkComponent implements OnInit {
  private readonly pokemonService: PokemonService = inject(PokemonService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly alertService = inject(AlertService);
  readonly allPokemon: WritableSignal<Pokemon[]> = signal([]);
  readonly filteredPokemonImpl = () => this.allPokemon();
  readonly filteredPokemon = computed(this.filteredPokemonImpl);

  ngOnInit(): void {
    this.pokemonService
      .getPokemonPage(2)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pokemon) => {
          this.allPokemon.set(pokemon);
        },
        error: () => {
          this.alertService.createErrorAlert(translations.genericErrorAlert);
        },
      });
  }
}
