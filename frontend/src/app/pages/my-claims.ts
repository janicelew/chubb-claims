import { Component, inject } from '@angular/core';
import { Api } from '../api';
import { ClaimTable } from '../claim-table';
import { pollResource } from '../poll';

/** The signed-in officer's own open claims, least recently touched first, so stale work rises to the top. */
@Component({
  selector: 'app-my-claims',
  imports: [ClaimTable],
  template: `
    <div class="page-head"><h1>My open claims</h1></div>
    <p class="muted">Least recently updated first, so a claim that has gone quiet is easy to spot.</p>

    @if (claims.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (claims.loading()) {
      <p class="muted">Loading…</p>
    } @else if (claims.data(); as list) {
      <app-claim-table [claims]="list" emptyText="You have no open claims. Pick one up from the queue." />
    }
  `,
})
export class MyClaims {
  private readonly api = inject(Api);
  protected readonly claims = pollResource(() => this.api.myOpenClaims());
}
