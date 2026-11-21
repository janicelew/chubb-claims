import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Claim,
  ClaimNotification,
  Exposure,
  HistoryEntry,
  InfoRequest,
  Policy,
  SubmitClaimRequest,
  Workload,
} from './models';

/**
 * Every call to the backend lives here, one method per endpoint.
 * URLs are relative ("/api/..."): the dev server forwards them to the backend (see proxy.conf.json).
 * Who is calling is not decided here: the identity interceptor adds the headers.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  // ---- claimant ----
  policies() {
    return this.http.get<Policy[]>('/api/claimant/policies');
  }
  myClaims() {
    return this.http.get<Claim[]>('/api/claimant/claims');
  }
  submitClaim(body: SubmitClaimRequest) {
    return this.http.post<Claim>('/api/claimant/claims', body);
  }
  answerInfoRequest(claimId: string, requestId: string, response: string) {
    return this.http.post<Claim>(`/api/claimant/claims/${claimId}/info-requests/${requestId}/response`, {
      response,
    });
  }
  notifications() {
    return this.http.get<ClaimNotification[]>('/api/claimant/notifications');
  }

  // ---- shared reads (a claimant only ever gets their own claims) ----
  claim(id: string) {
    return this.http.get<Claim>(`/api/claims/${id}`);
  }
  history(id: string) {
    return this.http.get<HistoryEntry[]>(`/api/claims/${id}/history`);
  }
  infoRequests(id: string) {
    return this.http.get<InfoRequest[]>(`/api/claims/${id}/info-requests`);
  }

  // ---- staff ----
  queue() {
    return this.http.get<Claim[]>('/api/staff/queue');
  }
  myOpenClaims() {
    return this.http.get<Claim[]>('/api/staff/my-claims');
  }
  assign(claimId: string, officerId: string) {
    return this.http.post<Claim>(`/api/staff/claims/${claimId}/assign`, { officerId });
  }
  startReview(claimId: string) {
    return this.http.post<Claim>(`/api/staff/claims/${claimId}/start-review`, {});
  }
  setReserve(claimId: string, amount: number) {
    return this.http.put<Claim>(`/api/staff/claims/${claimId}/reserve`, { amount });
  }
  askQuestion(claimId: string, question: string) {
    return this.http.post<Claim>(`/api/staff/claims/${claimId}/info-requests`, { question });
  }
  approve(claimId: string, amount: number, reason: string) {
    return this.http.post<Claim>(`/api/staff/claims/${claimId}/approve`, { amount, reason });
  }
  reject(claimId: string, reason: string) {
    return this.http.post<Claim>(`/api/staff/claims/${claimId}/reject`, { reason });
  }
  settle(claimId: string) {
    return this.http.post<Claim>(`/api/staff/claims/${claimId}/settle`, {});
  }

  // ---- dashboards ----
  workload() {
    return this.http.get<Workload>('/api/dashboard/workload');
  }
  exposure() {
    return this.http.get<Exposure>('/api/dashboard/exposure');
  }
}
