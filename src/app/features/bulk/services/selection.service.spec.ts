import { TestBed } from '@angular/core/testing';

import { SelectionService } from './selection.service';
import { Injector, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { enableMapSet } from 'immer';

enableMapSet();

describe('SelectionService', () => {
  let service: SelectionService;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
    });
    service = TestBed.inject(SelectionService);
    injector = TestBed.inject(Injector);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should select', () => {
    service.select({
      index: 0,
      event: {},
    });
    expect(service.selected()).toEqual([0]);
  });

  it('should select range', () => {
    service.select({
      index: 2,
      event: {},
    });

    service.select({
      index: 4,
      event: { shiftKey: true },
    });

    expect(service.selected()).toEqual([2, 3, 4]);
  });

  it('should clear', () => {
    service.select({
      index: 2,
      event: {},
    });

    service.select({
      index: 4,
      event: { shiftKey: true },
    });

    expect(service.selected()).toEqual([2, 3, 4]);

    service.clear();

    expect(service.selected()).toEqual([]);
  });

  it('should trigger rerender on select', (done) => {
    toObservable(service.selected, { injector }).subscribe(([x]) => {
      expect(x === 10).toBeTrue();
      done();
    });
    service.select({
      index: 10,
      event: {},
    });
  });
});
