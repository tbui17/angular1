import type { Draft } from 'immer';
import { produce } from 'immer';

export function produceEach<T>(items: T[], function_: (draft: Draft<T>, index:number) => void) {
  return produce(items, (array) => {
    for (const [index, element] of array.entries()) {
      function_(element, index);
    }
  });
}