import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';
import {ToastService} from '../../../../core/toast/toast.service';
import {AuthService} from '../../../auth/data-access/auth.service';
import {ChatNotificationService} from '../../data-access/chat-notification.service';
import {
  ChatMessage,
  ChatSocketEnvelope,
  FriendRequestItem,
  FriendSummary,
} from '../../data-access/friends-chat.models';
import {FriendsChatService} from '../../data-access/friends-chat.service';

@Component({
  selector: 'app-friends-chat-page',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './friends-chat-page.component.html',
  styleUrl: './friends-chat-page.component.scss',
})
export class FriendsChatPageComponent implements OnInit, OnDestroy {
  friends: FriendSummary[] = [];
  incomingRequests: FriendRequestItem[] = [];
  outgoingRequests: FriendRequestItem[] = [];
  searchResults: FriendSummary[] = [];

  selectedFriendId: number | null = null;
  messages: ChatMessage[] = [];
  messageDraft = '';
  userSearchQuery = '';

  loadingFriends = false;
  loadingRequests = false;
  searchingUsers = false;
  loadingMessages = false;
  sendingMessage = false;

  unreadByFriendId: Record<number, number | undefined> = {};
  requestActionIds = new Set<number>();
  searchActionUserIds = new Set<number>();
  friendActionIds = new Set<number>();

