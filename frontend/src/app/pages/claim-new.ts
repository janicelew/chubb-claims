import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from '../api';
import { errorMessage } from '../errors';
import { pollResource } from '../poll';

/** Report an incident. The backend checks the rules (own policy, date within cover, amount); we show its messages. */
@Component({
  selector: 'app-claim-new',
  template: `
    <div class="page-head"><h1>Report an incident</h1></div>

    @if (policies.error(); as message) {
      <p class="error">{{ message }}</p>
    }

    <form class="card" (submit)="submit($event, policy.value, date.value, description.value, amount.value)">
      <label>
        Policy
        <select #policy required>
          <option value="">Choose a policy…</option>
          @for (p of policies.data(); track p.policyNumber) {
            <option [value]="p.policyNumber">{{ p.policyNumber }} · {{ p.type }} · {{ p.market }}</option>
          }
        </select>
      </label>

      <label>
        Date of the incident
        <input #date type="date" [max]="today" required />
      </label>

      <label>
        What happened?
        <textarea #description rows="5" maxlength="2000" required></textarea>
      </label>

      <label>
        Amount you are claiming
        <input #amount type="number" min="0.01" step="0.01" required />
      </label>

      @if (formError(); as message) {
        <p class="error">{{ message }}</p>
      }
      <div>
        <button type="submit" [disabled]="busy()">{{ busy() ? 'Sending…' : 'Submit claim' }}</button>
      </div>
    </form>
  `,
})
export class ClaimNew {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly policies = pollResource(() => this.api.policies(), 0); // load once
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly today = localDate(new Date()); // the backend rejects incident dates in the future

  protected submit(event: Event, policyNumber: string, incidentDate: string, description: string, amount: string): void {
    event.preventDefault();
    const claimedAmount = Number(amount);
    if (!policyNumber || !incidentDate || description.trim() === '' || !(claimedAmount > 0)) {
      this.formError.set('Please fill in every field. The amount must be more than zero.');
      return;
    }
    this.formError.set(null);
    this.busy.set(true);
    this.api
      .submitClaim({ policyNumber, incidentDate, description: description.trim(), claimedAmount })
      .subscribe({
        next: (claim) => this.router.navigate(['/claims', claim.id]),
        error: (err) => {
          this.formError.set(errorMessage(err));
          this.busy.set(false);
        },
      });
  }
}

/** Today's date as YYYY-MM-DD in the user's own time zone (toISOString would use UTC). */
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
