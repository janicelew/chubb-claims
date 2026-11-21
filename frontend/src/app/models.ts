// The JSON shapes of the backend API. They mirror backend/.../claim/api/Dtos.java and the dashboard records.
// Dates arrive as ISO strings and amounts as plain numbers.

export type Role = 'CLAIMANT' | 'OFFICER' | 'MANAGER';

export type ClaimStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'UNDER_REVIEW'
  | 'INFO_REQUESTED'
  | 'APPROVED'
  | 'SETTLED'
  | 'REJECTED';

export type ClaimType = 'MOTOR' | 'PROPERTY';
export type Market = 'MY' | 'SG' | 'HK' | 'AU' | 'TH' | 'ID';

export type ClaimEventType =
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_ASSIGNED'
  | 'REVIEW_STARTED'
  | 'RESERVE_CHANGED'
  | 'INFO_REQUESTED'
  | 'INFO_PROVIDED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'CLAIM_SETTLED';

export interface Claim {
  id: string;
  claimNumber: string;
  claimantId: string;
  policyNumber: string;
  type: ClaimType;
  market: Market;
  incidentDate: string; // YYYY-MM-DD
  description: string;
  claimedAmount: number;
  reserveAmount: number | null;
  approvedAmount: number | null;
  status: ClaimStatus;
  assignedOfficerId: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  eventType: ClaimEventType;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  actorId: string;
  note: string | null;
  occurredAt: string;
}

export interface InfoRequest {
  id: string;
  question: string;
  response: string | null;
  requestedAt: string;
  respondedAt: string | null;
}

export interface Policy {
  policyNumber: string;
  type: ClaimType;
  market: Market;
  coverLimit: number;
  startDate: string;
  endDate: string;
}

export interface ClaimNotification {
  id: string;
  claimId: string;
  claimNumber: string;
  message: string;
  createdAt: string;
}

export interface OfficerWorkload {
  officerId: string;
  name: string;
  openClaims: number;
  byStatus: Record<string, number>;
  totalReserve: number;
  /** What claimants asked for on this officer's claims that have no reserve yet. */
  claimedNotYetReserved: number;
  oldestOpenClaimDays: number;
}

export interface Workload {
  unassignedClaims: number;
  oldestUnassignedDays: number;
  officers: OfficerWorkload[];
}

export interface ExposureLine {
  market: Market;
  type: ClaimType;
  openClaims: number;
  reserved: number;
  claimedNotYetReserved: number;
}

/** Who holds the exposure. officerId is null for claims nobody has picked up yet. */
export interface OfficerExposure {
  officerId: string | null;
  name: string;
  openClaims: number;
  reserved: number;
  claimedNotYetReserved: number;
}

export interface Exposure {
  totalReserved: number;
  totalClaimedNotYetReserved: number;
  openClaims: number;
  breakdown: ExposureLine[];
  byOfficer: OfficerExposure[];
}

/** Optional narrowing of the open-claims list. */
export interface OpenClaimsFilter {
  officerId?: string;
  market?: Market;
  type?: ClaimType;
}

export interface SubmitClaimRequest {
  policyNumber: string;
  incidentDate: string;
  description: string;
  claimedAmount: number;
}

/** One of the demo users. There is no login: the app just sends this user's id and role with every request. */
export interface DemoUser {
  id: string;
  role: Role;
  label: string;
  /** Staff have names (they come from the backend seed data); customers are shown by their ID. */
  name?: string;
}
