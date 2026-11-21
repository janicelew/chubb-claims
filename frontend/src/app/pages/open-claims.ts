import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Api } from '../api';
import { ClaimTable } from '../claim-table';
import { ageLabel, displayName } from '../identity';
import { ClaimType, Market, OpenClaimsFilter } from '../models';
import { pollResource } from '../poll';

/** Reads ?officerId=O-02&market=SG&type=MOTOR from the address, so every dashboard number can link here. */
function toFilter(params: ParamMap): OpenClaimsFilter {
  return {
    officerId: params.get('officerId') ?? undefined,
    market: (params.get('market') as Market | null) ?? undefined,
    type: (params.get('type') as ClaimType | null) ?? undefined,
  };
}

/**
 * Every open claim, optionally narrowed to one officer, market or claim type. This is where the dashboards lead:
 * click an officer on Workload or a row on Exposure and you land here, looking at the claims behind the number.
 * The totals above the table add up the claims that are listed.
 */
@Component({
  selector: 'app-open-claims',
  imports: [RouterLink, ClaimTable, DecimalPipe],
  template: `
    <div class="page-head"><h1>Open claims</h1></div>

    <p class="muted">
      @if (filterText(); as text) {
        Showing open claims {{ text }}. <a routerLink="/open-claims">Show all open claims</a>
      } @else {
        Every claim that is not yet settled or rejected, oldest first. Click a claim number for its details.
      }
    </p>

    @if (claims.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (claims.loading()) {
      <p class="muted">Loading…</p>
    } @else if (claims.data(); as list) {
      @if (list.length > 0) {
        <div class="cards">
          <div class="card">
            <span class="stat-value">{{ list.length }}</span>
            <span class="stat-label">open claims listed</span>
          </div>
          <div class="card">
            <span class="stat-value">{{ totals().reserved | number: '1.2-2' }}</span>
            <span class="stat-label">reserved (officers' estimates)</span>
          </div>
          <div class="card">
            <span class="stat-value">{{ totals().notAssessed | number: '1.2-2' }}</span>
            <span class="stat-label">claimed, not yet assessed</span>
          </div>
          <div class="card">
            <span class="stat-value">{{ totals().oldest }}</span>
            <span class="stat-label">oldest claim open</span>
          </div>
        </div>
      }
      <app-claim-table [claims]="list" [showClaimant]="true" emptyText="No open claims match." />
    }
  `,
})
export class OpenClaims {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);

  protected readonly filter = toSignal(this.route.queryParamMap.pipe(map(toFilter)), {
    initialValue: toFilter(this.route.snapshot.queryParamMap),
  });
  protected readonly claims = pollResource(() => this.api.openClaims(this.filter()));

  /** A sentence describing the filter, or '' when nothing is filtered. */
  protected readonly filterText = computed(() => {
    const f = this.filter();
    const parts: string[] = [];
    if (f.officerId) parts.push(`held by ${displayName(f.officerId)}`);
    if (f.market) parts.push(`in ${f.market}`);
    if (f.type) parts.push(`of type ${f.type}`);
    return parts.join(', ');
  });

  /** Totals of exactly the claims that are listed. */
  protected readonly totals = computed(() => {
    const list = this.claims.data() ?? [];
    let reserved = 0;
    let notAssessed = 0;
    let oldestMs = Number.POSITIVE_INFINITY;
    for (const c of list) {
      if (c.reserveAmount === null) notAssessed += c.claimedAmount;
      else reserved += c.reserveAmount;
      oldestMs = Math.min(oldestMs, new Date(c.createdAt).getTime());
    }
    const days = list.length === 0 ? 0 : Math.floor((Date.now() - oldestMs) / 86_400_000);
    return { reserved, notAssessed, oldest: ageLabel(days) };
  });

  constructor() {
    // The same page is reused when only the address filter changes, so fetch again whenever it does.
    effect(() => {
      this.filter();
      untracked(() => this.claims.reload());
    });
  }
}
