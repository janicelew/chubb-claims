import { Injectable, signal } from '@angular/core';
import { DemoUser, Role } from './models';

/** The demo users from the backend seed data. */
export const DEMO_USERS: DemoUser[] = [
  { id: 'C-1001', role: 'CLAIMANT', label: 'C-1001 · Claimant (MY motor + property)' },
  { id: 'C-1002', role: 'CLAIMANT', label: 'C-1002 · Claimant (SG motor)' },
  { id: 'C-1003', role: 'CLAIMANT', label: 'C-1003 · Claimant (HK property)' },
  { id: 'O-01', role: 'OFFICER', label: 'O-01 · Officer · Mei Ling Tan' },
  { id: 'O-02', role: 'OFFICER', label: 'O-02 · Officer · Raj Kumar' },
  { id: 'O-03', role: 'OFFICER', label: 'O-03 · Officer · Tom Wong' },
  { id: 'M-01', role: 'MANAGER', label: 'M-01 · Manager · Sarah Lim' },
];

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
