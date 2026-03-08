import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {authGuard} from './features/auth/guards/auth.guard';
import {adminGuard} from './features/auth/guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadChildren: () => import('./features/home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'ai-difficulty',
    loadChildren: () =>
      import('./features/ai-difficulty/ai-difficulty.module').then((m) => m.AiDifficultyModule),
  },
  {
    path: 'discovery',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/discovery/discovery.module').then((m) => m.DiscoveryModule),
  },
  {
    path: 'setups',
    canActivate: [authGuard],
    loadChildren: () => import('./features/setups/setups.module').then((m) => m.SetupsModule),
  },
  {
    path: 'friends-chat',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/friends-chat/friends-chat.module').then((m) => m.FriendsChatModule),
  },
  {
    path: 'admin/tracks',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./features/admin-track/admin-track.module').then((m) => m.AdminTrackModule),
  },
  {
    path: 'admin/setup-fields',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./features/admin-setup/admin-setup.module').then((m) => m.AdminSetupModule),
  },
  {
    path: 'admin/logs',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./features/admin-logs/admin-logs.module').then((m) => m.AdminLogsModule),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.module').then((m) => m.ProfileModule),
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
