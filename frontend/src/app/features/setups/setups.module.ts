import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SetupsRoutingModule} from './setups-routing.module';
import {SetupPublisherPageComponent} from './pages/setup-publisher-page/setup-publisher-page.component';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    SetupsRoutingModule,
    SetupPublisherPageComponent,
  ],
})
export class SetupsModule {}
