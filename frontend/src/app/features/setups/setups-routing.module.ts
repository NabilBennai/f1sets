import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/setup-publisher-page/setup-publisher-page.component').then(
        (m) => m.SetupPublisherPageComponent,
      ),
  },
  {
    path: ':gameCode/:trackSlug',
    loadComponent: () =>
      import('./pages/setup-publisher-page/setup-publisher-page.component').then(
        (m) => m.SetupPublisherPageComponent,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SetupsRoutingModule {}
