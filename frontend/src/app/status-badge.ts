import { Component, computed, input } from '@angular/core';
import { ClaimStatus } from './models';

/** A small coloured label for a claim's status. */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [attr.data-status]="status()">{{ label() }}</span>`,
  styles: `
    .badge {
      display: inline-block;
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      white-space: nowrap;
      background: #e5e7eb;
      color: #374151;
    }
    .badge[data-status='SUBMITTED'] { background: #dbeafe; color: #1e40af; }
    .badge[data-status='ASSIGNED'] { background: #e0e7ff; color: #3730a3; }
    .badge[data-status='UNDER_REVIEW'] { background: #fef3c7; color: #92400e; }
    .badge[data-status='INFO_REQUESTED'] { background: #ffedd5; color: #9a3412; }
    .badge[data-status='APPROVED'] { background: #d1fae5; color: #065f46; }
    .badge[data-status='SETTLED'] { background: #bbf7d0; color: #14532d; }
    .badge[data-status='REJECTED'] { background: #fee2e2; color: #991b1b; }
  `,
})
export class StatusBadge {
  readonly status = input.required<ClaimStatus>();
  protected readonly label = computed(() => this.status().replace('_', ' '));
}
