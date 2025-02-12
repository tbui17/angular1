import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';

import { loadingInterceptor } from './loading.interceptor';
import { Injector, provideExperimentalZonelessChangeDetection } from '@angular/core';
import {
  finalize,
  interval,
  map,
  take,
  zipWith,
} from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { toObservable } from '@angular/core/rxjs-interop';


describe('loadingInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => loadingInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('loading should change', (done) => {
    const injector = TestBed.inject(Injector);
    const loadingService = TestBed.inject(LoadingService);
    const isLoading$ = toObservable(loadingService.isLoading, { injector });
    interceptor(new HttpRequest('POST', 'a', { a: 3 }), (x) =>
      interval(100).pipe(
        take(2),
        map((x) => new HttpResponse({ body: { value: x } })),
      ),
    ).subscribe();
    isLoading$
      .pipe(
        zipWith([
          true,
          false,
        ]),
        finalize(() => done())
      )
      .subscribe(x => expect(x[0]).toBe(x[1]));
  });
});
