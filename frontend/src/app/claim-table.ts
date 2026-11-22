import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { claimAge, displayName } from './identity';
import { Claim } from './models';
import { StatusBadge } from './status-badge';

/** The list of claims used by every list page. Click a claim number to open it. */
@Component({
  selector: 'app-claim-table',
  imports: [RouterLink, StatusBadge, DecimalPipe, DatePipe],
  template: `
    @if (claims().length === 0) {
      <p class="empty">{{ emptyText() }}</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Claim</th>
            @if (showClaimant()) {
              <th>Claimant</th>
            }
            <th>Type · market</th>
            <th>Status</th>
            <th title="How long since the claim was submitted">Age</th>
            <th class="num">Claimed</th>
            <th class="num">Reserve</th>
            <th>Officer</th>
            <th>Updated</th>
            @if (canPickUp()) {
              <th></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (c of claims(); track c.id) {
            <tr>
              <td class="nowrap"><a [routerLink]="['/claims', c.id]">{{ c.claimNumber }}</a></td>
              @if (showClaimant()) {
                <td>{{ c.claimantId }}</td>
              }
              <td>{{ c.type }} · {{ c.market }}</td>
              <td><app-status-badge [status]="c.status" /></td>
              <td class="nowrap">{{ age(c) }}</td>
              <td class="num">{{ c.claimedAmount | number: '1.2-2' }}</td>
              <td class="num">{{ c.reserveAmount === null ? 'not set' : (c.reserveAmount | number: '1.2-2') }}</td>
              <td class="nowrap">{{ c.assignedOfficerId === null ? 'Not assigned' : name(c.assignedOfficerId) }}</td>
              <td>{{ c.updatedAt | date: 'medium' }}</td>
              @if (canPickUp()) {
                <td><button type="button" (click)="pickUp.emit(c)">Pick up</button></td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class ClaimTable {
  readonly claims = input.required<Claim[]>();
  readonly emptyText = input('No claims to show.');
  /** Show a "Pick up" button on each row (officers, on the queue). */
  readonly canPickUp = input(false);
  /** Show who made the claim (useful for staff looking across many claims). */
  readonly showClaimant = input(false);
  readonly pickUp = output<Claim>();

  protected readonly name = displayName;
  protected age(c: Claim): string {
    return claimAge(c.createdAt, c.status);
  }
}
