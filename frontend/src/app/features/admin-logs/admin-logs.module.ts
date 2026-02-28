import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {AdminLogsRoutingModule} from './admin-logs-routing.module';
import {AdminLogsPageComponent} from './pages/admin-logs-page/admin-logs-page.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, AdminLogsRoutingModule, AdminLogsPageComponent],
})
export class AdminLogsModule {}
