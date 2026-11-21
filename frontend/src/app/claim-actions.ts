import { Claim, DemoUser } from './models';

export type ClaimAction =
  | 'pickUp'
  | 'assign'
  | 'startReview'
  | 'setReserve'
  | 'askQuestion'
  | 'approve'
  | 'reject'
  | 'settle';

export const ACTION_LABELS: Record<ClaimAction, string> = {
  pickUp: 'Pick up this claim',
  assign: 'Assign / reassign',
  startReview: 'Start review',
  setReserve: 'Set reserve',
  askQuestion: 'Ask the claimant a question',
  approve: 'Approve',
  reject: 'Reject',
  settle: 'Mark as settled',
};

/**
 * Which buttons to show for this claim and this user. It mirrors the backend rules
 * (ClaimStatus.allowedNext and ClaimService), so the screen only offers things that can work.
 * The server still checks everything: if this and the server ever disagree, the server wins and its message is shown.
 *
 *  - Claimants never get actions (they answer questions on the page itself).
 *  - An officer can pick up a claim nobody has, and can act only on claims assigned to them.
 *  - A manager can act on any claim and can assign or reassign any open claim.
 */
export function allowedActions(claim: Claim, user: DemoUser): ClaimAction[] {
  if (user.role === 'CLAIMANT') {
    return [];
  }
  const isManager = user.role === 'MANAGER';
  const isOpen = claim.status !== 'SETTLED' && claim.status !== 'REJECTED';

  if (claim.status === 'SUBMITTED') {
    return isManager ? ['assign'] : ['pickUp'];
  }

  const mayAct = isManager || claim.assignedOfficerId === user.id;
  const actions: ClaimAction[] = [];
  if (mayAct) {
    switch (claim.status) {
      case 'ASSIGNED':
        actions.push('startReview', 'setReserve');
        break;
      case 'UNDER_REVIEW':
        actions.push('setReserve', 'askQuestion', 'approve', 'reject');
        break;
      case 'INFO_REQUESTED':
        actions.push('setReserve'); // waiting for the claimant, but the estimate can still be updated
        break;
      case 'APPROVED':
        actions.push('settle');
        break;
    }
  }
  if (isManager && isOpen) {
    actions.push('assign');
  }
  return actions;
}
