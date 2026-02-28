import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AdminSetupRoutingModule} from './admin-setup-routing.module';
import {AdminSetupPageComponent} from './pages/admin-setup-page/admin-setup-page.component';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    AdminSetupRoutingModule,
    AdminSetupPageComponent,
  ],
})
export class AdminSetupModule {}
