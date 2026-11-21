import { allowedActions } from './claim-actions';
import { Claim, ClaimStatus, DemoUser } from './models';

const claimant: DemoUser = { id: 'C-1001', role: 'CLAIMANT', label: '' };
const officer1: DemoUser = { id: 'O-01', role: 'OFFICER', label: '' };
const officer2: DemoUser = { id: 'O-02', role: 'OFFICER', label: '' };
const manager: DemoUser = { id: 'M-01', role: 'MANAGER', label: '' };

function claim(status: ClaimStatus, assignedOfficerId: string | null = 'O-01'): Claim {
  return {
    id: 'id-1',
    claimNumber: 'CLM-MY-TEST',
    claimantId: 'C-1001',
    policyNumber: 'POL-MY-M-0001',
    type: 'MOTOR',
    market: 'MY',
    incidentDate: '2026-11-01',
    description: 'test',
    claimedAmount: 1000,
    reserveAmount: null,
    approvedAmount: null,
    status,
    assignedOfficerId,
    decisionReason: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };
}

describe('allowedActions', () => {
  it('gives claimants no actions', () => {
    expect(allowedActions(claim('UNDER_REVIEW'), claimant)).toEqual([]);
  });

  it('lets an officer pick up a new claim, and a manager assign it', () => {
    expect(allowedActions(claim('SUBMITTED', null), officer1)).toEqual(['pickUp']);
    expect(allowedActions(claim('SUBMITTED', null), manager)).toEqual(['assign']);
  });

  it('lets only the assigned officer act on a claim', () => {
    expect(allowedActions(claim('ASSIGNED'), officer1)).toEqual(['startReview', 'setReserve']);
    expect(allowedActions(claim('ASSIGNED'), officer2)).toEqual([]);
  });

  it('follows the lifecycle for the assigned officer', () => {
    expect(allowedActions(claim('UNDER_REVIEW'), officer1)).toEqual(['setReserve', 'askQuestion', 'approve', 'reject']);
    expect(allowedActions(claim('INFO_REQUESTED'), officer1)).toEqual(['setReserve']);
    expect(allowedActions(claim('APPROVED'), officer1)).toEqual(['settle']);
  });

  it('offers nothing on a closed claim', () => {
    for (const status of ['SETTLED', 'REJECTED'] as const) {
      expect(allowedActions(claim(status), officer1)).toEqual([]);
      expect(allowedActions(claim(status), manager)).toEqual([]);
    }
  });

  it('lets a manager act on any claim and reassign it while it is open', () => {
    expect(allowedActions(claim('UNDER_REVIEW', 'O-02'), manager)).toEqual([
      'setReserve',
      'askQuestion',
      'approve',
      'reject',
      'assign',
    ]);
    expect(allowedActions(claim('APPROVED', 'O-02'), manager)).toEqual(['settle', 'assign']);
  });
});
