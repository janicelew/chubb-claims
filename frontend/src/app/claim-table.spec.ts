import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClaimTable } from './claim-table';
import type { Claim, ClaimStatus } from './models';

/** The claim list used on every list page: one row per claim, each with its own Age. */
describe('Claim table', () => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000 - 60_000).toISOString(); // a minute past the mark

  const claim = (claimNumber: string, status: ClaimStatus, createdDaysAgo: number): Claim => ({
    id: claimNumber,
    claimNumber,
    claimantId: 'C-1001',
    policyNumber: 'POL-MY-M-0001',
    type: 'MOTOR',
    market: 'MY',
    incidentDate: '2026-11-01',
    description: 'test',
    claimedAmount: 6000,
    reserveAmount: null,
    approvedAmount: null,
    status,
    assignedOfficerId: null,
    decisionReason: null,
    createdAt: daysAgo(createdDaysAgo),
    updatedAt: daysAgo(0),
  });

  let fixture: ComponentFixture<ClaimTable>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ClaimTable);
  });

  async function show(claims: Claim[]) {
    fixture.componentRef.setInput('claims', claims);
    await fixture.whenStable();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const headers = () => Array.from(root().querySelectorAll('thead th')).map((th) => th.textContent?.trim());
  /** The Age cell of the row for one claim. */
  const ageOf = (claimNumber: string) => {
    const column = headers().indexOf('Age');
    const row = Array.from(root().querySelectorAll('tbody tr')).find((r) => r.textContent?.includes(claimNumber));
    return row?.querySelectorAll('td')[column]?.textContent?.trim();
  };

  it('shows an Age for each claim, worked out from that claim\'s own submit time', async () => {
    await show([
      claim('CLM-NEW', 'SUBMITTED', 0),
      claim('CLM-OLD', 'UNDER_REVIEW', 5),
      claim('CLM-WAIT', 'INFO_REQUESTED', 1),
    ]);

    expect(headers()).toContain('Age');
    expect(ageOf('CLM-NEW')).toBe('Today');
    expect(ageOf('CLM-WAIT')).toBe('1 day');
    expect(ageOf('CLM-OLD')).toBe('5 days');
  });

  it('shows a dash for claims that are finished', async () => {
    await show([claim('CLM-PAID', 'SETTLED', 7), claim('CLM-NO', 'REJECTED', 3)]);

    expect(ageOf('CLM-PAID')).toBe('—');
    expect(ageOf('CLM-NO')).toBe('—');
  });

  it('keeps the Age column in the same place with or without the Claimant column', async () => {
    fixture.componentRef.setInput('showClaimant', true);
    await show([claim('CLM-OLD', 'ASSIGNED', 4)]);

    expect(headers()).toEqual(expect.arrayContaining(['Claimant', 'Status', 'Age']));
    expect(ageOf('CLM-OLD')).toBe('4 days');
  });

  it('shows the empty message instead of a table when there are no claims', async () => {
    fixture.componentRef.setInput('emptyText', 'Nothing here.');
    await show([]);

    expect(root().querySelector('table')).toBeNull();
    expect(root().textContent).toContain('Nothing here.');
  });
});
