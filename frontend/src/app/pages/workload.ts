import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';
import { ageLabel } from '../identity';
import { pollResource } from '../poll';

/** How loaded each officer is, plus the unassigned backlog. Click an officer to see their claims. Open to all staff. */
@Component({
  selector: 'app-workload',
  imports: [DecimalPipe, KeyValuePipe, RouterLink],
  template: `
    <div class="page-head"><h1>Team workload</h1></div>

    @if (workload.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (workload.loading()) {
      <p class="muted">Loading…</p>
    } @else if (workload.data(); as w) {
      <div class="cards">
        <div class="card">
          <span class="stat-value">{{ w.unassignedClaims }}</span>
          <span class="stat-label">
            unassigned claims @if (w.unassignedClaims > 0) { · <a routerLink="/queue">open the queue</a> }
          </span>
        </div>
        <div class="card">
          <span class="stat-value">{{ w.unassignedClaims === 0 ? '—' : age(w.oldestUnassignedDays) }}</span>
          <span class="stat-label">oldest unassigned claim has waited</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Officer</th>
            <th class="num">Open claims</th>
            <th>By status</th>
            <th class="num">Reserved</th>
            <th class="num">Claimed, not yet assessed</th>
            <th class="num">Oldest open</th>
          </tr>
        </thead>
        <tbody>
          @for (o of w.officers; track o.officerId) {
            <tr>
              <td>
                <a [routerLink]="['/open-claims']" [queryParams]="{ officerId: o.officerId }">{{ o.name }}</a>
                <span class="muted"> ({{ o.officerId }})</span>
              </td>
              <td class="num">{{ o.openClaims }}</td>
              <td>
                @for (s of o.byStatus | keyvalue; track s.key) {
                  <span class="chip capitalize">{{ s.key.replace('_', ' ').toLowerCase() }} · {{ s.value }}</span>
                } @empty {
                  <span class="muted">—</span>
                }
              </td>
              <td class="num">{{ o.totalReserve | number: '1.2-2' }}</td>
              <td class="num">{{ o.claimedNotYetReserved | number: '1.2-2' }}</td>
              <td class="num">{{ o.openClaims === 0 ? '—' : age(o.oldestOpenClaimDays) }}</td>
            </tr>
          }
        </tbody>
      </table>
      <p class="muted">
        Click an officer to see the claims behind these numbers. <strong>Reserved</strong> is the officer's own
        estimate of what will be paid, so a claim nobody has assessed yet adds nothing here; what claimants asked for
        on those claims is shown separately as <strong>claimed, not yet assessed</strong>. <strong>Oldest open</strong>
        is how long the officer's oldest open claim has existed, in whole days.
      </p>
    }
  `,
})
export class Workload {
  private readonly api = inject(Api);
  protected readonly workload = pollResource(() => this.api.workload());
  protected readonly age = ageLabel;
}
