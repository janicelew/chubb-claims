import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Exposure as ExposureData } from '../models';
import { Exposure } from './exposure';

/** A page test for the manager's Liability exposure screen, with made-up backend answers. */
describe('Liability exposure page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const data: ExposureData = {
    totalReserved: 24000,
    totalClaimedNotYetReserved: 6500,
    openClaims: 4,
    breakdown: [{ market: 'SG', type: 'MOTOR', openClaims: 1, reserved: 15000, claimedNotYetReserved: 0 }],
    byOfficer: [
      { officerId: 'O-02', name: 'Raj Kumar', openClaims: 1, reserved: 15000, claimedNotYetReserved: 0 },
      { officerId: null, name: 'Unassigned', openClaims: 1, reserved: 0, claimedNotYetReserved: 5000 },
    ],
  };

  async function open(): Promise<ComponentFixture<Exposure>> {
    const fixture = TestBed.createComponent(Exposure);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve)); // the page asks for its data on the next tick
    http.expectOne('/api/dashboard/exposure').flush(data);
    await fixture.whenStable();
    return fixture;
  }

  const text = (fixture: ComponentFixture<Exposure>) =>
    ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  it('explains the total in a sentence and keeps the unassessed amount separate', async () => {
    const t = text(await open());

    expect(t).toContain("Chubb's estimated liability on open claims is 24,000.00, across 4 open claims");
    expect(t).toContain('A further 6,500.00 has been claimed on claims that no officer has assessed yet');
  });

  it('shows who holds the liability, with a space before the officer ID and before the Unassigned note', async () => {
    const t = text(await open());

    expect(t).toContain('Raj Kumar (O-02)');
    expect(t).toContain('Unassigned (nobody has picked these up)'); // the link and its note must not run together
  });

  it('links each officer, and the market and type rows, to the claims behind the number', async () => {
    const root = (await open()).nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/open-claims?officerId=O-02"]')?.textContent?.trim()).toBe('Raj Kumar');
    expect(root.querySelector('a[href="/queue"]')?.textContent?.trim()).toBe('Unassigned');
    expect(Array.from(root.querySelectorAll('a')).some((a) => a.getAttribute('href')?.includes('market=SG'))).toBe(true);
  });
});
