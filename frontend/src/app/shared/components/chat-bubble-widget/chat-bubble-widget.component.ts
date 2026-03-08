import {CommonModule} from '@angular/common';
import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {RouterModule} from '@angular/router';
import {Subscription} from 'rxjs';
import {AuthUser} from '../../../features/auth/data-access/auth.models';
import {AuthService} from '../../../features/auth/data-access/auth.service';
import {ToastService} from '../../../core/toast/toast.service';
import {ChatNotificationService} from '../../../features/friends-chat/data-access/chat-notification.service';
import {
  ChatMessage,
  ChatSocketEnvelope,
  FriendSummary,
} from '../../../features/friends-chat/data-access/friends-chat.models';
import {FriendsChatService} from '../../../features/friends-chat/data-access/friends-chat.service';

@Component({
  selector: 'app-chat-bubble-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './chat-bubble-widget.component.html',
})
export class ChatBubbleWidgetComponent implements OnInit, OnDestroy {
  currentUser: AuthUser | null = null;
  isOpen = false;
  isDraggingBubble = false;
  isBubblePressed = false;
  bubbleX = 0;
  bubbleY = 0;
  popupLeft = 8;
  popupTop = 8;
  popupWidth = 448;
  popupHeight = 560;

  friends: FriendSummary[] = [];
  selectedFriendId: number | null = null;
  messages: ChatMessage[] = [];
  messageDraft = '';

  loadingFriends = false;
  loadingMessages = false;
  sendingMessage = false;

  unreadByFriendId: Record<number, number | undefined> = {};

  private socketEventsSubscription?: Subscription;
  private authSubscription?: Subscription;
  private bubblePositionInitialized = false;
  private activePointerId: number | null = null;
  private pointerCaptureElement: HTMLElement | null = null;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private bubbleStartX = 0;
  private bubbleStartY = 0;
  private hasPointerMoved = false;
  private dragSamples: Array<{x: number; y: number; t: number}> = [];
  private snapAnimationFrameId: number | null = null;
  private readonly widgetPositionStorageKey = 'f1sets.chat.widget.position';
  private readonly bubbleSizePx = 56;
  private readonly viewportPaddingPx = 8;
  private readonly popupGapPx = 12;
  private readonly popupPreferredWidthPx = 448;
  private readonly popupPreferredHeightPx = 620;
  private readonly popupMinWidthPx = 300;
  private readonly popupMinHeightPx = 320;
  private readonly dragThresholdPx = 5;
  private readonly dragSampleWindowMs = 120;
  private readonly snapVelocityThresholdPxPerMs = 0.3;
  private readonly snapDurationMs = 220;
  private readonly inertiaFactorMs = 140;

