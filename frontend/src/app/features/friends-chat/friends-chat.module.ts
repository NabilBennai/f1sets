import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {FriendsChatRoutingModule} from './friends-chat-routing.module';
import {FriendsChatPageComponent} from './pages/friends-chat-page/friends-chat-page.component';

@NgModule({
  imports: [CommonModule, RouterModule, FriendsChatRoutingModule, FriendsChatPageComponent],
})
export class FriendsChatModule {}
