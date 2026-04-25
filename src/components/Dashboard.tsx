import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trophy, Globe as GlobeIcon, Zap, Star, MapPin, Image as ImageIcon, ArrowUpDown, Plane, TrendingUp, Clock, Map, Sparkles, ChevronRight, ChevronLeft, Camera, Award, Timer, Calendar, Sun, Route, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, TravelLog } from '../types';
import { LEVELS, BadgeDefinition } from '../constants/gamification';
import DailyDiscovery from './DailyDiscovery';

const getTierBg = (tier: string) => {
  switch (tier) {
    case 'Bronze': return 'bg-gradient-to-br from-orange-400 to-orange-600';
    case 'Silver': return 'bg-gradient-to-br from-slate-300 to-slate-500';
    case 'Gold': return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
    case 'Platinum': return 'bg-gradient-to-br from-cyan-400 to-cyan-600';
    case 'Diamond': return 'bg-gradient-to-br from-indigo-500 to-indigo-700';
    default: return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
  }
};

const getTierText = (tier: string) => {
  switch (tier) {
    case 'Bronze': return 'text-orange-500';
    case 'Silver': return 'text-slate-400';
    case 'Gold': return 'text-yellow-500';
    case 'Platinum': return 'text-cyan-400';
    case 'Diamond': return 'text-indigo-500';
    default: return 'text-yellow-500';
  }
};
import { computeTravelDna, getGapSuggestion } from '../lib/travelDna';
import { formatTravelLogDate, normalizeStories } from '../lib/utils';
import { fetchAlbumArt } from '../lib/itunes';

// ─── Song Hero Card — needs its own hooks, can't live inside .map() ────────
function SongHeroCard({ topSong, topArtist, label, storedArtworkUrl, fetchDelay = 0, log, onUpdate }: { topSong: string; topArtist?: string; label: string; storedArtworkUrl?: string; fetchDelay?: number; log?: TravelLog; onUpdate?: (log: TravelLog) => Promise<void> }) {
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(storedArtworkUrl ?? null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (storedArtworkUrl) {
      setAlbumArtUrl(storedArtworkUrl);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      fetchAlbumArt(topSong, topArtist ?? '').then(url => {
        if (!cancelled) {
          setAlbumArtUrl(url);
          if (!url) {
            console.debug(`[SongHeroCard] No artwork found for "${topSong}" by "${topArtist}"`);
          } else if (url && log && onUpdate && !log.historicalContext?.artworkUrl) {
            // Persist the fetched artwork to Firestore so Dashboard doesn't need to re-fetch next time
            onUpdate({
              ...log,
              historicalContext: { ...log.historicalContext, artworkUrl: url },
            }).catch(err => {
              console.error('[SongHeroCard] Failed to persist artworkUrl:', err);
            });
          }
        }
      }).catch(err => {
        console.error(`[SongHeroCard] Fetch failed for "${topSong}":`, err);
      });
    };
    if (fetchDelay > 0) {
      timer = setTimeout(run, fetchDelay);
    } else {
      run();
    }
    return () => { cancelled = true; clearTimeout(timer); };
  }, [topSong, topArtist, storedArtworkUrl, fetchDelay, log, onUpdate]);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center gap-3 p-5 overflow-hidden">
      {/* Background: album art or dark gradient */}
      {albumArtUrl && !imgError ? (
        <img
          src={albumArtUrl}
          alt={topSong}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            console.warn(`[SongHeroCard] Image failed to load: ${albumArtUrl}`);
            setImgError(true);
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-slate-900" />
      )}
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-center px-2">
        {!albumArtUrl && (
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl">
            🎵
          </div>
        )}
        <div className="max-w-full">
          <p className="text-white font-black text-xs leading-snug line-clamp-2">{topSong}</p>
          {topArtist && <p className="text-stone-300 font-medium text-[10px] mt-0.5 line-clamp-1">{topArtist}</p>}
        </div>
        <div className="text-[8px] font-black text-stone-400 uppercase tracking-widest">{label}</div>
      </div>
    </div>
  );
}

