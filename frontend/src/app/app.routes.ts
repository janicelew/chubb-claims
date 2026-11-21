import { Routes } from '@angular/router';
import { homeRedirect, roleGuard } from './role-guard';
import { ClaimDetail } from './pages/claim-detail';
import { ClaimList } from './pages/claim-list';
import { ClaimNew } from './pages/claim-new';
import { Exposure } from './pages/exposure';
import { MyClaims } from './pages/my-claims';
import { Notifications } from './pages/notifications';
import { Queue } from './pages/queue';
import { Workload } from './pages/workload';

const claimantOnly = [roleGuard('CLAIMANT')];
const staffOnly = [roleGuard('OFFICER', 'MANAGER')];

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeRedirect], children: [] },

  // claimant
  { path: 'claims', component: ClaimList, canActivate: claimantOnly },
  { path: 'claims/new', component: ClaimNew, canActivate: claimantOnly },
  { path: 'notifications', component: Notifications, canActivate: claimantOnly },

  // everyone (the backend decides which claims a claimant may open)
  { path: 'claims/:id', component: ClaimDetail },

  // staff
  { path: 'queue', component: Queue, canActivate: staffOnly },
  { path: 'my-claims', component: MyClaims, canActivate: staffOnly },
  { path: 'workload', component: Workload, canActivate: staffOnly },
  { path: 'exposure', component: Exposure, canActivate: [roleGuard('MANAGER')] },

  { path: '**', redirectTo: '' },
];
