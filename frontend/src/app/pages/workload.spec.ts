import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { OfficerWorkload, Workload as WorkloadData } from '../models';
import { Workload } from './workload';

/**
 * A page test for the manager's Team workload screen. The backend is replaced by made-up answers, so this runs
 * on its own and gives the same result on any day. It is the screen-level check for the "Today" wording: the
 * unit test in people.spec.ts covers the rule, and this proves the screen really uses it.
 */
describe('Team workload page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify()); // fails the test if the page made a request nobody answered

  const aged = (officerId: string, name: string, days: number, openClaims = 1): OfficerWorkload => ({
    officerId,
    name,
    openClaims,
    byStatus: openClaims > 0 ? { UNDER_REVIEW: openClaims } : {},
    totalReserve: 0,
    claimedNotYetReserved: 0,
    oldestOpenClaimDays: days,
  });

  /** Opens the page and answers its one request with the given workload. */
  async function open(workload: WorkloadData): Promise<ComponentFixture<Workload>> {
    const fixture = TestBed.createComponent(Workload);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve)); // the page asks for its data on the next tick
    http.expectOne('/api/dashboard/workload').flush(workload);
    await fixture.whenStable();
    return fixture;
  }

  const root = (fixture: ComponentFixture<Workload>) => fixture.nativeElement as HTMLElement;
  const text = (fixture: ComponentFixture<Workload>) => (root(fixture).textContent ?? '').replace(/\s+/g, ' ');
  const rowOf = (fixture: ComponentFixture<Workload>, officerId: string) =>
    Array.from(root(fixture).querySelectorAll('tbody tr')).find((r) => r.textContent?.includes(`(${officerId})`));
  const cells = (row: Element | undefined) =>
    Array.from(row?.querySelectorAll('td') ?? []).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim());

  it('says "Today" instead of 0 when an officer\'s oldest open claim was opened today', async () => {
    const fixture = await open({
      unassignedClaims: 0,
      oldestUnassignedDays: 0,
      officers: [aged('O-01', 'Mei Ling Tan', 0), aged('O-02', 'Raj Kumar', 1), aged('O-03', 'Tom Wong', 3)],
    });

    const oldest = (id: string) => cells(rowOf(fixture, id)).at(-1);
    expect(oldest('O-01')).toBe('Today');
    expect(oldest('O-02')).toBe('1 day');
    expect(oldest('O-03')).toBe('3 days');
    expect(text(fixture)).not.toMatch(/\b0 days?\b/);
  });

  it('shows a dash, not an age, for an officer with no open claims', async () => {
    const fixture = await open({
      unassignedClaims: 0,
      oldestUnassignedDays: 0,
      officers: [aged('O-02', 'Raj Kumar', 0, 0)],
    });

    expect(cells(rowOf(fixture, 'O-02')).at(-1)).toBe('—');
  });

  it('shows what was claimed but not yet assessed next to a reserve of 0.00', async () => {
    // The case that looked like "no risk" in the first version: 71,000 claimed, nothing reserved yet.
    const fixture = await open({
      unassignedClaims: 0,
      oldestUnassignedDays: 0,
      officers: [{ ...aged('O-03', 'Tom Wong', 2), totalReserve: 0, claimedNotYetReserved: 71000 }],
    });

    expect(text(fixture)).toContain('Claimed, not yet assessed');
    const row = cells(rowOf(fixture, 'O-03'));
    expect(row).toContain('0.00'); // reserved
    expect(row).toContain('71,000.00'); // claimed, not yet assessed
  });

  it('shows the unassigned backlog with a link to the queue, and how long it has waited', async () => {
    const fixture = await open({ unassignedClaims: 2, oldestUnassignedDays: 0, officers: [] });

    expect(text(fixture)).toContain('2 unassigned claims');
    expect(text(fixture)).toContain('Today'); // the oldest unassigned claim has waited
    expect(root(fixture).querySelector('a[href="/queue"]')).not.toBeNull();
  });

  it('shows a dash for the oldest unassigned claim when nothing is unassigned', async () => {
    const fixture = await open({ unassignedClaims: 0, oldestUnassignedDays: 0, officers: [] });

    expect(text(fixture)).toContain('0 unassigned claims');
    expect(text(fixture)).not.toContain('Today');
    expect(root(fixture).querySelector('a[href="/queue"]')).toBeNull();
  });

  it('links each officer to the list of their open claims', async () => {
    const fixture = await open({ unassignedClaims: 0, oldestUnassignedDays: 0, officers: [aged('O-02', 'Raj Kumar', 1)] });

    const link = rowOf(fixture, 'O-02')?.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Raj Kumar');
    expect(link?.getAttribute('href')).toBe('/open-claims?officerId=O-02');
  });

  it('shows a readable message, not a blank page, when the backend cannot be reached', async () => {
    const fixture = TestBed.createComponent(Workload);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne('/api/dashboard/workload').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(root(fixture).querySelector('p.error')?.textContent).toContain('Cannot reach the server');
    expect(root(fixture).querySelector('table')).toBeNull();
  });
});