interface DashboardProps {
  profile: UserProfile;
  logs: TravelLog[];
  earnedBadges: BadgeDefinition[];
  onLogClick?: (log: TravelLog) => void;
  onBulkEntry?: () => void;
  onPlanTrip?: () => void;
  onGlobePaint?: () => void;
  onDeleteLog?: (log: TravelLog) => void;
  onDiscoveryRevealed?: () => void;
  onUpdate?: (log: TravelLog) => Promise<void>;
  demoWalkStepId?: string;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'age';

const CONTINENT_DATA: Record<string, { total: number; color: string; icon: string }> = {
  'Europe': { total: 44, color: 'bg-blue-500', icon: '🏰' },
  'Asia': { total: 48, color: 'bg-red-500', icon: '🐼' },
  'Africa': { total: 54, color: 'bg-yellow-500', icon: '🐘' },
  'North America': { total: 23, color: 'bg-green-500', icon: '🦅' },
  'South America': { total: 12, color: 'bg-purple-500', icon: '🐆' },
  'Oceania': { total: 14, color: 'bg-cyan-500', icon: '🦘' },
  'Antarctica': { total: 1, color: 'bg-slate-400', icon: '🐧' },
};

const TravelInsights: React.FC<{ logs: TravelLog[]; profile: UserProfile }> = ({ logs, profile }) => {
  const insights = useMemo(() => {
    const continentMap: Record<string, Set<string>> = {};
    const countryVisitCount: Record<string, number> = {};
    let longestTrip = 0;
    let longestTripCity = '';
    let totalDuration = 0;
    let tripsWithDuration = 0;
    const years = new Set<number>();

    logs.forEach(l => {
      if (l.continent) {
        if (!continentMap[l.continent]) continentMap[l.continent] = new Set();
        continentMap[l.continent].add(l.countryName);
      }
      countryVisitCount[l.countryName] = (countryVisitCount[l.countryName] || 0) + 1;
      if (l.duration && l.duration > longestTrip) {
        longestTrip = l.duration;
        longestTripCity = l.cityName;
      }
      if (l.duration) {
        totalDuration += l.duration;
        tripsWithDuration++;
      }
      years.add(l.year);
    });

    const mostVisited = Object.entries(countryVisitCount).sort((a, b) => b[1] - a[1])[0];
    const avgDuration = tripsWithDuration > 0 ? Math.round(totalDuration / tripsWithDuration) : 0;
    const yearSpan = years.size > 0 ? Math.max(...years) - Math.min(...years) : 0;

    return { continentMap, mostVisited, longestTrip, longestTripCity, avgDuration, yearSpan, totalTrips: logs.length, totalDays: totalDuration };
  }, [logs]);

  const continentEntries = Object.entries(CONTINENT_DATA)
    .map(([name, data]) => ({
      name,
      ...data,
      visited: insights.continentMap[name]?.size || 0,
    }))
    .filter(c => c.visited > 0 || ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'].includes(c.name));

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-green-500" />
        <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">Travel Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Continental Coverage */}
        <div className="bg-white rounded-[2rem] border-4 border-gray-100 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Map className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Continental Coverage</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {continentEntries.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-lg leading-none shrink-0">{c.icon}</span>
                <span className="text-xs font-black text-gray-600 truncate">{c.name}</span>
                <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden min-w-[2rem]">
                  <div
                    className={`h-full rounded-full ${c.color} transition-all duration-700`}
                    style={{ width: `${Math.min(100, (c.visited / c.total) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                  <span className="text-blue-500">{c.visited}</span>/{c.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fun Stats */}
        <div className="bg-white rounded-[2rem] border-4 border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {insights.mostVisited && (
              <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Award className="w-3.5 h-3.5 text-green-500" />
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Most Visited</div>
                </div>
                <div className="text-sm font-black text-gray-800 truncate">{insights.mostVisited[0]}</div>
                <div className="text-[10px] font-bold text-green-600">{insights.mostVisited[1]} trips</div>
              </div>
            )}
            {insights.longestTrip > 0 && (
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Route className="w-3.5 h-3.5 text-blue-500" />
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Longest Trip</div>
                </div>
                <div className="text-sm font-black text-gray-800">{insights.longestTrip} days</div>
                <div className="text-[10px] font-bold text-blue-600 truncate">{insights.longestTripCity}</div>
              </div>
            )}
            {insights.avgDuration > 0 && (
              <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Timer className="w-3.5 h-3.5 text-purple-500" />
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Avg Duration</div>
                </div>
                <div className="text-sm font-black text-gray-800">{insights.avgDuration} days</div>
                <div className="text-[10px] font-bold text-purple-600">per trip</div>
              </div>
            )}
            {insights.yearSpan > 0 && (
              <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Travel Span</div>
                </div>
                <div className="text-sm font-black text-gray-800">{insights.yearSpan} years</div>
                <div className="text-[10px] font-bold text-orange-600">of adventures</div>
              </div>
            )}
            <div className="bg-teal-50 p-4 rounded-2xl border-2 border-teal-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Plane className="w-3.5 h-3.5 text-teal-500" />
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Trips</div>
              </div>
              <div className="text-sm font-black text-gray-800">{insights.totalTrips}</div>
              <div className="text-[10px] font-bold text-teal-600">adventures logged</div>
            </div>
            {insights.totalDays > 0 && (
              <div className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sun className="w-3.5 h-3.5 text-rose-500" />
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Days</div>
                </div>
                <div className="text-sm font-black text-gray-800">{insights.totalDays}</div>
                <div className="text-[10px] font-bold text-rose-600">on the road</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ profile, logs, earnedBadges, onLogClick, onBulkEntry, onPlanTrip, onGlobePaint, onDeleteLog, onDiscoveryRevealed, onUpdate, demoWalkStepId }) => {
  const earnedBadgesCount = earnedBadges.length;
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 6;
  const memoriesRef = useRef<HTMLElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<TravelLog | null>(null);

  const scrollToMemories = () => {
    memoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (demoWalkStepId !== 'dashboardJourney') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const scrollToTarget = () => {
      const target = document.querySelector('[data-tour="demo-dashboard-memory"]') as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      attempts += 1;
      if (attempts < 20) {
        timeoutId = setTimeout(scrollToTarget, 150);
      }
    };

    timeoutId = setTimeout(scrollToTarget, 250);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [demoWalkStepId, logs.length]);

  const uniqueCountries = new Set(logs.map(l => l.countryCode)).size;
  const totalCities = logs.length;

  // Calculate XP progress within current level range
  const currentLevelDef = LEVELS.find(l => l.level === profile.level);
  const nextLevelDef = LEVELS.find(l => l.level === profile.level + 1);
  const currentLevelXp = currentLevelDef?.xpRequired || 0;
  const nextLevelXp = nextLevelDef?.xpRequired || currentLevelXp + 100;
  const xpInLevel = profile.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpProgress = Math.min(100, (xpInLevel / xpNeeded) * 100);
  
  // World percentage calculation (using 195 as baseline for UN recognized countries)
  const worldPercentage = ((uniqueCountries / 195) * 100).toFixed(1);
 
  const getFlagUrl = (numericCode: string) => {
    const mapping: Record<string, string> = {
      '840': 'us', '356': 'in', '826': 'gb', '392': 'jp', '208': 'dk',
      '250': 'fr', '276': 'de', '380': 'it', '724': 'es', '578': 'no',
      '752': 'se', '246': 'fi', '528': 'nl', '056': 'be', '756': 'ch',
      '040': 'at', '616': 'pl', '124': 'ca', '036': 'au', '554': 'nz',
      '710': 'za', '076': 'br', '032': 'ar', '152': 'cl', '484': 'mx',
      '156': 'cn', '410': 'kr', '702': 'sg', '764': 'th', '458': 'my',
      '360': 'id', '608': 'ph', '704': 'vn', '818': 'eg', '784': 'ae',
      '682': 'sa', '376': 'il', '792': 'tr', '643': 'ru', '804': 'ua',
      '300': 'gr', '620': 'pt', '348': 'hu', '203': 'cz', '703': 'sk',
      '642': 'ro', '100': 'bg', '191': 'hr', '705': 'si', '233': 'ee',
      '428': 'lv', '440': 'lt', '372': 'ie', '470': 'mt', '196': 'cy',
      '442': 'lu', '352': 'is'
    };
    const alpha2 = mapping[numericCode.padStart(3, '0')] || 'un';
    return `https://flagcdn.com/w40/${alpha2}.png`;
  };

  const sortedLogs = [...logs]
    .filter(l => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const storyText = (l.stories || []).map(s => s.caption || '').join(' ');
      return (
        l.cityName.toLowerCase().includes(q) ||
        l.countryName.toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q) ||
        storyText.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          if (b.year !== a.year) return b.year - a.year;
          // Secondary sort by city name for stable ordering
          return a.cityName.localeCompare(b.cityName);
        case 'oldest':
          if (a.year !== b.year) return a.year - b.year;
          return a.cityName.localeCompare(b.cityName);
        case 'alphabetical': return a.cityName.localeCompare(b.cityName);
        case 'age': return (a.age ?? Infinity) - (b.age ?? Infinity);
        default: return 0;
      }
    });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 sm:space-y-12">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-green-500 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_6px_0_0_#16a34a] sm:shadow-[0_8px_0_0_#16a34a] text-white relative overflow-hidden"
        >
          <GlobeIcon className="absolute -right-4 -bottom-4 w-24 h-24 sm:w-32 sm:h-32 opacity-20" />
          <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest mb-2 opacity-80">Countries Visited</h3>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl sm:text-6xl font-black">{uniqueCountries}</div>
            <div className="text-lg sm:text-xl font-black opacity-60">/ 195</div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="text-[10px] sm:text-xs font-bold bg-white/20 px-3 py-1 rounded-full inline-block whitespace-nowrap">
              {worldPercentage}% of the World
            </div>
            <div className={`text-[10px] sm:text-xs font-bold ${getTierBg(LEVELS.find(l => l.level === profile.level)?.tier || 'Bronze')} px-3 py-1 rounded-full inline-block text-white whitespace-nowrap`}>
              Level {profile.level}
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-yellow-400 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_6px_0_0_#ca8a04] sm:shadow-[0_8px_0_0_#ca8a04] text-white relative overflow-hidden"
        >
          <Zap className="absolute -right-4 -bottom-4 w-24 h-24 sm:w-32 sm:h-32 opacity-20" />
          <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest mb-2 opacity-80">Total Cities</h3>
          <div className="text-4xl sm:text-6xl font-black">{totalCities}</div>
          <div className="mt-4 w-full bg-white/20 h-2 sm:h-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              className="h-full bg-white"
            />
          </div>
          <div className="mt-2 flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white/70">
            <span>{profile.xp} XP</span>
            <span className="whitespace-nowrap">{nextLevelXp - profile.xp} XP to Level {profile.level + 1}</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-purple-500 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_6px_0_0_#7e22ce] sm:shadow-[0_8px_0_0_#7e22ce] text-white relative overflow-hidden"
        >
          <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 sm:w-32 sm:h-32 opacity-20" />
          <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest mb-2 opacity-80">Badges Earned</h3>
          <div className="text-4xl sm:text-6xl font-black">{earnedBadgesCount}</div>
          {earnedBadgesCount > 0 && (
            <div className="mt-4 flex items-center">
              <div className="flex">
                {earnedBadges.slice(0, 5).map((badge, i) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      style={{ marginLeft: i === 0 ? 0 : '-10px', zIndex: i }}
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full ${badge.color} border-2 border-white/60 flex items-center justify-center shadow-sm`}
                    >
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  );
                })}
                {earnedBadgesCount > 5 && (
                  <div
                    style={{ marginLeft: '-10px', zIndex: 5 }}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/30 border-2 border-white/60 flex items-center justify-center shadow-sm"
                  >
                    <span className="text-[10px] sm:text-xs font-black text-white">+{earnedBadgesCount - 5}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Daily Discovery */}
      <DailyDiscovery
        streak={profile.discoveryStreak ?? 0}
        lastDiscoveryDate={profile.lastDiscoveryDate}
        onDiscoveryRevealed={onDiscoveryRevealed}
      />

      {/* Globe Paint Nudge — when trips < 5 and not yet onboarded */}
      {onGlobePaint && !profile.historyOnboarded && logs.length < 5 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          onClick={onGlobePaint}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 p-5 sm:p-6 rounded-[2rem] shadow-lg text-left text-white relative overflow-hidden group"
        >
          <GlobeIcon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-15" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <GlobeIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Your travel DNA has gaps</div>
              <div className="text-sm sm:text-base font-bold text-white/90">
                The more history we have, the smarter your plans — tap to map your travels
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </motion.button>
      )}

      {/* Next Adventure Suggestion */}
      {onPlanTrip && logs.length > 0 && (() => {
        const dna = computeTravelDna(logs, profile);
        const suggestion = getGapSuggestion(dna);
        return (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3 }}
            onClick={onPlanTrip}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 p-5 sm:p-6 rounded-[2rem] shadow-lg text-left text-white relative overflow-hidden group"
          >
            <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 opacity-15" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Ready for your next adventure?</div>
                <div className="text-sm sm:text-base font-bold text-white/90">
                  {suggestion || `You've explored ${dna.totalCountries} countries — where to next?`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </motion.button>
        );
      })()}

      {/* Travel Insights */}
      {logs.length > 0 && <TravelInsights logs={logs} profile={profile} />}

      {/* My Memories */}
      <section ref={memoriesRef} className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <h2 className="text-2xl sm:text-4xl font-black text-gray-800 tracking-tight">My Memories</h2>
              {(searchQuery ? sortedLogs.length : logs.length) > PAGE_SIZE && (
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedLogs.length)} of {sortedLogs.length}
                </span>
              )}
            </div>

            {logs.length > 0 && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-gray-100 shadow-sm">
              <ArrowUpDown className="w-4 h-4 text-gray-400 ml-2" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as SortOption); setPage(0); }}
                className="bg-transparent text-xs font-black uppercase tracking-widest text-gray-900 outline-none cursor-pointer pr-4"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">A-Z (City)</option>
                <option value="age">Age (Youngest)</option>
              </select>
            </div>
          )}
          </div>

          {/* Search */}
          {logs.length > 0 && (
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border-2 border-gray-100 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Search your memories..."
                className="flex-1 bg-transparent outline-none font-bold text-sm text-gray-900 placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setPage(0); }} className="text-gray-300 hover:text-gray-500 transition-colors">
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {logs.length > 0 && sortedLogs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">No memories match "{searchQuery}"</p>
          </div>
        )}

        {logs.length === 0 && onBulkEntry && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border-4 border-dashed border-green-200 p-8 sm:p-12 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto flex items-center justify-center">
              <Plane className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-black text-gray-800">Been traveling already?</h3>
            <p className="text-sm font-bold text-gray-400 max-w-md mx-auto">Quickly log your past trips — add countries, cities, and years all at once.</p>
            <button
              onClick={onBulkEntry}
              className="bg-green-500 hover:bg-green-600 text-white font-black py-3 px-8 rounded-2xl shadow-[0_4px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-xs"
            >
              Log Past Trips
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onLogClick?.(log)}
              data-tour={i === 0 ? 'demo-dashboard-memory' : undefined}
              className="bg-white rounded-[2rem] border-4 border-gray-100 p-6 shadow-xl hover:border-green-200 transition-all group cursor-pointer relative"
            >
              {onDeleteLog && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(log); }}
                  className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 border-2 border-gray-100 hover:border-red-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              )}
              {(() => {
                const allStories = normalizeStories(log);
                const firstPhoto = allStories.find(s => s.type === 'photo' && s.mediaUrl);
                const firstText = allStories.find(s => s.type === 'text' && s.caption);
                const bgGradients: Record<string, string> = {
                  sunset: 'from-orange-400 via-pink-500 to-red-400',
                  ocean: 'from-blue-500 via-cyan-400 to-teal-400',
                  forest: 'from-green-600 via-emerald-500 to-teal-600',
                  night: 'from-indigo-900 via-purple-800 to-slate-900',
                  coral: 'from-rose-400 via-pink-400 to-orange-300',
                  charcoal: 'from-slate-700 via-slate-600 to-zinc-700',
                  sage: 'from-green-300 via-teal-300 to-emerald-200',
                  amber: 'from-amber-400 via-yellow-400 to-orange-300',
                };
                const heroPhotoUrl = log.photoUrl || firstPhoto?.mediaUrl;
                const topSong = log.historicalContext?.topSong;
                const topArtist = log.historicalContext?.topArtist;

                /* All cards use the same hero + compact strip layout */
                return (
                  <>
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gradient-to-br from-gray-100 to-gray-200">
                      {heroPhotoUrl ? (
                        <img
                          src={heroPhotoUrl}
                          alt={log.cityName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : firstText ? (
                        <div className={`w-full h-full bg-gradient-to-br ${bgGradients[firstText.backgroundColor || 'sunset']} flex items-center justify-center p-5`}>
                          <p className="text-white font-bold text-base text-center line-clamp-5 leading-snug drop-shadow">"{firstText.caption}"</p>
                        </div>
                      ) : topSong ? (
                        /* Music hero: album art (or dark gradient fallback) with song info */
                        <SongHeroCard
                          topSong={topSong}
                          topArtist={topArtist}
                          storedArtworkUrl={log.historicalContext?.artworkUrl}
                          fetchDelay={log.historicalContext?.artworkUrl ? 0 : i * 600}
                          label={log.day ? '#1 that week' : log.month ? '#1 that month' : `Top song of ${log.year}`}
                          log={log}
                          onUpdate={onUpdate}
                        />
                      ) : (
                        /* Nostalgia teaser: no historical context yet */
                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center gap-2 p-5">
                          <span className="text-2xl">✨</span>
                          <p className="text-gray-400 font-medium text-xs text-center leading-snug">Tap to discover what was playing</p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[8px] font-black text-gray-600 uppercase tracking-widest shadow-sm">
                        {formatTravelLogDate(log)}
                      </div>
                    </div>
                    <div className="pt-3 pb-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-green-600 font-black text-xs uppercase tracking-widest">
                        <img
                          src={getFlagUrl(log.countryCode)}
                          alt={log.countryName}
                          className="w-5 h-3 object-cover rounded-sm"
                          referrerPolicy="no-referrer"
                        />
                        {log.countryName}
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xl font-black text-gray-800 leading-tight">{log.cityName}</h4>
                        {profile.showAge !== false && log.age != null && (
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Age {log.age}</span>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        {sortedLogs.length > PAGE_SIZE && (() => {
          const totalPages = Math.ceil(sortedLogs.length / PAGE_SIZE);
          return (
            <div className="flex items-center justify-center gap-3 pt-2 pb-4">
              <button
                onClick={() => { setPage(p => p - 1); scrollToMemories(); }}
                disabled={page === 0}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border-2 border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:border-green-300 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page counter */}
              <span className="text-xs font-black text-gray-400 tracking-widest min-w-[4rem] text-center">
                {page + 1} / {totalPages}
              </span>

              {/* Tablet+: dot navigation */}
              <div className="hidden sm:flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPage(i); scrollToMemories(); }}
                    className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                      i === page
                        ? 'bg-green-500 text-white shadow-[0_3px_0_0_#16a34a]'
                        : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-green-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setPage(p => p + 1); scrollToMemories(); }}
                disabled={(page + 1) * PAGE_SIZE >= sortedLogs.length}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border-2 border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:border-green-300 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })()}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl border-4 border-red-100 shadow-2xl p-6 sm:p-8 max-w-sm w-full space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-2xl mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-800">Delete Memory?</h3>
              <p className="text-sm font-bold text-gray-400">
                This will permanently remove <span className="text-gray-600 font-black">{deleteTarget.cityName}, {deleteTarget.countryName} ({deleteTarget.year})</span> from your travel log.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-3 rounded-2xl transition-all uppercase tracking-widest text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDeleteLog?.(deleteTarget); setDeleteTarget(null); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-2xl shadow-[0_4px_0_0_#b91c1c] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
