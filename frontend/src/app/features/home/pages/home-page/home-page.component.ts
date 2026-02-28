import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';

interface Highlight {
  readonly label: string;
  readonly value: string;
}

interface Feature {
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  imports: [RouterLink],
})
export class HomePageComponent {
  readonly highlights: readonly Highlight[] = [
    {label: 'Tracks Indexed', value: '24'},
    {label: 'Setups Shared', value: '3,900+'},
    {label: 'Community Drivers', value: '12k'},
  ];

  readonly features: readonly Feature[] = [
    {
      title: 'Track-First Discovery',
      description:
        'Browse every circuit by game build, then filter only what matters for your next race weekend.',
    },
    {
      title: 'Data You Can Trust',
      description:
        'Lengths, validated setup signals, and lap intel are organized so decisions stay fast and confident.',
    },
    {
      title: 'Ready For Race Day',
      description: 'Jump from browsing into setup comparisons without losing context or momentum.',
    },
  ];
}
