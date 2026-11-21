import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin, map } from 'rxjs';
import { Api } from '../api';
import { ACTION_LABELS, ClaimAction, allowedActions } from '../claim-actions';
import { errorMessage } from '../errors';
import { Identity } from '../identity';
import { Claim } from '../models';
import { pollResource } from '../poll';
import { StatusBadge } from '../status-badge';

/**
 * One claim, for everyone: facts, the officer's questions, and the history.
 * A claimant can answer open questions. Staff also get the action buttons, chosen by allowedActions().
 * The page reloads after every action, and every 30 seconds in case someone else changed the claim.
 */
@Component({
  selector: 'app-claim-detail',
  imports: [RouterLink, StatusBadge, DatePipe, DecimalPipe],
  template: `
    <p><a routerLink="/">← Back</a></p>

    @if (detail.error(); as message) {
      <p class="error">{{ message }}</p>
    }
    @if (actionError(); as message) {
      <p class="error">{{ message }}</p>
    }

    @if (detail.loading()) {
      <p class="muted">Loading…</p>
    } @else if (detail.data(); as d) {
      <div class="page-head">
        <h1>{{ d.claim.claimNumber }}</h1>
        <app-status-badge [status]="d.claim.status" />
      </div>

      <section class="card">
        <dl class="facts">
          <div><dt>Type</dt><dd>{{ d.claim.type }}</dd></div>
          <div><dt>Market</dt><dd>{{ d.claim.market }}</dd></div>
          <div><dt>Policy</dt><dd>{{ d.claim.policyNumber }}</dd></div>
          <div><dt>Incident date</dt><dd>{{ d.claim.incidentDate | date: 'mediumDate' }}</dd></div>
          <div><dt>Claimed</dt><dd>{{ d.claim.claimedAmount | number: '1.2-2' }}</dd></div>
          <div>
            <dt>Reserve (estimate)</dt>
            <dd>{{ d.claim.reserveAmount === null ? 'Not set yet' : (d.claim.reserveAmount | number: '1.2-2') }}</dd>
          </div>
          <div>
            <dt>Approved</dt>
            <dd>{{ d.claim.approvedAmount === null ? '—' : (d.claim.approvedAmount | number: '1.2-2') }}</dd>
          </div>
          <div><dt>Handled by</dt><dd>{{ d.claim.assignedOfficerId ?? 'Not assigned yet' }}</dd></div>
          <div><dt>Reported</dt><dd>{{ d.claim.createdAt | date: 'medium' }}</dd></div>
          <div><dt>Last updated</dt><dd>{{ d.claim.updatedAt | date: 'medium' }}</dd></div>
        </dl>
        @if (d.claim.decisionReason) {
          <h2 style="margin-top: 1rem">Decision</h2>
          <p>{{ d.claim.decisionReason }}</p>
        }
        <h2 style="margin-top: 1rem">What happened</h2>
        <p>{{ d.claim.description }}</p>
      </section>

      @if (actions().length > 0) {
        <section class="card">
          <h2>Actions</h2>
          <div class="button-row">
            @for (a of actions(); track a) {
              <button type="button" [class.danger]="a === 'reject'" [disabled]="busy()" (click)="choose(a)">
                {{ labels[a] }}
              </button>
            }
          </div>

          @switch (activeAction()) {
            @case ('setReserve') {
              <form (submit)="saveReserve($event, reserve.value)">
                <label>
                  Reserve: your estimate of what will be paid
                  <input #reserve type="number" min="0" step="0.01" [value]="d.claim.reserveAmount ?? ''" required />
                </label>
                <div><button type="submit" [disabled]="busy()">Save reserve</button></div>
              </form>
            }
            @case ('askQuestion') {
              <form (submit)="sendQuestion($event, question.value)">
                <label>
                  Question for the claimant
                  <textarea #question rows="3" maxlength="1000" required></textarea>
                </label>
                <div><button type="submit" [disabled]="busy()">Send question</button></div>
              </form>
            }
            @case ('approve') {
              <form (submit)="approve($event, approvedAmount.value, approveReason.value)">
                <label>
                  Amount to approve (cannot be more than the policy's cover limit)
                  <input
                    #approvedAmount
                    type="number"
                    min="0.01"
                    step="0.01"
                    [value]="d.claim.reserveAmount ?? d.claim.claimedAmount"
                    required
                  />
                </label>
                <label>
                  Reason
                  <textarea #approveReason rows="2" maxlength="1000" required></textarea>
                </label>
                <div><button type="submit" [disabled]="busy()">Approve claim</button></div>
              </form>
            }
            @case ('reject') {
              <form (submit)="reject($event, rejectReason.value)">
                <label>
                  Reason for rejecting (the claimant will see this)
                  <textarea #rejectReason rows="2" maxlength="1000" required></textarea>
                </label>
                <div><button type="submit" class="danger" [disabled]="busy()">Reject claim</button></div>
              </form>
            }
            @case ('assign') {
              <form (submit)="assign($event, officer.value)">
                <label>
                  Officer
                  <select #officer required>
                    <option value="">Choose an officer…</option>
                    @for (o of officers?.data() ?? []; track o.officerId) {
                      <option [value]="o.officerId">{{ o.name }} ({{ o.officerId }}) · {{ o.openClaims }} open</option>
                    }
                  </select>
                </label>
                <div><button type="submit" [disabled]="busy()">Assign</button></div>
              </form>
            }
          }
        </section>
      }

      @if (d.questions.length > 0) {
        <section class="card">
          <h2>Questions to the claimant</h2>
          @for (q of d.questions; track q.id) {
            <div class="question">
              <div>
                <strong>Question:</strong> {{ q.question }}
                <span class="muted">· {{ q.requestedAt | date: 'medium' }}</span>
              </div>
              @if (q.response !== null) {
                <div>
                  <strong>Answer:</strong> {{ q.response }}
                  <span class="muted">· {{ q.respondedAt | date: 'medium' }}</span>
                </div>
              } @else if (isClaimant()) {
                <form (submit)="answer($event, q.id, reply.value)">
                  <label>
                    Your answer
                    <textarea #reply rows="3" maxlength="2000" required></textarea>
                  </label>
                  <div><button type="submit" [disabled]="busy()">Send answer</button></div>
                </form>
              } @else {
                <div class="muted">Waiting for the claimant to answer.</div>
              }
            </div>
          }
        </section>
      }

      <section class="card">
        <h2>History</h2>
        <ul class="timeline">
          @for (h of d.history; track $index) {
            <li>
              <div>
                <strong class="capitalize">{{ words(h.eventType) }}</strong>
                <span class="muted"> by {{ h.actorId }}</span>
              </div>
              @if (h.note) {
                <div>{{ h.note }}</div>
              }
              <div class="when capitalize">
                @if (h.fromStatus && h.fromStatus !== h.toStatus) {
                  {{ words(h.fromStatus) }} →
                }
                {{ words(h.toStatus) }} · {{ h.occurredAt | date: 'medium' }}
              </div>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class ClaimDetail {
  private readonly api = inject(Api);
  protected readonly identity = inject(Identity);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly labels = ACTION_LABELS;
  protected readonly detail = pollResource(() =>
    forkJoin({
      claim: this.api.claim(this.id),
      history: this.api.history(this.id),
      questions: this.api.infoRequests(this.id),
    }),
  );

  /** Only a manager can assign, so only a manager needs the list of officers. */
  protected readonly officers =
    this.identity.user().role === 'MANAGER'
      ? pollResource(() => this.api.workload().pipe(map((w) => w.officers)), 0)
      : null;

  protected readonly isClaimant = computed(() => this.identity.user().role === 'CLAIMANT');
  protected readonly actions = computed(() => {
    const claim = this.detail.data()?.claim;
    return claim ? allowedActions(claim, this.identity.user()) : [];
  });

  protected readonly activeAction = signal<ClaimAction | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected words(value: string): string {
    return value.replaceAll('_', ' ').toLowerCase();
  }

  /** Buttons that need no input act straight away; the others open their small form. */
  protected choose(action: ClaimAction): void {
    this.actionError.set(null);
    if (action === 'pickUp') {
      this.run(this.api.assign(this.id, this.identity.user().id));
    } else if (action === 'startReview') {
      this.run(this.api.startReview(this.id));
    } else if (action === 'settle') {
      this.run(this.api.settle(this.id));
    } else {
      this.activeAction.set(this.activeAction() === action ? null : action);
    }
  }

  protected saveReserve(event: Event, amount: string): void {
    event.preventDefault();
    const value = Number(amount);
    if (amount === '' || !(value >= 0)) {
      return this.fail('Enter a reserve of zero or more.');
    }
    this.run(this.api.setReserve(this.id, value));
  }

  protected sendQuestion(event: Event, question: string): void {
    event.preventDefault();
    if (question.trim() === '') {
      return this.fail('Write the question first.');
    }
    this.run(this.api.askQuestion(this.id, question.trim()));
  }

  protected approve(event: Event, amount: string, reason: string): void {
    event.preventDefault();
    const value = Number(amount);
    if (!(value > 0) || reason.trim() === '') {
      return this.fail('Enter an amount above zero and a reason.');
    }
    this.run(this.api.approve(this.id, value, reason.trim()));
  }

  protected reject(event: Event, reason: string): void {
    event.preventDefault();
    if (reason.trim() === '') {
      return this.fail('A reason is required when rejecting a claim.');
    }
    this.run(this.api.reject(this.id, reason.trim()));
  }

  protected assign(event: Event, officerId: string): void {
    event.preventDefault();
    if (officerId === '') {
      return this.fail('Choose an officer.');
    }
    this.run(this.api.assign(this.id, officerId));
  }

  protected answer(event: Event, requestId: string, text: string): void {
    event.preventDefault();
    if (text.trim() === '') {
      return this.fail('Write your answer first.');
    }
    this.run(this.api.answerInfoRequest(this.id, requestId, text.trim()));
  }

  private fail(message: string): void {
    this.actionError.set(message);
  }

  /** Runs one change, then reloads the page. On failure, shows the server's message and reloads to show the latest state. */
  private run(call: Observable<Claim>): void {
    this.actionError.set(null);
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.activeAction.set(null);
        this.detail.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.actionError.set(errorMessage(err));
        this.detail.reload();
      },
    });
  }
}
