import { ageLabel, claimAge, displayName } from './identity';

describe('displayName', () => {
  it('shows a name and the ID for staff', () => {
    expect(displayName('O-02')).toBe('Raj Kumar (O-02)');
    expect(displayName('M-01')).toBe('Sarah Lim (M-01)');
  });

  it('shows just the ID for customers and unknown people', () => {
    expect(displayName('C-1001')).toBe('C-1001');
    expect(displayName('X-99')).toBe('X-99');
  });

  it('shows a dash when there is nobody', () => {
    expect(displayName(null)).toBe('—');
  });
});

describe('ageLabel', () => {
  it('says Today for a claim opened today, instead of a confusing 0', () => {
    expect(ageLabel(0)).toBe('Today');
  });

  it('uses singular and plural', () => {
    expect(ageLabel(1)).toBe('1 day');
    expect(ageLabel(5)).toBe('5 days');
  });
});

describe('claimAge (the Age column on each claim)', () => {
  const now = Date.parse('2026-11-22T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  it('counts whole 24-hour periods since the claim was submitted', () => {
    expect(claimAge(hoursAgo(2), 'SUBMITTED', now)).toBe('Today');
    expect(claimAge(hoursAgo(23), 'SUBMITTED', now)).toBe('Today');
    expect(claimAge(hoursAgo(24), 'ASSIGNED', now)).toBe('1 day');
    expect(claimAge(hoursAgo(24 * 3 + 5), 'UNDER_REVIEW', now)).toBe('3 days');
  });

  it('still counts a claim that is waiting for the claimant or approved but not yet paid', () => {
    expect(claimAge(hoursAgo(24 * 9), 'INFO_REQUESTED', now)).toBe('9 days');
    expect(claimAge(hoursAgo(24 * 2), 'APPROVED', now)).toBe('2 days');
  });

  it('shows a dash once the claim is finished', () => {
    expect(claimAge(hoursAgo(24 * 9), 'SETTLED', now)).toBe('—');
    expect(claimAge(hoursAgo(24 * 9), 'REJECTED', now)).toBe('—');
  });

  it('never shows a negative age if the browser clock is a little behind the server', () => {
    expect(claimAge(hoursAgo(-1), 'SUBMITTED', now)).toBe('Today');
  });
});
