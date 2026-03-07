import {Component, OnInit} from '@angular/core';
import {DatePipe, UpperCasePipe} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {AuthService} from '../../../auth/data-access/auth.service';

interface Highlight {
  readonly labelKey: string;
  readonly value: string;
}

interface Feature {
  readonly titleKey: string;
  readonly descriptionKey: string;
}

interface QuickAction {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly iconClass: string;
  readonly route: string;
  readonly requiresAdmin?: boolean;
}

interface OnboardingItem {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}

interface HomeOnboardingState {
  dismissed: boolean;
  completedIds: string[];
}

interface RecentSetupEntry {
  id: number;
  title: string;
  gameCode: string;
  trackSlug: string;
  openedAt: string;
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  imports: [RouterLink, TranslateModule, DatePipe, UpperCasePipe],
})
export class HomePageComponent implements OnInit {
  private readonly onboardingStorageKey = 'f1sets.home.onboarding';
  private readonly recentSetupsStorageKey = 'f1sets.setups.recent';

  readonly highlights: readonly Highlight[] = [
    {labelKey: 'home.highlights.tracksIndexed', value: '24'},
    {labelKey: 'home.highlights.setupsShared', value: '3,900+'},
    {labelKey: 'home.highlights.communityDrivers', value: '12k'},
  ];

  readonly features: readonly Feature[] = [
    {
      titleKey: 'home.features.discovery.title',
      descriptionKey: 'home.features.discovery.description',
    },
    {
      titleKey: 'home.features.data.title',
      descriptionKey: 'home.features.data.description',
    },
    {
      titleKey: 'home.features.raceDay.title',
      descriptionKey: 'home.features.raceDay.description',
    },
  ];

  readonly onboardingItems: readonly OnboardingItem[] = [
    {
      id: 'profile',
      titleKey: 'home.onboarding.items.profile.title',
      descriptionKey: 'home.onboarding.items.profile.description',
    },
    {
      id: 'discover',
      titleKey: 'home.onboarding.items.discover.title',
      descriptionKey: 'home.onboarding.items.discover.description',
    },
    {
      id: 'setup',
      titleKey: 'home.onboarding.items.setup.title',
      descriptionKey: 'home.onboarding.items.setup.description',
    },
    {
      id: 'ai',
      titleKey: 'home.onboarding.items.ai.title',
      descriptionKey: 'home.onboarding.items.ai.description',
    },
  ];

  readonly quickActions: readonly QuickAction[] = [
    {
      titleKey: 'home.quickActions.discovery.title',
      descriptionKey: 'home.quickActions.discovery.description',
      iconClass: 'fa-solid fa-compass',
      route: '/discovery',
    },
    {
      titleKey: 'home.quickActions.setups.title',
      descriptionKey: 'home.quickActions.setups.description',
      iconClass: 'fa-solid fa-screwdriver-wrench',
      route: '/setups',
    },
    {
      titleKey: 'home.quickActions.ai.title',
      descriptionKey: 'home.quickActions.ai.description',
      iconClass: 'fa-solid fa-chart-line',
      route: '/ai-difficulty',
    },
    {
      titleKey: 'home.quickActions.logs.title',
      descriptionKey: 'home.quickActions.logs.description',
      iconClass: 'fa-solid fa-clipboard-list',
      route: '/admin/logs',
      requiresAdmin: true,
    },
    {
      titleKey: 'home.quickActions.trackAdmin.title',
      descriptionKey: 'home.quickActions.trackAdmin.description',
      iconClass: 'fa-solid fa-road',
      route: '/admin/tracks',
      requiresAdmin: true,
    },
    {
      titleKey: 'home.quickActions.setupSchema.title',
      descriptionKey: 'home.quickActions.setupSchema.description',
      iconClass: 'fa-solid fa-sliders',
      route: '/admin/setup-fields',
      requiresAdmin: true,
    },
  ];

  private completedOnboardingIds = new Set<string>();
  onboardingDismissed = false;
  recentSetups: RecentSetupEntry[] = [];

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.loadOnboardingState();
    this.loadRecentSetups();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get visibleQuickActions(): QuickAction[] {
    return this.quickActions.filter(
      (action) => !action.requiresAdmin || (action.requiresAdmin && this.isAdmin),
    );
  }

  get onboardingVisible(): boolean {
    return this.isAuthenticated && !this.onboardingDismissed;
  }

  get onboardingCompletedCount(): number {
    return this.onboardingItems.filter((item) => this.completedOnboardingIds.has(item.id)).length;
  }

  get onboardingProgress(): number {
    if (this.onboardingItems.length === 0) {
      return 0;
    }
    return Math.round((this.onboardingCompletedCount / this.onboardingItems.length) * 100);
  }

  isOnboardingItemDone(itemId: string): boolean {
    return this.completedOnboardingIds.has(itemId);
  }

  toggleOnboardingItem(itemId: string): void {
    if (this.completedOnboardingIds.has(itemId)) {
      this.completedOnboardingIds.delete(itemId);
    } else {
      this.completedOnboardingIds.add(itemId);
    }
    this.saveOnboardingState();
  }

  dismissOnboarding(): void {
    this.onboardingDismissed = true;
    this.saveOnboardingState();
  }

  private loadRecentSetups(): void {
    try {
      const raw = localStorage.getItem(this.recentSetupsStorageKey);
      if (!raw) {
        this.recentSetups = [];
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        this.recentSetups = [];
        return;
      }
      this.recentSetups = parsed
        .filter(
          (item): item is RecentSetupEntry =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as RecentSetupEntry).id === 'number' &&
            typeof (item as RecentSetupEntry).title === 'string' &&
            typeof (item as RecentSetupEntry).gameCode === 'string' &&
            typeof (item as RecentSetupEntry).trackSlug === 'string' &&
            typeof (item as RecentSetupEntry).openedAt === 'string',
        )
        .slice(0, 6);
    } catch {
      this.recentSetups = [];
    }
  }

  private loadOnboardingState(): void {
    try {
      const raw = localStorage.getItem(this.onboardingStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<HomeOnboardingState>;
      if (typeof parsed.dismissed === 'boolean') {
        this.onboardingDismissed = parsed.dismissed;
      }
      if (Array.isArray(parsed.completedIds)) {
        this.completedOnboardingIds = new Set(
          parsed.completedIds.filter((id): id is string => typeof id === 'string'),
        );
      }
    } catch {
      this.onboardingDismissed = false;
      this.completedOnboardingIds = new Set<string>();
    }
  }

  private saveOnboardingState(): void {
    const state: HomeOnboardingState = {
      dismissed: this.onboardingDismissed,
      completedIds: [...this.completedOnboardingIds],
    };
    localStorage.setItem(this.onboardingStorageKey, JSON.stringify(state));
  }
}
