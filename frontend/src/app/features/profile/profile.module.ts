import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {ProfileRoutingModule} from './profile-routing.module';
import {ProfilePageComponent} from './pages/profile-page/profile-page.component';
import {ProfileSettingsPageComponent} from './pages/profile-settings-page/profile-settings-page.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ProfileRoutingModule,
    ProfilePageComponent,
    ProfileSettingsPageComponent,
  ],
})
export class ProfileModule {}
