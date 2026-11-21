import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Identity } from './identity';

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear(); // the chosen demo user is remembered there
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    });
  });

  async function navText(): Promise<string> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('nav')?.textContent ?? '';
  }

  it('shows the claimant menu to a claimant', async () => {
    const text = await navText();
    expect(text).toContain('Report an incident');
    expect(text).toContain('Notifications');
    expect(text).not.toContain('Queue');
  });

  it('shows the staff menu to an officer, without Exposure', async () => {
    TestBed.inject(Identity).select('O-01');
    const text = await navText();
    expect(text).toContain('Queue');
    expect(text).toContain('Workload');
    expect(text).not.toContain('Exposure');
    expect(text).not.toContain('Report an incident');
  });

  it('shows Exposure to the manager only', async () => {
    TestBed.inject(Identity).select('M-01');
    expect(await navText()).toContain('Exposure');
  });
});