  private readonly currentUserId: number | null;
  private socketEventsSubscription?: Subscription;
  private searchTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly friendsChatService: FriendsChatService,
    private readonly authService: AuthService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly toastService: ToastService,
    private readonly translateService: TranslateService,
  ) {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? null;
  }

  ngOnInit(): void {
    this.unreadByFriendId = this.chatNotificationService.getUnreadByFriend();
    this.chatNotificationService.start(this.authService.getAccessToken());
    this.loadFriends();
    this.loadRequests();
    this.connectSocket();
  }

  ngOnDestroy(): void {
    this.socketEventsSubscription?.unsubscribe();
    this.chatNotificationService.setActiveFriend(null);
    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
      this.searchTimeoutId = null;
    }
  }

  get selectedFriend(): FriendSummary | null {
    if (this.selectedFriendId === null) {
      return null;
    }
    return this.friends.find((friend) => friend.id === this.selectedFriendId) ?? null;
  }

  trackById(_: number, item: {id: number}): number {
    return item.id;
  }

  trackByRequestId(_: number, item: FriendRequestItem): number {
    return item.requestId;
  }

  selectFriend(friendId: number): void {
    if (this.selectedFriendId === friendId) {
      return;
    }
    this.selectedFriendId = friendId;
    this.unreadByFriendId[friendId] = 0;
    this.chatNotificationService.setActiveFriend(friendId);
    this.friendsChatService.sendReadReceipt(friendId);
    this.loadHistory(friendId);
  }

  onSearchInputChange(): void {
    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
    }

    const query = this.userSearchQuery.trim();
    if (query.length < 2) {
      this.searchResults = [];
      this.searchingUsers = false;
      return;
    }

    this.searchTimeoutId = setTimeout(() => {
      this.searchUsers(query);
    }, 250);
  }

  sendFriendRequest(user: FriendSummary): void {
    this.searchActionUserIds.add(user.id);
    this.friendsChatService.sendRequest(user.id).subscribe({
      next: (request) => {
        this.searchActionUserIds.delete(user.id);
        this.outgoingRequests = [
          request,
          ...this.outgoingRequests.filter((item) => item.requestId !== request.requestId),
        ];
        this.searchResults = this.searchResults.filter((item) => item.id !== user.id);
        this.toastService.success(
          this.translateService.instant('friendsChat.messages.requestSent'),
        );
      },
      error: () => {
        this.searchActionUserIds.delete(user.id);
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.requestFailed'),
        );
      },
    });
  }

  acceptRequest(request: FriendRequestItem): void {
    this.requestActionIds.add(request.requestId);
    this.friendsChatService.acceptRequest(request.requestId).subscribe({
      next: () => {
        this.requestActionIds.delete(request.requestId);
        this.incomingRequests = this.incomingRequests.filter(
          (item) => item.requestId !== request.requestId,
        );
        this.toastService.success(
          this.translateService.instant('friendsChat.messages.requestAccepted'),
        );
        this.loadFriends();
      },
      error: () => {
        this.requestActionIds.delete(request.requestId);
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.requestActionFailed'),
        );
      },
    });
  }

  rejectRequest(request: FriendRequestItem): void {
    this.requestActionIds.add(request.requestId);
    this.friendsChatService.rejectRequest(request.requestId).subscribe({
      next: () => {
        this.requestActionIds.delete(request.requestId);
        this.incomingRequests = this.incomingRequests.filter(
          (item) => item.requestId !== request.requestId,
        );
        this.toastService.info(
          this.translateService.instant('friendsChat.messages.requestRejected'),
        );
      },
      error: () => {
        this.requestActionIds.delete(request.requestId);
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.requestActionFailed'),
        );
      },
    });
  }

  removeFriend(friend: FriendSummary): void {
    const confirmed = window.confirm(
      this.translateService.instant('friendsChat.messages.confirmRemoveFriend', {
        name: friend.displayName,
      }),
    );
    if (!confirmed) {
      return;
    }

    this.friendActionIds.add(friend.id);
    this.friendsChatService.removeFriend(friend.id).subscribe({
      next: () => {
        this.friendActionIds.delete(friend.id);
        this.friends = this.friends.filter((item) => item.id !== friend.id);
        if (this.selectedFriendId === friend.id) {
          this.selectedFriendId = this.friends[0]?.id ?? null;
          this.messages = [];
          if (this.selectedFriendId !== null) {
            this.loadHistory(this.selectedFriendId);
          }
        }
        this.toastService.info(this.translateService.instant('friendsChat.messages.friendRemoved'));
      },
      error: () => {
        this.friendActionIds.delete(friend.id);
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.friendRemoveFailed'),
        );
      },
    });
  }

  sendMessage(): void {
    const friend = this.selectedFriend;
    const content = this.messageDraft.trim();
    if (!friend || !content || this.sendingMessage) {
      return;
    }

    this.sendingMessage = true;
    const sent = this.friendsChatService.sendMessage(friend.id, content);
    if (!sent) {
      this.sendingMessage = false;
      this.toastService.error(
        this.translateService.instant('friendsChat.messages.socketNotConnected'),
      );
      this.chatNotificationService.start(this.authService.getAccessToken());
      return;
    }

    this.messageDraft = '';
    this.sendingMessage = false;
  }

  formatMessageTime(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }

  private loadFriends(): void {
    this.loadingFriends = true;
    this.friendsChatService.listFriends().subscribe({
      next: (friends) => {
        this.loadingFriends = false;
        this.friends = friends;
        if (friends.length === 0) {
          this.selectedFriendId = null;
          this.messages = [];
          this.chatNotificationService.setActiveFriend(null);
          return;
        }

        const hasSelectedFriend =
          this.selectedFriendId !== null &&
          friends.some((friend) => friend.id === this.selectedFriendId);
        if (!hasSelectedFriend) {
          this.selectFriend(friends[0].id);
        } else if (this.selectedFriendId !== null) {
          this.chatNotificationService.setActiveFriend(this.selectedFriendId);
        }
      },
      error: () => {
        this.loadingFriends = false;
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.loadFriendsFailed'),
        );
      },
    });
  }

  private loadRequests(): void {
    this.loadingRequests = true;
    this.friendsChatService.listRequests().subscribe({
      next: (response) => {
        this.loadingRequests = false;
        this.incomingRequests = response.incoming;
        this.outgoingRequests = response.outgoing;
      },
      error: () => {
        this.loadingRequests = false;
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.loadRequestsFailed'),
        );
      },
    });
  }

  private searchUsers(query: string): void {
    this.searchingUsers = true;
    this.friendsChatService.searchUsers(query).subscribe({
      next: (users) => {
        this.searchingUsers = false;
        this.searchResults = users;
      },
      error: () => {
        this.searchingUsers = false;
        this.searchResults = [];
        this.toastService.error(this.translateService.instant('friendsChat.messages.searchFailed'));
      },
    });
  }

  private loadHistory(friendId: number): void {
    this.loadingMessages = true;
    this.messages = [];
    this.friendsChatService.getHistory(friendId).subscribe({
      next: (history) => {
        this.loadingMessages = false;
        this.messages = history.messages;
        this.friendsChatService.sendReadReceipt(friendId);
      },
      error: () => {
        this.loadingMessages = false;
        this.toastService.error(
          this.translateService.instant('friendsChat.messages.loadMessagesFailed'),
        );
      },
    });
  }

  private connectSocket(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      return;
    }
    this.chatNotificationService.start(token);
    if (!this.socketEventsSubscription || this.socketEventsSubscription.closed) {
      this.socketEventsSubscription = this.friendsChatService.socketEvents$.subscribe((event) => {
        this.handleSocketEvent(event);
      });
    }
  }

  private handleSocketEvent(event: ChatSocketEnvelope): void {
    if (event.type === 'read') {
      if (!event.friendId || !event.readAt) {
        return;
      }
      if (this.selectedFriendId === event.friendId) {
        this.messages = this.applyReadMark(this.messages, event.friendId, event.readAt);
      }
      return;
    }

    if (event.type === 'error') {
      if (event.error) {
        this.toastService.error(event.error);
      }
      return;
    }
    if (!event.message || this.currentUserId === null) {
      return;
    }

    const incoming = event.message;
    const normalized: ChatMessage = {
      ...incoming,
      mine: incoming.senderId === this.currentUserId,
    };
    const friendId =
      normalized.senderId === this.currentUserId ? normalized.recipientId : normalized.senderId;

    if (this.selectedFriendId === friendId) {
      this.messages = this.mergeMessage(this.messages, normalized);
      this.chatNotificationService.markFriendRead(friendId);
      this.friendsChatService.sendReadReceipt(friendId);
      return;
    }

    if (normalized.senderId !== this.currentUserId) {
      const currentUnread = this.unreadByFriendId[friendId] ?? 0;
      this.unreadByFriendId[friendId] = currentUnread + 1;
    }
  }

  private mergeMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
    if (messages.some((existing) => existing.id === message.id)) {
      return messages;
    }
    return [...messages, message].sort((a, b) => {
      const createdAtDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }
      return a.id - b.id;
    });
  }

  private applyReadMark(messages: ChatMessage[], friendId: number, readAt: string): ChatMessage[] {
    return messages.map((message) => {
      if (!message.mine || message.recipientId !== friendId) {
        return message;
      }
      if (message.readAt) {
        return message;
      }
      return {...message, readAt};
    });
  }
}