  constructor(
    private readonly authService: AuthService,
    private readonly friendsChatService: FriendsChatService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly toastService: ToastService,
    private readonly translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.initializeBubblePosition();

    this.authSubscription = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      if (!user) {
        this.resetWidgetState();
        return;
      }

      this.unreadByFriendId = this.chatNotificationService.getUnreadByFriend();
      this.chatNotificationService.start(this.authService.getAccessToken());
      this.ensureSocketSubscription();
      if (this.isOpen) {
        this.loadFriends();
      }
    });
  }

  ngOnDestroy(): void {
    this.cancelSnapAnimation();
    this.socketEventsSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.chatNotificationService.setActiveFriend(null);
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen) {
      this.closePanel();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.bubblePositionInitialized) {
      return;
    }

    const clamped = this.getClampedPosition(this.bubbleX, this.bubbleY);
    this.bubbleX = clamped.x;
    this.bubbleY = clamped.y;
    this.persistBubblePosition();
    this.updatePopupLayout();
  }

  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(event: PointerEvent): void {
    if (this.activePointerId === null || event.pointerId !== this.activePointerId) {
      return;
    }

    const deltaX = event.clientX - this.pointerStartX;
    const deltaY = event.clientY - this.pointerStartY;
    if (
      !this.hasPointerMoved &&
      (Math.abs(deltaX) >= this.dragThresholdPx || Math.abs(deltaY) >= this.dragThresholdPx)
    ) {
      this.hasPointerMoved = true;
      this.isDraggingBubble = true;
    }

    if (!this.hasPointerMoved) {
      return;
    }

    const nextPosition = this.getClampedPosition(
      this.bubbleStartX + deltaX,
      this.bubbleStartY + deltaY,
    );
    this.bubbleX = nextPosition.x;
    this.bubbleY = nextPosition.y;
    this.updatePopupLayout();
    this.recordDragSample(nextPosition.x, nextPosition.y);
    event.preventDefault();
  }

  @HostListener('document:pointerup', ['$event'])
  onDocumentPointerUp(event: PointerEvent): void {
    this.finishBubblePointerInteraction(event);
  }

  @HostListener('document:pointercancel', ['$event'])
  onDocumentPointerCancel(event: PointerEvent): void {
    this.finishBubblePointerInteraction(event);
  }

  get totalUnread(): number {
    return Object.values(this.unreadByFriendId).reduce<number>(
      (sum, count) => sum + (count ?? 0),
      0,
    );
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

  onBubblePointerDown(event: PointerEvent): void {
    if (!this.currentUser) {
      return;
    }

    this.cancelSnapAnimation();
    this.initializeBubblePosition();
    this.activePointerId = event.pointerId;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.bubbleStartX = this.bubbleX;
    this.bubbleStartY = this.bubbleY;
    this.hasPointerMoved = false;
    this.isDraggingBubble = false;
    this.isBubblePressed = true;
    this.dragSamples = [{x: this.bubbleX, y: this.bubbleY, t: performance.now()}];

    const target = event.currentTarget as HTMLElement | null;
    this.pointerCaptureElement = target;
    this.pointerCaptureElement?.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  togglePanel(): void {
    if (!this.currentUser) {
      return;
    }

    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.updatePopupLayout();
      this.unreadByFriendId = this.chatNotificationService.getUnreadByFriend();
      this.loadFriends();
      if (this.selectedFriendId !== null) {
        this.chatNotificationService.setActiveFriend(this.selectedFriendId);
      }
    } else {
      this.chatNotificationService.setActiveFriend(null);
    }
  }

  closePanel(): void {
    this.isOpen = false;
    this.chatNotificationService.setActiveFriend(null);
  }

  backToFriends(): void {
    this.selectedFriendId = null;
    this.messages = [];
    this.messageDraft = '';
    this.chatNotificationService.setActiveFriend(null);
  }

  selectFriend(friendId: number): void {
    if (this.selectedFriendId === friendId) {
      return;
    }

    this.selectedFriendId = friendId;
    this.messages = [];
    this.unreadByFriendId[friendId] = 0;
    this.chatNotificationService.setActiveFriend(friendId);
    this.chatNotificationService.markFriendRead(friendId);
    this.friendsChatService.sendReadReceipt(friendId);
    this.loadHistory(friendId);
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

  private ensureSocketSubscription(): void {
    if (this.socketEventsSubscription && !this.socketEventsSubscription.closed) {
      return;
    }

    this.socketEventsSubscription = this.friendsChatService.socketEvents$.subscribe((event) => {
      this.handleSocketEvent(event);
    });
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
          return;
        }

        const currentSelectionStillExists =
          this.selectedFriendId !== null &&
          friends.some((friend) => friend.id === this.selectedFriendId);

        if (!currentSelectionStillExists && this.selectedFriendId !== null) {
          this.selectedFriendId = null;
          this.messages = [];
          this.chatNotificationService.setActiveFriend(null);
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

  private loadHistory(friendId: number): void {
    this.loadingMessages = true;
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

  private handleSocketEvent(event: ChatSocketEnvelope): void {
    if (!this.currentUser) {
      return;
    }

    if (event.type === 'read') {
      if (!event.friendId || !event.readAt) {
        return;
      }
      if (this.isOpen && this.selectedFriendId === event.friendId) {
        this.messages = this.applyReadMark(this.messages, event.friendId, event.readAt);
      }
      return;
    }

    if (event.type === 'error') {
      return;
    }

    if (!event.message) {
      return;
    }

    const incoming = event.message;
    const normalized: ChatMessage = {
      ...incoming,
      mine: incoming.senderId === this.currentUser.id,
    };

    const friendId =
      normalized.senderId === this.currentUser.id ? normalized.recipientId : normalized.senderId;

    if (this.isOpen && this.selectedFriendId === friendId) {
      this.messages = this.mergeMessage(this.messages, normalized);
      this.chatNotificationService.markFriendRead(friendId);
      this.unreadByFriendId[friendId] = 0;
      this.friendsChatService.sendReadReceipt(friendId);
      return;
    }

    if (normalized.senderId !== this.currentUser.id) {
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

  private finishBubblePointerInteraction(event: PointerEvent): void {
    if (this.activePointerId === null || event.pointerId !== this.activePointerId) {
      return;
    }

    if (this.pointerCaptureElement?.hasPointerCapture(event.pointerId)) {
      this.pointerCaptureElement.releasePointerCapture(event.pointerId);
    }

    const shouldTogglePanel = !this.hasPointerMoved;
    const wasDragging = this.isDraggingBubble;

    this.activePointerId = null;
    this.pointerCaptureElement = null;
    this.hasPointerMoved = false;
    this.isDraggingBubble = false;
    this.isBubblePressed = false;

    if (wasDragging) {
      this.snapBubbleAfterDrag();
      return;
    }

    if (shouldTogglePanel) {
      this.togglePanel();
    }
  }

  private initializeBubblePosition(): void {
    if (this.bubblePositionInitialized) {
      return;
    }

    const stored = this.readStoredBubblePosition();
    if (stored) {
      const clamped = this.getClampedPosition(stored.x, stored.y);
      this.bubbleX = clamped.x;
      this.bubbleY = clamped.y;
    } else {
      const defaults = this.getDefaultBubblePosition();
      this.bubbleX = defaults.x;
      this.bubbleY = defaults.y;
    }

    this.bubblePositionInitialized = true;
    this.updatePopupLayout();
  }

  private getDefaultBubblePosition(): {x: number; y: number} {
    return this.getClampedPosition(
      window.innerWidth - this.bubbleSizePx - 24,
      window.innerHeight - this.bubbleSizePx - 24,
    );
  }

  private getClampedPosition(x: number, y: number): {x: number; y: number} {
    const minX = this.viewportPaddingPx;
    const minY = this.viewportPaddingPx;
    const maxX = Math.max(minX, window.innerWidth - this.bubbleSizePx - this.viewportPaddingPx);
    const maxY = Math.max(minY, window.innerHeight - this.bubbleSizePx - this.viewportPaddingPx);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }

  private persistBubblePosition(): void {
    try {
      localStorage.setItem(
        this.widgetPositionStorageKey,
        JSON.stringify({
          x: this.bubbleX,
          y: this.bubbleY,
        }),
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }

  private recordDragSample(x: number, y: number): void {
    const now = performance.now();
    this.dragSamples.push({x, y, t: now});
    const minTime = now - this.dragSampleWindowMs;
    this.dragSamples = this.dragSamples.filter((sample) => sample.t >= minTime);
  }

  private snapBubbleAfterDrag(): void {
    const velocity = this.calculateDragVelocity();
    const minX = this.viewportPaddingPx;
    const maxX = Math.max(minX, window.innerWidth - this.bubbleSizePx - this.viewportPaddingPx);
    const minY = this.viewportPaddingPx;
    const maxY = Math.max(minY, window.innerHeight - this.bubbleSizePx - this.viewportPaddingPx);

    const projectedX = this.bubbleX + velocity.vx * this.inertiaFactorMs;
    const projectedY = this.bubbleY + velocity.vy * this.inertiaFactorMs;

    let targetX = projectedX + this.bubbleSizePx / 2 < window.innerWidth / 2 ? minX : maxX;
    if (Math.abs(velocity.vx) >= this.snapVelocityThresholdPxPerMs) {
      targetX = velocity.vx < 0 ? minX : maxX;
    }

    const targetY = this.clamp(projectedY, minY, maxY);
    this.animateBubbleTo(this.clamp(targetX, minX, maxX), targetY);
  }

  private calculateDragVelocity(): {vx: number; vy: number} {
    if (this.dragSamples.length < 2) {
      return {vx: 0, vy: 0};
    }

    const first = this.dragSamples[0];
    const last = this.dragSamples[this.dragSamples.length - 1];
    const dt = last.t - first.t;
    if (dt <= 0) {
      return {vx: 0, vy: 0};
    }

    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt,
    };
  }

  private animateBubbleTo(targetX: number, targetY: number): void {
    this.cancelSnapAnimation();

    const startX = this.bubbleX;
    const startY = this.bubbleY;
    const startTime = performance.now();
    const duration = this.snapDurationMs;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = this.clamp(elapsed / duration, 0, 1);
      const eased = this.easeOutCubic(progress);

      this.bubbleX = startX + (targetX - startX) * eased;
      this.bubbleY = startY + (targetY - startY) * eased;
      this.updatePopupLayout();

      if (progress < 1) {
        this.snapAnimationFrameId = requestAnimationFrame(tick);
      } else {
        this.snapAnimationFrameId = null;
        this.persistBubblePosition();
      }
    };

    this.snapAnimationFrameId = requestAnimationFrame(tick);
  }

  private cancelSnapAnimation(): void {
    if (this.snapAnimationFrameId === null) {
      return;
    }
    cancelAnimationFrame(this.snapAnimationFrameId);
    this.snapAnimationFrameId = null;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updatePopupLayout(): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxPopupWidth = Math.max(220, viewportWidth - this.viewportPaddingPx * 2);
    const maxPopupHeight = Math.max(240, viewportHeight - this.viewportPaddingPx * 2);

    const minPopupWidth = Math.min(this.popupMinWidthPx, maxPopupWidth);
    const minPopupHeight = Math.min(this.popupMinHeightPx, maxPopupHeight);

    this.popupWidth = this.clamp(this.popupPreferredWidthPx, minPopupWidth, maxPopupWidth);

    const spaceLeft = this.bubbleX - this.viewportPaddingPx - this.popupGapPx;
    const spaceRight =
      viewportWidth - (this.bubbleX + this.bubbleSizePx) - this.viewportPaddingPx - this.popupGapPx;
    const preferRight = spaceRight >= spaceLeft;
    const leftCandidate = preferRight
      ? this.bubbleX + this.bubbleSizePx + this.popupGapPx
      : this.bubbleX - this.popupGapPx - this.popupWidth;

    this.popupLeft = this.clamp(
      leftCandidate,
      this.viewportPaddingPx,
      viewportWidth - this.viewportPaddingPx - this.popupWidth,
    );

    const spaceAbove = this.bubbleY - this.viewportPaddingPx - this.popupGapPx;
    const spaceBelow =
      viewportHeight -
      (this.bubbleY + this.bubbleSizePx) -
      this.viewportPaddingPx -
      this.popupGapPx;

    const largestVerticalSpace = Math.max(spaceAbove, spaceBelow);
    const desiredHeight = Math.min(
      this.popupPreferredHeightPx,
      Math.max(largestVerticalSpace, minPopupHeight),
    );
    this.popupHeight = this.clamp(desiredHeight, minPopupHeight, maxPopupHeight);

    const openAbove = spaceAbove >= spaceBelow;
    const topCandidate = openAbove
      ? this.bubbleY - this.popupGapPx - this.popupHeight
      : this.bubbleY + this.bubbleSizePx + this.popupGapPx;

    this.popupTop = this.clamp(
      topCandidate,
      this.viewportPaddingPx,
      viewportHeight - this.viewportPaddingPx - this.popupHeight,
    );
  }

  private clamp(value: number, min: number, max: number): number {
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  private readStoredBubblePosition(): {x: number; y: number} | null {
    try {
      const raw = localStorage.getItem(this.widgetPositionStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<{x: number; y: number}>;
      if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
        return null;
      }
      return {x: parsed.x, y: parsed.y};
    } catch {
      return null;
    }
  }

  private resetWidgetState(): void {
    this.isOpen = false;
    this.friends = [];
    this.selectedFriendId = null;
    this.messages = [];
    this.messageDraft = '';
    this.unreadByFriendId = {};
  }
}
