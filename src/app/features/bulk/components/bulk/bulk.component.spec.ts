import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkComponent } from './bulk.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PokemonService } from '../../../pokemon/services/pokemon.service';
import { map, Observable, of, throwError } from 'rxjs';
import { Pokemon } from '../../../pokemon/types/pokemon.type';
import { By } from '@angular/platform-browser';
import { UserService } from '../../../authentication/services/user.service';
import { AlertService } from '../../../../core/services/alert.service';

describe('BulkComponent', () => {
  let component: BulkComponent;
  let fixture: ComponentFixture<BulkComponent>;

  let spy: jasmine.Spy<() => Observable<number>>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;

  beforeEach(async () => {
    const stub = {
      getPokemonPage(x) {
        const val = x === 1 ? mockPokemonData.slice(0, 2) : mockPokemonData.slice(2, 5);
        return of(val);
      },
      getPageCount() {
        return of(50);
      },
    } satisfies Partial<PokemonService>;

    spy = spyOn(stub, 'getPageCount');

    await TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PokemonService, useValue: stub },
        { provide: UserService, useValue: jasmine.createSpyObj('UserService', ['catchPokemons']) },
        {
          provide: AlertService,
          useValue: jasmine.createSpyObj('AlertService', [
            'createSuccessAlert',
            'createErrorAlert',
          ]),
        },
      ],
      imports: [BulkComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkComponent);
    userServiceSpy = TestBed.inject(UserService) as any;
    alertServiceSpy = TestBed.inject(AlertService) as any;

    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call on startup', () => {
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should render results', () => {
    const res = fixture.debugElement.queryAll(By.css('app-pokemon-card'));
    expect(res.length).toBe(2);
  });

  it('should select', () => {
    component.onPokemonClicked({
      event: new MouseEvent('click'),
      index: 0,
    });
    expect(component.selectedPokemon().length).toBe(1);
    expect(component.selectedPokemon()).toEqual([mockPokemonData[0]]);
  });

  it('should fetch different data on change', () => {
    expect(component.pokemonCollection().length).toBe(2);
    component.pageNumber.setValue(2);
    expect(component.pokemonCollection().length).toBe(2);
    component.onPageNumberEnter();
    expect(component.pokemonCollection().length).toBe(3);
  });

  it('should catch', () => {
    userServiceSpy.catchPokemons.and.returnValue(of(mockPokemonData));
    component.onPokemonClicked({
      index: 0,
      event: new MouseEvent('click'),
    });
    component.catchPokemon();
    expect(alertServiceSpy.createSuccessAlert).toHaveBeenCalledTimes(1);
  });

  it('should alert error', () => {
    userServiceSpy.catchPokemons.and.returnValue(of([new Error('test')]));
    component.onPokemonClicked({
      index: 0,
      event: new MouseEvent('click'),
    });
    component.catchPokemon();
    expect(alertServiceSpy.createSuccessAlert).toHaveBeenCalledTimes(0);
    expect(alertServiceSpy.createErrorAlert).toHaveBeenCalledTimes(1);
  });

  it('should alert successes and errors', () => {
    userServiceSpy.catchPokemons.and.returnValue(of([new Error('test12345'), ...mockPokemonData]));
    component.onPokemonClicked({
      index: 0,
      event: new MouseEvent('click'),
    });
    component.catchPokemon();
    expect(alertServiceSpy.createSuccessAlert).toHaveBeenCalledTimes(1);
    expect(alertServiceSpy.createErrorAlert).toHaveBeenCalledTimes(1);
    const res = alertServiceSpy.createSuccessAlert.calls
      .all()
      .map((x) => x.args[0])
      .filter((x) => !x.includes('test12345'))[0]
      .toLowerCase();
    mockPokemonData.map((x) => x.name.toLowerCase()).forEach((x) => expect(res).toContain(x));
  });
});

const mockPokemonData: Pokemon[] = [
  {
    id: 1,
    order: '1',
    name: 'bulbasaur',
    height: '7',
    weight: '69',
    sprites: {
      front_default:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      front_shiny:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png',
    },
  },
  {
    id: 2,
    order: '2',
    name: 'ivysaur',
    height: '10',
    weight: '130',
    sprites: {
      front_default:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
      front_shiny:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/2.png',
    },
  },
  {
    id: 3,
    order: '3',
    name: 'venusaur',
    height: '20',
    weight: '1000',
    sprites: {
      front_default:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
      front_shiny:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/3.png',
    },
  },
  {
    id: 4,
    order: '4',
    name: 'charmander',
    height: '6',
    weight: '85',
    sprites: {
      front_default:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
      front_shiny:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/4.png',
    },
  },
  {
    id: 5,
    order: '5',
    name: 'charmeleon',
    height: '11',
    weight: '190',
    sprites: {
      front_default:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
      front_shiny:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/5.png',
    },
  },
];
