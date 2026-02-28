import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {DiscoveryRoutingModule} from './discovery-routing.module';
import {TrackListViewComponent} from './components/track-list-view/track-list-view.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, DiscoveryRoutingModule, TrackListViewComponent],
})
export class DiscoveryModule {}
