import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns a failed call into a sentence for the user.
 * The backend answers errors with problem-details JSON ({ status, title, detail }); "detail" is meant for people.
 */
export function errorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return 'Something went wrong.';
  }
  const detail = (err.error as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }
  // 0 = no response at all; 502/503/504 = the dev proxy could not reach the backend
  if ([0, 502, 503, 504].includes(err.status)) {
    return 'Cannot reach the server. Is the backend running on port 8080?';
  }
  return `Request failed (${err.status}).`;
}
