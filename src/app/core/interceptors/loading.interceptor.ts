import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('analytics')) {
    return next(req);
  }
  const loadingService = inject(LoadingService);
  loadingService.receiveRequest();
  return next(req).pipe(
    finalize(() => {
      loadingService.receiveResponse();
    }),
  );
};
