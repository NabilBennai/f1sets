import {Injectable} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {ChatSocketEnvelope} from './friends-chat.models';
import {FriendsChatService} from './friends-chat.service';

@Injectable({
  providedIn: 'root',
})
export class ChatNotificationService {
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly unreadByFriend: Record<number, number> = {};

  private activeFriendId: number | null = null;
  private socketSubscription?: Subscription;
  private startedForToken: string | null = null;
  private audioContext: AudioContext | null = null;

  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private readonly friendsChatService: FriendsChatService) {}

  start(token: string | null): void {
    if (!token) {
      this.stop();
      return;
    }

    if (
      this.startedForToken === token &&
      this.socketSubscription &&
      !this.socketSubscription.closed
    ) {
      return;
    }

    this.stop(false);
    this.startedForToken = token;
    this.friendsChatService.connectSocket(token);
    this.socketSubscription = this.friendsChatService.socketEvents$.subscribe((event) =>
      this.handleSocketEvent(event),
    );
  }

  stop(resetUnread = true): void {
    this.socketSubscription?.unsubscribe();
    this.socketSubscription = undefined;
    this.startedForToken = null;
    this.activeFriendId = null;
    this.friendsChatService.disconnectSocket();

    if (resetUnread) {
      Object.keys(this.unreadByFriend).forEach((key) => delete this.unreadByFriend[Number(key)]);
      this.unreadCountSubject.next(0);
    }
  }

  setActiveFriend(friendId: number | null): void {
    this.activeFriendId = friendId;
    if (friendId !== null) {
      this.markFriendRead(friendId);
    }
  }

  markFriendRead(friendId: number): void {
    const previous = this.unreadByFriend[friendId] ?? 0;
    if (previous <= 0) {
      return;
    }
    delete this.unreadByFriend[friendId];
    this.refreshUnreadCount();
  }

  getUnreadByFriend(): Record<number, number> {
    return {...this.unreadByFriend};
  }

  private handleSocketEvent(event: ChatSocketEnvelope): void {
    if (event.type !== 'message' || !event.message || event.message.mine) {
      return;
    }

    this.playMessageNotificationSound();
    const friendId = event.message.senderId;
    if (this.activeFriendId === friendId) {
      return;
    }

    const current = this.unreadByFriend[friendId] ?? 0;
    this.unreadByFriend[friendId] = current + 1;
    this.refreshUnreadCount();
  }

  private refreshUnreadCount(): void {
    const total = Object.values(this.unreadByFriend).reduce((sum, value) => sum + value, 0);
    this.unreadCountSubject.next(total);
  }

  private playMessageNotificationSound(): void {
    try {
      const audioContext = this.getAudioContext();
      if (!audioContext) {
        return;
      }

      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }

      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch {
      // Ignore browser audio failures.
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  }
}
