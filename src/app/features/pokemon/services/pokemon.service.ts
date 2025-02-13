import { inject, Injectable, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { forkJoin, map, switchMap } from 'rxjs';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { CACHING_ENABLED } from '~core/interceptors/caching.interceptor';
import type { Pokemon } from '~features/pokemon/types/pokemon.type';
import { POKEMON_URLS } from '../../../core/constants/urls.constants';

const { POKEMON_API_HOST } = POKEMON_URLS;

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private readonly httpClient = inject(HttpClient);
  private readonly pageSize = signal(20);

  getPokemon(pokemonIdOrName: string | number): Observable<Pokemon> {
    let valueToLookFor = pokemonIdOrName;
    if (typeof pokemonIdOrName === 'string') {
      valueToLookFor = pokemonIdOrName.trim();
    }
    return this.httpClient.get<Pokemon>(`${POKEMON_API_HOST}/pokemon/${valueToLookFor}`, {
      params: new HttpParams().set('limit', '1'),
      context: new HttpContext().set(CACHING_ENABLED, true),
    });
  }

  getPokemons(ids: (number | string)[]): Observable<Pokemon[]> {
    const getPokemonRequests = ids.map((id) => this.getPokemon(id));
    return forkJoin(getPokemonRequests).pipe(
      map((pokemons: Pokemon[]) =>
        pokemons.sort((pokemonA, pokemonB) => Number(pokemonA.order) - Number(pokemonB.order)),
      ),
    );
  }

  getPokemonPage(page: number) {
    const url = `${POKEMON_API_HOST}/pokemon`;
    return this.httpClient
      .get<{ results: { name: string }[]; count: number }>(url, {
        params: new HttpParams().set('limit', this.pageSize()).set('offset', this.getOffset(page)),
        context: new HttpContext().set(CACHING_ENABLED, true),
      })
      .pipe(
        switchMap((response) => {
          const names = response.results.map((pokemon) => pokemon.name);
          return this.getPokemons(names);
        }),
      );
  }

  getPageCount() {
    const url = `${POKEMON_API_HOST}/pokemon`;
    return this.httpClient
      .get<{ results: { name: string }[]; count: number }>(url, {
        params: new HttpParams().set('limit', 1),
        context: new HttpContext().set(CACHING_ENABLED, false),
      })
      .pipe(map((response) => Math.ceil(response.count / this.pageSize())));
  }

  private getOffset(page: number) {
    return Math.max(0, page - 1) * this.pageSize();
  }
}
