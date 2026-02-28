import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {AdminTrackRoutingModule} from './admin-track-routing.module';
import {AdminTrackPageComponent} from './pages/admin-track-page/admin-track-page.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, AdminTrackRoutingModule, AdminTrackPageComponent],
})
export class AdminTrackModule {}
