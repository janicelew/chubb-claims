import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it("shows the backend's own explanation when there is one", () => {
    const err = new HttpErrorResponse({ status: 422, error: { status: 422, detail: 'Approved amount exceeds the cover limit' } });
    expect(errorMessage(err)).toBe('Approved amount exceeds the cover limit');
  });

  it('says so when the backend cannot be reached', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach the server');
    expect(errorMessage(new HttpErrorResponse({ status: 504 }))).toContain('Cannot reach the server');
  });

  it('falls back to the status code', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: 'oops' }))).toBe('Request failed (500).');
  });

  it('copes with errors that are not HTTP errors', () => {
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong.');
  });
});
