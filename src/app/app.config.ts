import type { ApplicationConfig } from '@angular/core';
import { inject, provideExperimentalZonelessChangeDetection } from '@angular/core';
import {
  createUrlTreeFromSnapshot,
  PreloadAllModules,
  provideRouter,
  Router,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { cachingInterceptor } from '~core/interceptors/caching.interceptor';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authenticationInterceptor } from '~core/interceptors/authentication.interceptor';
import { provideCloudinaryLoader } from '@angular/common';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { FullscreenOverlayContainer, OverlayContainer } from '@angular/cdk/overlay';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling(),
      withViewTransitions({
        onViewTransitionCreated: ({ transition, to }) => {
          const router = inject(Router);
          const toTree = createUrlTreeFromSnapshot(to, []);
          // Skip the transition if the only thing changing is the fragment and queryParams
          if (
            router.isActive(toTree, {
              paths: 'exact',
              matrixParams: 'exact',
              fragment: 'ignored',
              queryParams: 'ignored',
            })
          ) {
            transition.skipTransition();
          }
        },
      }),
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always', onSameUrlNavigation: 'reload' }),
      withPreloading(PreloadAllModules),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authenticationInterceptor, cachingInterceptor, loadingInterceptor]),
    ),
    provideAnimationsAsync(),
    provideCloudinaryLoader('https://res.cloudinary.com/ismaestro/'),
    { provide: OverlayContainer, useClass: FullscreenOverlayContainer },
  ],
};
