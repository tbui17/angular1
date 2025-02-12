import { computed, Injectable, signal } from '@angular/core';
import { produce, enableMapSet } from 'immer';
@Injectable({
  providedIn: 'any',
})
export class SelectionService {
  private readonly _selected = signal(new Set<number>());
  private readonly lastSelected = signal<number | null>(null);
  readonly selected = computed(this.getSelectedValues.bind(this));

  private getSelectedValues(): number[] {
    return [...this._selected().values()];
  }

  select({
    index,
    event: { ctrlKey, shiftKey },
  }: {
    index: number;
    event: {
      shiftKey?: boolean;
      ctrlKey?: boolean;
    };
  }) {
    if (this.lastSelected() === null) {
      this.handleSingleSelect(index);
    }

    if (!ctrlKey && !shiftKey) {
      this.handleSingleSelect(index);
      return;
    }

    if (ctrlKey) {
      this.handleCtrlSelect(index);
      return;
    }

    this.handleShiftSelect(index);
  }

  private handleSingleSelect(index: number) {
    this.lastSelected.set(index);
    this._selected.set(new Set([index]));
  }

  private handleCtrlSelect(index: number) {
    this.lastSelected.set(index);
    this._selected.update((items) => produce(items, (draft) => draft.add(index)));
  }

  private handleShiftSelect(index: number) {
    const lastSelectedValue = this.lastSelected()!;
    const [start, end] = this.getSelectionRange(lastSelectedValue, index);

    this._selected.update((items) =>
      produce(items, (draft) => {
        draft.clear();
        for (let index2 = start; index2 <= end; index2++) {
          draft.add(index2);
        }
      }),
    );
  }

  private getSelectionRange(start: number, end: number): [number, number] {
    return [start, end].sort((itemA, itemB) => itemA - itemB) as [number, number];
  }

  isSelected(index: number) {
    return this._selected().has(index);
  }

  clear() {
    this._selected.set(new Set());
    this.lastSelected.set(null);
  }
}
