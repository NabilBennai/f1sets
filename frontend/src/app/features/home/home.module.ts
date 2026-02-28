import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {HomeRoutingModule} from './home-routing.module';
import {HomePageComponent} from './pages/home-page/home-page.component';

@NgModule({
  imports: [CommonModule, RouterModule, HomeRoutingModule, HomePageComponent],
})
export class HomeModule {}
