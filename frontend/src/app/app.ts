import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DEMO_USERS, Identity } from './identity';

/** The page frame: top bar with navigation (different per role), the user switcher, and the current page. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  protected readonly identity = inject(Identity);
  protected readonly users = DEMO_USERS;
  protected readonly role = computed(() => this.identity.user().role);

  protected switchUser(event: Event): void {
    this.identity.select((event.target as HTMLSelectElement).value);
    this.router.navigateByUrl(this.identity.homePath());
  }
}
