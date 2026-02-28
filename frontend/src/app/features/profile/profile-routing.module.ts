import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {authGuard} from '../auth/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/profile-settings-page/profile-settings-page.component').then(
        (m) => m.ProfileSettingsPageComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}
