import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Identity } from './identity';
import { identityInterceptor } from './identity-interceptor';

describe('identityInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear(); // the chosen demo user is remembered there
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([identityInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('sends the default demo user (a claimant) with every API call', () => {
    http.get('/api/claimant/claims').subscribe();
    const req = controller.expectOne('/api/claimant/claims');
    expect(req.request.headers.get('X-User-Id')).toBe('C-1001');
    expect(req.request.headers.get('X-User-Role')).toBe('CLAIMANT');
    req.flush([]);
  });

  it('uses whoever is selected right now', () => {
    TestBed.inject(Identity).select('O-02');
    http.get('/api/staff/queue').subscribe();
    const req = controller.expectOne('/api/staff/queue');
    expect(req.request.headers.get('X-User-Id')).toBe('O-02');
    expect(req.request.headers.get('X-User-Role')).toBe('OFFICER');
    req.flush([]);
  });

  it('does not add identity headers to other websites', () => {
    http.get('https://example.com/data').subscribe();
    const req = controller.expectOne('https://example.com/data');
    expect(req.request.headers.has('X-User-Id')).toBe(false);
    req.flush({});
  });
});
