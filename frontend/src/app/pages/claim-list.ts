import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';
import { ClaimTable } from '../claim-table';
import { pollResource } from '../poll';

/** Claimant home: all of my claims, refreshed every 30 seconds so status changes show up. */
@Component({
  selector: 'app-claim-list',
  imports: [RouterLink, ClaimTable],
  template: `
    <div class="page-head">
      <h1>My claims</h1>
      <a class="button" routerLink="/claims/new">Report an incident</a>
    </div>

    @if (claims.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (claims.loading()) {
      <p class="muted">Loading…</p>
    } @else if (claims.data(); as list) {
      <app-claim-table [claims]="list" emptyText="You have not reported any claims yet." />
    }
  `,
})
export class ClaimList {
  private readonly api = inject(Api);
  protected readonly claims = pollResource(() => this.api.myClaims());
}
