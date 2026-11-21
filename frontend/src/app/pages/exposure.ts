import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Api } from '../api';
import { pollResource } from '../poll';

/** Outstanding liability exposure by market and claim type. Managers only. */
@Component({
  selector: 'app-exposure',
  imports: [DecimalPipe],
  template: `
    <div class="page-head"><h1>Liability exposure</h1></div>

    @if (exposure.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (exposure.loading()) {
      <p class="muted">Loading…</p>
    } @else if (exposure.data(); as e) {
      <div class="cards">
        <div class="card">
          <span class="stat-value">{{ e.totalReserved | number: '1.2-2' }}</span>
          <span class="stat-label">reserved on open claims</span>
        </div>
        <div class="card">
          <span class="stat-value">{{ e.totalClaimedNotYetReserved | number: '1.2-2' }}</span>
          <span class="stat-label">claimed, not yet assessed</span>
        </div>
        <div class="card">
          <span class="stat-value">{{ e.openClaims }}</span>
          <span class="stat-label">open claims</span>
        </div>
      </div>

      @if (e.breakdown.length === 0) {
        <p class="empty">There are no open claims.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Type</th>
              <th class="num">Open claims</th>
              <th class="num">Reserved</th>
              <th class="num">Claimed, not yet assessed</th>
            </tr>
          </thead>
          <tbody>
            @for (line of e.breakdown; track line.market + line.type) {
              <tr>
                <td>{{ line.market }}</td>
                <td>{{ line.type }}</td>
                <td class="num">{{ line.openClaims }}</td>
                <td class="num">{{ line.reserved | number: '1.2-2' }}</td>
                <td class="num">{{ line.claimedNotYetReserved | number: '1.2-2' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
      <p class="muted">
        "Reserved" is the officers' estimates on open claims, which is Chubb's liability. "Claimed, not yet assessed" is
        what claimants asked for on claims with no estimate yet: it is their number, so it is shown separately. Amounts are
        in one currency; real use needs a currency per policy and exchange rates.
      </p>
    }
  `,
})
export class Exposure {
  private readonly api = inject(Api);
  protected readonly exposure = pollResource(() => this.api.exposure());
}
