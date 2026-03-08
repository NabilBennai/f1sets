import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, OnDestroy} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {
  ChatHistoryResponse,
  ChatSocketEnvelope,
  FriendRequestItem,
  FriendRequestsResponse,
  FriendSummary,
} from './friends-chat.models';

@Injectable({
  providedIn: 'root',
})
export class FriendsChatService implements OnDestroy {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly socketEventsSubject = new Subject<ChatSocketEnvelope>();
  private socket: WebSocket | null = null;

  readonly socketEvents$ = this.socketEventsSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  ngOnDestroy(): void {
    this.disconnectSocket();
  }

  listFriends(): Observable<FriendSummary[]> {
    return this.http.get<FriendSummary[]>(`${this.apiBaseUrl}/friends`);
  }

  searchUsers(query: string, limit = 20): Observable<FriendSummary[]> {
    const params = new HttpParams().set('query', query).set('limit', String(limit));
    return this.http.get<FriendSummary[]>(`${this.apiBaseUrl}/friends/users/search`, {params});
  }

  listRequests(): Observable<FriendRequestsResponse> {
    return this.http.get<FriendRequestsResponse>(`${this.apiBaseUrl}/friends/requests`);
  }

  sendRequest(userId: number): Observable<FriendRequestItem> {
    return this.http.post<FriendRequestItem>(`${this.apiBaseUrl}/friends/requests`, {userId});
  }

  acceptRequest(requestId: number): Observable<FriendRequestItem> {
    return this.http.post<FriendRequestItem>(
      `${this.apiBaseUrl}/friends/requests/${requestId}/accept`,
      {},
    );
  }

  rejectRequest(requestId: number): Observable<FriendRequestItem> {
    return this.http.post<FriendRequestItem>(
      `${this.apiBaseUrl}/friends/requests/${requestId}/reject`,
      {},
    );
  }

  removeFriend(friendUserId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/friends/${friendUserId}`);
  }

  getHistory(friendId: number, limit = 200): Observable<ChatHistoryResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<ChatHistoryResponse>(`${this.apiBaseUrl}/chat/history/${friendId}`, {
      params,
    });
  }

  connectSocket(token: string): void {
    if (!token) {
      return;
    }

    const readyState = this.socket?.readyState;
    if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
      return;
    }

    this.disconnectSocket();
    const socketUrl = this.buildSocketUrl(token);
    this.socket = new WebSocket(socketUrl);

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatSocketEnvelope;
        if (
          !payload ||
          (payload.type !== 'message' && payload.type !== 'error' && payload.type !== 'read')
        ) {
          return;
        }
        this.socketEventsSubject.next(payload);
      } catch {
        this.socketEventsSubject.next({
          type: 'error',
          message: null,
          error: 'Invalid socket payload.',
        });
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
    };

    this.socket.onerror = () => {
      this.socketEventsSubject.next({
        type: 'error',
        message: null,
        error: 'Socket connection error.',
      });
    };
  }

  disconnectSocket(): void {
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.socket = null;
  }

  sendMessage(recipientId: number, content: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        recipientId,
        content,
      }),
    );
    return true;
  }

  sendReadReceipt(friendId: number): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        readFriendId: friendId,
      }),
    );
    return true;
  }

  private buildSocketUrl(token: string): string {
    const apiRoot = this.apiBaseUrl.replace(/\/api\/v1$/, '');
    const wsBase = apiRoot.startsWith('https://')
      ? apiRoot.replace('https://', 'wss://')
      : apiRoot.replace('http://', 'ws://');
    return `${wsBase}/ws/chat?token=${encodeURIComponent(token)}`;
  }
}
