import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api';
import { pollResource } from '../poll';

/**
 * Updates for the claimant ("your claim was approved"). They are created by a Kafka listener on the backend a
 * moment after the officer acts, so this page asks again every 30 seconds.
 */
@Component({
  selector: 'app-notifications',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-head"><h1>Notifications</h1></div>

    @if (notifications.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (notifications.loading()) {
      <p class="muted">Loading…</p>
    } @else if (notifications.data(); as list) {
      @if (list.length === 0) {
        <p class="empty">No updates yet.</p>
      } @else {
        @for (n of list; track n.id) {
          <div class="card">
            <div>{{ n.message }}</div>
            <div class="muted">
              <a [routerLink]="['/claims', n.claimId]">{{ n.claimNumber }}</a> · {{ n.createdAt | date: 'medium' }}
            </div>
          </div>
        }
      }
    }
  `,
})
export class Notifications {
  private readonly api = inject(Api);
  protected readonly notifications = pollResource(() => this.api.notifications());
}
