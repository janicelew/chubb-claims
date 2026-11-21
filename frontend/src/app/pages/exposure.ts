import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';
import { pollResource } from '../poll';

/** Outstanding liability exposure: how much, where, and who is holding it. Managers only. */
@Component({
  selector: 'app-exposure',
  imports: [DecimalPipe, RouterLink],
  template: `
    <div class="page-head"><h1>Liability exposure</h1></div>

    @if (exposure.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (exposure.loading()) {
      <p class="muted">Loading…</p>
    } @else if (exposure.data(); as e) {
      <p>
        Chubb's estimated liability on open claims is <strong>{{ e.totalReserved | number: '1.2-2' }}</strong>, across
        <strong>{{ e.openClaims }}</strong> open {{ e.openClaims === 1 ? 'claim' : 'claims' }}. A further
        <strong>{{ e.totalClaimedNotYetReserved | number: '1.2-2' }}</strong> has been claimed on claims that no officer
        has assessed yet, so it is not in the estimate.
      </p>

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

      @if (e.openClaims === 0) {
        <p class="empty">There are no open claims, so there is no exposure.</p>
      } @else {
        <h2>Who holds it</h2>
        <table>
          <thead>
            <tr>
              <th>Officer</th>
              <th class="num">Open claims</th>
              <th class="num">Reserved</th>
              <th class="num">Claimed, not yet assessed</th>
            </tr>
          </thead>
          <tbody>
            @for (o of e.byOfficer; track o.officerId ?? 'unassigned') {
              <tr>
                <td>
                  @if (o.officerId === null) {
                    <a routerLink="/queue">Unassigned</a> <span class="muted">(nobody has picked these up)</span>
                  } @else {
                    <a [routerLink]="['/open-claims']" [queryParams]="{ officerId: o.officerId }">{{ o.name }}</a>
                    <span class="muted"> ({{ o.officerId }})</span>
                  }
                </td>
                <td class="num">{{ o.openClaims }}</td>
                <td class="num">{{ o.reserved | number: '1.2-2' }}</td>
                <td class="num">{{ o.claimedNotYetReserved | number: '1.2-2' }}</td>
              </tr>
            }
          </tbody>
        </table>

        <h2 style="margin-top: 1.5rem">Where it is</h2>
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Type</th>
              <th class="num">Open claims</th>
              <th class="num">Reserved</th>
              <th class="num">Claimed, not yet assessed</th>
              <th></th>
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
                <td>
                  <a [routerLink]="['/open-claims']" [queryParams]="{ market: line.market, type: line.type }">
                    View claims
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <p class="muted" style="margin-top: 1rem">
        <strong>Reserved</strong> is the officers' own estimates on open claims: that is Chubb's liability.
        <strong>Claimed, not yet assessed</strong> is what claimants asked for on claims with no estimate yet. It is the
        claimant's number, not Chubb's, so it is shown separately and is not added to the liability. A claim stops
        counting once it is settled or rejected. Amounts are in one currency; real use needs a currency per policy and
        exchange rates. Click an officer or "View claims" to see the claims behind a number.
      </p>
    }
  `,
})
export class Exposure {
  private readonly api = inject(Api);
  protected readonly exposure = pollResource(() => this.api.exposure());
}
