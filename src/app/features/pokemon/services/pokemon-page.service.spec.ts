import { TestBed } from '@angular/core/testing';

import { PokemonPageService } from './pokemon-page.service';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

describe('PokemonPageService', () => {
  let service: PokemonPageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection(), provideHttpClient()],
    });
    service = TestBed.inject(PokemonPageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
