import { ageLabel, displayName } from './identity';

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
