import { computed, inject, Injectable, signal } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { LoadingComponent } from '../components/loading/loading.component';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private requests = signal(0);
  private overlay = inject(Overlay);
  private overlayRef = this.overlay.create({
    positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
    hasBackdrop: true,
  });

  isLoading = computed(() => this.requests() > 0);
  private isLoading$ = toObservable(this.isLoading);

  constructor() {
    this.isLoading$.pipe(filter((x) => x)).subscribe(() => this.showLoader());
    this.isLoading$.pipe(filter((x) => !x)).subscribe(() => this.hideLoader());
  }

  receiveRequest() {
    this.requests.update((x) => x + 1);
  }

  receiveResponse() {
    this.requests.update((x) => Math.max(x - 1, 0));
  }

  private showLoader() {
    this.overlayRef.attach(new ComponentPortal(LoadingComponent));
  }

  private hideLoader() {
    this.overlayRef.detach();
  }
}
