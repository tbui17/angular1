import { HttpParams } from '@angular/common/http';
import type { Draft } from 'immer';
import { produce } from 'immer';
import { catchError, of } from 'rxjs';

export function produceEach<T>(items: T[], function_: (draft: Draft<T>, index: number) => void) {
  return produce(items, (array) => {
    for (const [index, element] of array.entries()) {
      function_(element, index);
    }
  });
}

export function getHttpParamsAsObject(params: HttpParams) {
  const entries: Record<string, string> = {};
  params.keys().forEach((k) => {
    entries[k] = params.get(k) ?? '';
  });
  return entries;
}