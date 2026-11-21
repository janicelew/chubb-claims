import { Component, computed, inject, signal } from '@angular/core';
import { Api } from '../api';
import { ClaimTable } from '../claim-table';
import { errorMessage } from '../errors';
import { Identity } from '../identity';
import { Claim } from '../models';
import { pollResource } from '../poll';

/** New claims nobody has picked up yet, oldest first. An officer can pick one up; a manager assigns from the claim page. */
@Component({
  selector: 'app-queue',
  imports: [ClaimTable],
  template: `
    <div class="page-head"><h1>Unassigned queue</h1></div>
    <p class="muted">Oldest first: the claim that has waited longest is at the top.</p>

    @if (queue.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (actionError(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (queue.loading()) {
      <p class="muted">Loading…</p>
    } @else if (queue.data(); as list) {
      <app-claim-table
        [claims]="list"
        [canPickUp]="isOfficer()"
        emptyText="Nothing is waiting. Every claim has an officer."
        (pickUp)="pickUp($event)"
      />
    }
  `,
})
export class Queue {
  private readonly api = inject(Api);
  private readonly identity = inject(Identity);

  protected readonly queue = pollResource(() => this.api.queue());
  protected readonly isOfficer = computed(() => this.identity.user().role === 'OFFICER');
  protected readonly actionError = signal<string | null>(null);

  protected pickUp(claim: Claim): void {
    this.actionError.set(null);
    this.api.assign(claim.id, this.identity.user().id).subscribe({
      next: () => this.queue.reload(),
      error: (err) => {
        this.actionError.set(errorMessage(err));
        this.queue.reload(); // someone else may have taken it first
      },
    });
  }
}
