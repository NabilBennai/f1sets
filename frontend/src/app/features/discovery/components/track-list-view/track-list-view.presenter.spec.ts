import {
  applyFilters,
  hasActiveFilters,
  normalizeFilters,
  toTrackCard,
} from './track-list-view.presenter';
import {TrackListItem} from '../../models/track.models';

describe('track-list-view.presenter', () => {
  const tracks: TrackListItem[] = [
    {
      id: 1,
      slug: 'monza',
      grandPrixName: 'Italian Grand Prix',
      circuitName: 'Monza',
      lengthKm: 5.793,
      hasSetups: true,
      hasLeaderboard: false,
      hasAiDifficulty: true,
      trackImageUrl: null,
    },
    {
      id: 2,
      slug: 'silverstone',
      grandPrixName: 'British Grand Prix',
      circuitName: 'Silverstone',
      lengthKm: null,
      hasSetups: false,
      hasLeaderboard: true,
      hasAiDifficulty: false,
      trackImageUrl: null,
    },
  ];

  it('normalizes filter inputs and detects active filters', () => {
    const filters = normalizeFilters({
      query: '  MonZa  ',
      setups: true,
      leaderboard: false,
      ai: false,
    });

    expect(filters.query).toBe('monza');
    expect(filters.features.setups).toBeTrue();
    expect(hasActiveFilters(filters)).toBeTrue();
  });

  it('normalizes null/undefined filter values to safe defaults', () => {
    const filters = normalizeFilters({
      query: null,
      setups: null,
      leaderboard: null,
      ai: null,
    });

    expect(filters).toEqual({
      query: '',
      features: {
        setups: false,
        leaderboard: false,
        ai: false,
      },
    });
    expect(hasActiveFilters(filters)).toBeFalse();
  });

  it('returns original list reference when no filters are active', () => {
    const filters = normalizeFilters({});
    const result = applyFilters(tracks, filters);
    expect(result).toBe(tracks);
  });

  it('applies query and feature filters together', () => {
    const filtered = applyFilters(
      tracks,
      normalizeFilters({
        query: 'grand prix',
        setups: true,
        leaderboard: false,
        ai: true,
      }),
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('monza');
  });

  it('filters by leaderboard feature and query-empty path', () => {
    const filtered = applyFilters(
      tracks,
      normalizeFilters({query: '', setups: false, leaderboard: true, ai: false}),
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('silverstone');
  });

  it('handles nullish track fields in filter haystack safely', () => {
    const weirdTrack = {
      id: 200,
      slug: null,
      grandPrixName: null,
      circuitName: null,
      lengthKm: null,
      hasSetups: false,
      hasLeaderboard: false,
      hasAiDifficulty: false,
      trackImageUrl: null,
    } as unknown as TrackListItem;

    const filtered = applyFilters(
      [weirdTrack],
      normalizeFilters({query: 'anything', setups: false, leaderboard: false, ai: false}),
    );

    expect(filtered).toEqual([]);
  });

  it('maps track cards with fallback values and badges', () => {
    const cardWithData = toTrackCard(tracks[0]);
    const cardWithFallback = toTrackCard(tracks[1]);

    expect(cardWithData.formattedLength).toBe('5.793 km');
    expect(cardWithData.badges.map((badge) => badge.labelKey)).toEqual([
      'discovery.badges.setups',
      'discovery.badges.aiCurve',
    ]);

    expect(cardWithFallback.formattedLength).toBe('');
    expect(cardWithFallback.badges.map((badge) => badge.labelKey)).toEqual([
      'discovery.badges.leaderboard',
    ]);
    expect(cardWithFallback.subtitle).toBe('Silverstone');
  });

  it('uses fallback title/subtitle and scouting badge when no track data flags exist', () => {
    const card = toTrackCard({
      id: 99,
      slug: 'generic',
      grandPrixName: null,
      circuitName: null,
      lengthKm: 'bad-number',
      hasSetups: false,
      hasLeaderboard: false,
      hasAiDifficulty: false,
      trackImageUrl: null,
    });

    expect(card.title).toBe('generic');
    expect(card.subtitle).toBe('');
    expect(card.formattedLength).toBe('');
    expect(card.badges).toEqual([{labelKey: 'discovery.badges.scouting', tone: 'success'}]);
  });

  it('formats numeric string length correctly', () => {
    const card = toTrackCard({
      id: 50,
      slug: 'spa',
      grandPrixName: 'Belgian Grand Prix',
      circuitName: 'Spa',
      lengthKm: '7.004',
      hasSetups: false,
      hasLeaderboard: false,
      hasAiDifficulty: false,
      trackImageUrl: null,
    });

    expect(card.formattedLength).toBe('7.004 km');
  });
});
