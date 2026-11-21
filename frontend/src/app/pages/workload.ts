import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Api } from '../api';
import { pollResource } from '../poll';

/** How loaded each officer is, plus the unassigned backlog. Open to all staff. */
@Component({
  selector: 'app-workload',
  imports: [DecimalPipe, KeyValuePipe],
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
          <span class="stat-label">unassigned claims</span>
        </div>
        <div class="card">
          <span class="stat-value">{{ w.oldestUnassignedDays }}</span>
          <span class="stat-label">days waiting (oldest unassigned)</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Officer</th>
            <th class="num">Open claims</th>
            <th>By status</th>
            <th class="num">Total reserve</th>
            <th class="num">Oldest open (days)</th>
          </tr>
        </thead>
        <tbody>
          @for (o of w.officers; track o.officerId) {
            <tr>
              <td>{{ o.name }} <span class="muted">({{ o.officerId }})</span></td>
              <td class="num">{{ o.openClaims }}</td>
              <td>
                @for (s of o.byStatus | keyvalue; track s.key) {
                  <span class="chip capitalize">{{ s.key.replace('_', ' ').toLowerCase() }} · {{ s.value }}</span>
                } @empty {
                  <span class="muted">—</span>
                }
              </td>
              <td class="num">{{ o.totalReserve | number: '1.2-2' }}</td>
              <td class="num">{{ o.oldestOpenClaimDays }}</td>
            </tr>
          }
        </tbody>
      </table>
      <p class="muted">
        Reserve is the officer's estimate of what will be paid. "Oldest open" counts calendar days since the claim was
        created.
      </p>
    }
  `,
})
export class Workload {
  private readonly api = inject(Api);
  protected readonly workload = pollResource(() => this.api.workload());
}
