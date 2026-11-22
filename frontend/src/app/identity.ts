import { Injectable, signal } from '@angular/core';
import { ClaimStatus, DemoUser, Role } from './models';

/** The demo users from the backend seed data. */
export const DEMO_USERS: DemoUser[] = [
  { id: 'C-1001', role: 'CLAIMANT', label: 'C-1001 · Claimant (MY motor + property)' },
  { id: 'C-1002', role: 'CLAIMANT', label: 'C-1002 · Claimant (SG motor)' },
  { id: 'C-1003', role: 'CLAIMANT', label: 'C-1003 · Claimant (HK property)' },
  { id: 'O-01', role: 'OFFICER', label: 'O-01 · Officer · Mei Ling Tan', name: 'Mei Ling Tan' },
  { id: 'O-02', role: 'OFFICER', label: 'O-02 · Officer · Raj Kumar', name: 'Raj Kumar' },
  { id: 'O-03', role: 'OFFICER', label: 'O-03 · Officer · Tom Wong', name: 'Tom Wong' },
  { id: 'M-01', role: 'MANAGER', label: 'M-01 · Manager · Sarah Lim', name: 'Sarah Lim' },
];

/**
 * How to show a person in the screens: "Raj Kumar (O-02)" for staff, the plain ID for anyone else.
 * The backend only sends IDs, so the names come from the same demo seed data the backend uses.
 */
export function displayName(id: string | null): string {
  if (id === null) {
    return '—';
  }
  const user = DEMO_USERS.find((u) => u.id === id);
  return user?.name ? `${user.name} (${id})` : id;
}

/** "Today", "1 day", "5 days": how long a claim has been open, in whole calendar days. */
export function ageLabel(days: number): string {
  return days <= 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;
}

/**
 * How old one claim is, for the Age column: "Today", "1 day", "5 days" since it was submitted.
 * A settled or rejected claim is finished, so it shows a dash. Counts whole 24-hour periods, like the backend does
 * for the workload page. `now` is a parameter only so a test can pin the time.
 */
export function claimAge(createdAt: string, status: ClaimStatus, now: number = Date.now()): string {
  if (status === 'SETTLED' || status === 'REJECTED') {
    return '—';
  }
  const days = Math.floor((now - Date.parse(createdAt)) / 86_400_000);
  return ageLabel(Math.max(0, days)); // a clock a little behind the server's must not show "-1 days"
}

const STORAGE_KEY = 'chubb-claims-demo-user';

/**
 * Who is using the app. The backend has no login: it trusts the X-User-Id and X-User-Role headers
 * (a deliberate demo shortcut, see docs/DECISIONS.md section 8). Real sign-in would replace this class only.
 */
@Injectable({ providedIn: 'root' })
export class Identity {
  readonly user = signal<DemoUser>(this.loadSaved());

  /** The first page for a role. */
  homePath(role: Role = this.user().role): string {
    return role === 'CLAIMANT' ? '/claims' : '/queue';
  }

  select(id: string): void {
    const user = DEMO_USERS.find((u) => u.id === id);
    if (!user) {
      return;
    }
    this.user.set(user);
    try {
      localStorage.setItem(STORAGE_KEY, user.id);
    } catch {
      // storage can be blocked (private window); the app still works, it just forgets the choice on reload
    }
  }

  private loadSaved(): DemoUser {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return DEMO_USERS.find((u) => u.id === saved) ?? DEMO_USERS[0];
    } catch {
      return DEMO_USERS[0];
    }
  }
}
