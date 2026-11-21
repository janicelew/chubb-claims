import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, merge, skip, switchMap, timer } from 'rxjs';
import { errorMessage } from './errors';
import { Identity } from './identity';

export interface Polled<T> {
  data: Signal<T | null>;
  error: Signal<string | null>;
  loading: Signal<boolean>;
  /** Fetch again now (call this after an action changed something). */
  reload: () => void;
}

/**
 * Loads something from the API and keeps it fresh. This is how the screens deal with the asynchronous side
 * of the platform: claim status changes and notifications are produced by officers and by Kafka, so the page
 * asks again every 30 seconds, after any action, and whenever the demo user changes.
 * Pass 0 to load only once. Call it while a component is being created, so it stops when the component goes away.
 */
export function pollResource<T>(fetch: () => Observable<T>, everyMs = 30_000): Polled<T> {
  const identity = inject(Identity);
  const data = signal<T | null>(null);
  const error = signal<string | null>(null);
  const loading = signal(true);
  const reload$ = new Subject<void>();

  const startAndRepeat$ = everyMs > 0 ? timer(0, everyMs) : timer(0);
  const userChanged$ = toObservable(identity.user).pipe(skip(1)); // skip(1): ignore the value it has right now

  merge(startAndRepeat$, reload$, userChanged$)
    .pipe(
      // switchMap drops a request that is still running when a newer one starts
      switchMap(() =>
        fetch().pipe(
          catchError((err) => {
            error.set(errorMessage(err));
            loading.set(false);
            return EMPTY; // keep the data we already have, and keep polling
          }),
        ),
      ),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe((value) => {
      data.set(value);
      error.set(null);
      loading.set(false);
    });

  return { data, error, loading, reload: () => reload$.next() };
}
