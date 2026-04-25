import React, { useEffect } from 'react';
import { Trophy, Star, Lock, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { UserProfile, TravelLog } from '../types';
import { BADGES, LEVELS, ISLAND_NATIONS, MILESTONE_AGES } from '../constants/gamification';
import { cn } from '../lib/utils';

interface RewardsProps {
  profile: UserProfile;
  logs: TravelLog[];
  demoWalkStepId?: string;
  demoHighlightBadgeId?: string | null;
  onDemoWalkAdvance?: (stepId: string) => void;
}

const Rewards: React.FC<RewardsProps> = ({ profile, logs, demoWalkStepId, demoHighlightBadgeId, onDemoWalkAdvance }) => {
  const [selectedBadge, setSelectedBadge] = React.useState<any>(null);
  const demoBadgeAutoClosedRef = React.useRef<string | null>(null);
  const currentXp = profile.xp;
  const currentLevel = profile.level;
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
  const currentLevelDef = LEVELS.find(l => l.level === currentLevel);
  
  const xpInCurrentLevel = currentXp - (currentLevelDef?.xpRequired || 0);
  const xpNeededForNext = nextLevel ? nextLevel.xpRequired - (currentLevelDef?.xpRequired || 0) : 100;
  const progress = Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);

  // Badge Logic
  const uniqueCountries = new Set(logs.map(l => l.countryCode)).size;
  const totalCities = logs.length;
  const photosCount = logs.filter(l => l.photoUrl).length;
  const yearsCount = new Set(logs.map(l => l.year)).size;
  const earlyBird = logs.some(l => l.age < 10);

  const getBadgeProgress = (badgeId: string) => {
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return { earned: false, progress: 0, current: 0, target: 1, unit: '', tier: null };

    let value = 0;
    let unit = '';
    let hasAntarctica = false;

    switch (badgeId) {
      case 'explorer':
        value = 1;
        unit = 'Joined';
        break;
      case 'cities':
        value = totalCities;
        unit = 'Cities';
        break;
      case 'countries':
        value = uniqueCountries;
        unit = 'Countries';
        break;
      case 'photos':
        value = photosCount;
        unit = 'Photos';
        break;
      case 'early_bird':
        value = earlyBird ? 1 : 0;
        unit = 'Early Bird';
        break;
      case 'loyalty':
        value = yearsCount;
        unit = 'Years';
        break;
      case 'decades':
        value = new Set(logs.map(l => Math.floor(l.year / 10))).size;
        unit = 'Decades';
        break;
      case 'golden_voyager':
        value = logs.some(l => l.age >= 70) ? 1 : 0;
        unit = 'Golden Voyager';
        break;
      case 'duration':
        value = Math.max(0, ...logs.map(l => l.duration || 0));
        unit = 'Days';
        break;
      case 'continents':
        value = new Set(logs.map(l => l.continent)).size;
        unit = 'Continents';
        break;
      case 'referrals':
        value = profile.referralCount || 0;
        unit = 'Referrals';
        break;
      case 'weekend_warrior':
        value = logs.filter(l => l.duration && l.duration <= 3).length;
        unit = 'Short Trips';
        break;
      case 'island_hopper':
        value = new Set(logs.filter(l => ISLAND_NATIONS.has(l.countryName)).map(l => l.countryName)).size;
        unit = 'Islands';
        break;
      case 'milestone_trip':
        value = new Set(logs.filter(l => l.age && MILESTONE_AGES.includes(l.age)).map(l => l.age)).size;
        unit = 'Milestones';
        break;
      case 'home_explorer':
        value = logs.filter(l => l.countryName === profile.homeCountry).length;
        unit = 'Home Trips';
        break;
      case 'jet_setter': {
        const countriesByYear: Record<number, Set<string>> = {};
        logs.forEach(l => {
          if (!countriesByYear[l.year]) countriesByYear[l.year] = new Set();
          countriesByYear[l.year].add(l.countryCode);
        });
        value = Math.max(0, ...Object.values(countriesByYear).map(s => s.size));
        unit = 'Countries/Year';
        break;
      }
      case 'antarctica':
        hasAntarctica = logs.some(l => l.continent === 'Antarctica');
        value = hasAntarctica ? 1 : 0;
        unit = 'Antarctica';
        break;
      case 'extreme_explorer': {
        hasAntarctica = logs.some(l => l.continent === 'Antarctica');
        const continentCount = new Set(logs.map(l => l.continent)).size;
        value = continentCount;
        unit = 'Antarctica + 5 Continents';
        break;
      }
    }

    // Find the current tier
    // A tier is "current" if the user hasn't completed it yet, 
    // or if it's the last tier and they have completed it.
    let currentTierIndex = badge.tiers.findIndex(t => value < t.target);
    if (currentTierIndex === -1) {
      currentTierIndex = badge.tiers.length - 1;
    }

    const currentTier = badge.tiers[currentTierIndex];
    const earned = badgeId === 'extreme_explorer'
      ? (value >= currentTier.target && hasAntarctica)
      : value >= currentTier.target;
    const progress = Math.min(100, (value / currentTier.target) * 100);

    return { 
      earned, 
      progress, 
      current: Math.min(value, currentTier.target), 
      target: currentTier.target, 
      unit,
      tier: currentTier,
      totalValue: value
    };
  };

  const earnedBadgesCount = BADGES.filter(b => getBadgeProgress(b.id).earned).length;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return 'text-orange-600';
      case 'Silver': return 'text-slate-500';
      case 'Gold': return 'text-yellow-600';
      case 'Platinum': return 'text-cyan-500';
      case 'Diamond': return 'text-indigo-600';
      default: return 'text-gray-400';
    }
  };

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

  const getTierBarColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return 'bg-orange-400';
      case 'Silver': return 'bg-slate-400';
      case 'Gold': return 'bg-yellow-400';
      case 'Platinum': return 'bg-cyan-400';
      case 'Diamond': return 'bg-indigo-500';
      default: return 'bg-yellow-400';
    }
  };

  const currentTier = currentLevelDef?.tier || 'Bronze';

  const TIER_STYLES: Record<string, { headerBg: string; timelineBg: string; headerText: string; borderColor: string; barColor: string; levelBg: string; barLight: string }> = {
    Bronze: { headerBg: 'bg-gradient-to-br from-orange-400 to-orange-600', timelineBg: 'bg-orange-200', headerText: 'text-white', borderColor: 'border-orange-200', barColor: 'bg-orange-400', levelBg: 'bg-orange-400', barLight: 'bg-orange-50' },
    Silver: { headerBg: 'bg-gradient-to-br from-slate-300 to-slate-500', timelineBg: 'bg-slate-200', headerText: 'text-white', borderColor: 'border-slate-300', barColor: 'bg-slate-400', levelBg: 'bg-slate-400', barLight: 'bg-slate-50' },
    Gold: { headerBg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', timelineBg: 'bg-yellow-200', headerText: 'text-white', borderColor: 'border-yellow-300', barColor: 'bg-yellow-400', levelBg: 'bg-yellow-400', barLight: 'bg-yellow-50' },
    Platinum: { headerBg: 'bg-gradient-to-br from-cyan-400 to-cyan-600', timelineBg: 'bg-cyan-200', headerText: 'text-white', borderColor: 'border-cyan-300', barColor: 'bg-cyan-400', levelBg: 'bg-cyan-400', barLight: 'bg-cyan-50' },
    Diamond: { headerBg: 'bg-gradient-to-br from-indigo-500 to-indigo-700', timelineBg: 'bg-indigo-200', headerText: 'text-white', borderColor: 'border-indigo-300', barColor: 'bg-indigo-500', levelBg: 'bg-indigo-500', barLight: 'bg-indigo-50' },
  };

  const tierOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
  const groupedLevels = tierOrder.map(tier => ({
    tier,
    levels: LEVELS.filter(l => l.tier === tier),
  }));

  useEffect(() => {
    if (!demoWalkStepId) return;

    const targetMap: Record<string, string | undefined> = {
      rewardsLevel: 'rewards-level',
      rewardsSummary: 'rewards-summary',
      rewardsAchievements: 'rewards-achievements',
      rewardsBadgeOpen: 'rewards-badge-close',
      rewardsRoadmap: 'rewards-roadmap',
    };

    const targetDataTour = targetMap[demoWalkStepId];
    if (!targetDataTour) return;

    const scrollTarget = () => {
      const target = document.querySelector(`[data-tour="${targetDataTour}"]`) as HTMLElement | null;
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    const raf = window.requestAnimationFrame(scrollTarget);
    const timeout = window.setTimeout(scrollTarget, 160);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [demoWalkStepId]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12 pb-32 lg:pb-8">
      {/* Level Progression */}
      <section className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border-4 border-gray-100 shadow-2xl relative overflow-hidden" data-tour="rewards-level">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50 rounded-bl-full -z-10 opacity-50" />
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <div className={`w-24 h-24 md:w-32 md:h-32 ${getTierBg(currentTier)} rounded-3xl rotate-12 flex items-center justify-center shadow-xl`}>
              <span className="text-4xl md:text-5xl font-black text-white -rotate-12">{currentLevel}</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-2 -right-2 md:-top-4 md:-right-4 bg-white p-2 rounded-full shadow-lg"
            >
              <Zap className={cn("w-5 h-5 md:w-6 md:h-6", getTierColor(currentTier), "fill-current")} />
            </motion.div>
          </div>

          <div className="flex-1 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
              <h2 className="text-2xl md:text-3xl font-black text-gray-800">
                {currentLevelDef?.title || 'Wanderer'}
              </h2>
              <span className={cn("text-[10px] md:text-sm font-black uppercase tracking-widest", getTierColor(currentTier))}>
                • {currentTier} Tier
              </span>
            </div>
            <p className="text-sm md:text-base text-gray-500 font-bold mb-6">
              {nextLevel ? `${nextLevel.xpRequired - currentXp} XP until ${nextLevel.title}` : 'Max Level Reached!'}
            </p>
            
            <div className="w-full bg-gray-100 h-4 md:h-6 rounded-full overflow-hidden border-2 border-gray-50 p-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn("h-full rounded-full shadow-inner", getTierBarColor(currentTier))}
              />
            </div>
            <div className="grid grid-cols-3 mt-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span className="text-left">LVL {currentLevel}</span>
              <span className="text-center">{currentXp} / {nextLevel?.xpRequired || 'MAX'} XP</span>
              <span className="text-right">LVL {nextLevel ? currentLevel + 1 : 'MAX'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Achievement Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="rewards-summary">
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm text-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Badges</div>
          <div className="text-2xl font-black text-green-600">{earnedBadgesCount} / {BADGES.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm text-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Countries</div>
          <div className="text-2xl font-black text-blue-600">{uniqueCountries}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm text-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cities</div>
          <div className="text-2xl font-black text-orange-600">{totalCities}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm text-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Photos</div>
          <div className="text-2xl font-black text-purple-600">{photosCount}</div>
        </div>
      </div>

      {/* Badges Grid */}
      <section className="space-y-8" data-tour="rewards-achievements">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Achievements</h2>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {Math.round((earnedBadgesCount / BADGES.length) * 100)}% Complete
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {BADGES.map((badge, i) => {
            const { earned, progress: badgeProgress, current, target, unit, tier } = getBadgeProgress(badge.id);
            if (!tier) return null;
            const isHighlightedDemoBadge = demoWalkStepId === 'rewardsAchievements' && badge.id === demoHighlightBadgeId;

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  if (demoWalkStepId === 'rewardsAchievements' && isHighlightedDemoBadge) {
                    confetti({
                      particleCount: 120,
                      spread: 72,
                      origin: { y: 0.58 },
                      colors: ['#10b981', '#34d399', '#f59e0b', '#6366f1', '#ec4899'],
                    });
                    onDemoWalkAdvance?.('rewardsBadgeOpen');
                  }
                  setSelectedBadge({ ...badge, ...getBadgeProgress(badge.id) });
                }}
                className={cn(
                  "relative p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-4 transition-all group overflow-hidden cursor-pointer",
                  earned 
                    ? "bg-white border-gray-100 shadow-xl hover:border-green-200" 
                    : "bg-gray-50 border-gray-100 opacity-80"
                )}
                data-tour={isHighlightedDemoBadge ? 'rewards-badge-continents' : undefined}
              >
                {/* Progress Background */}
                {!earned && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-gray-200 transition-all duration-1000"
                    style={{ width: `${badgeProgress}%` }}
                  />
                )}

                <div className="flex items-start gap-4 md:gap-5 relative z-10">
                  <div className={cn(
                    "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110",
                    earned ? badge.color : "bg-gray-200 grayscale"
                  )}>
                    <badge.icon className={cn("w-6 h-6 md:w-8 md:h-8", earned ? "text-white" : "text-gray-400")} />
                  </div>
                  
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn(
                        "font-black uppercase tracking-tight text-sm md:text-base truncate",
                        earned ? "text-gray-800" : "text-gray-400"
                      )}>
                        {tier.title}
                      </h3>
                      {earned && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-500 leading-relaxed line-clamp-1">
                      {tier.description}
                    </p>
                    
                    <div className="pt-3 flex items-center justify-between gap-4">
                      <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", earned ? "bg-green-500" : "bg-gray-300")}
                          style={{ width: `${badgeProgress}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap truncate max-w-[8rem]",
                        earned ? "text-green-600" : "text-gray-400"
                      )}>
                        {current} / {target} {unit}
                      </span>
                    </div>
                  </div>
                </div>
                
                {!earned && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-300" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Badge Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedBadge(null);
                if (demoWalkStepId === 'rewardsBadgeOpen' && demoBadgeAutoClosedRef.current !== demoHighlightBadgeId) {
                  demoBadgeAutoClosedRef.current = demoHighlightBadgeId || null;
                  onDemoWalkAdvance?.('rewardsRoadmap');
                }
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-10 max-w-md w-full shadow-2xl border-4 border-gray-50 overflow-y-auto max-h-[80vh]"
            >
              <div className={cn(
                "absolute top-0 left-0 right-0 h-32 -z-10 opacity-10",
                selectedBadge.earned ? selectedBadge.color : "bg-gray-300"
              )} />

              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <div className={cn(
                  "w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl rotate-3 transition-transform hover:rotate-0",
                  selectedBadge.earned ? selectedBadge.color : "bg-gray-300 grayscale"
                )}>
                  <selectedBadge.icon className={cn("w-8 h-8 sm:w-12 sm:h-12", selectedBadge.earned ? "text-white" : "text-gray-400")} />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl sm:text-3xl font-black text-gray-800 uppercase tracking-tight">{selectedBadge.tier.title}</h2>
                    {selectedBadge.earned && <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />}
                  </div>
                  <p className="text-sm sm:text-base text-gray-500 font-bold leading-relaxed">{selectedBadge.tier.description}</p>
                </div>

                <div className="w-full space-y-3 sm:space-y-4">
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Requirement</div>
                    <div className="text-xs sm:text-sm font-black text-gray-700">{selectedBadge.tier.requirement}</div>
                  </div>

                  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-100">
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</div>
                      <div className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                        {selectedBadge.current} / {selectedBadge.target} {selectedBadge.unit}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedBadge.progress}%` }}
                        className={cn("h-full", selectedBadge.earned ? "bg-green-500" : "bg-yellow-400")}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    if (demoWalkStepId === 'rewardsBadgeOpen' && demoBadgeAutoClosedRef.current !== demoHighlightBadgeId) {
                      demoBadgeAutoClosedRef.current = demoHighlightBadgeId || null;
                      onDemoWalkAdvance?.('rewardsRoadmap');
                    }
                  }}
                  data-tour="rewards-badge-close"
                  className="w-full bg-gray-800 text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-gray-900 transition-all uppercase tracking-widest shadow-lg text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Future Levels Roadmap */}
      <section className="space-y-8" data-tour="rewards-roadmap">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Traveler Roadmap</h2>
        </div>

        <div className="space-y-8">
          {groupedLevels.map(({ tier, levels }) => {
            const style = TIER_STYLES[tier];
            const tierCompleted = levels.every(l => l.level < currentLevel);
            const tierActive = levels.some(l => l.level === currentLevel);

            return (
              <div key={tier} className="relative">
                {/* Tier Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs shadow-sm", style.headerBg, style.headerText)}>
                    {tier}
                  </div>
                  <div className={cn("flex-1 h-0.5 rounded-full", style.timelineBg)} />
                  {tierCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {tierActive && <Zap className={cn("w-4 h-4 shrink-0", getTierColor(tier))} />}
                </div>

                {/* Tier Timeline */}
                <div className="relative pl-4">
                  <div className={cn("absolute left-5 md:left-6 top-0 bottom-0 w-0.5", style.timelineBg)} />

                  <div className="space-y-3">
                    {levels.map((lvl) => {
                      const isCurrent = lvl.level === currentLevel;
                      const isCompleted = lvl.level < currentLevel;
                      const isLocked = lvl.level > currentLevel;

                      return (
                        <div
                          key={lvl.level}
                          className={cn(
                            "flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all relative",
                            isCurrent ? `${style.barLight} ${style.borderColor} shadow-md scale-[1.02] z-10 ml-2` : isLocked ? `bg-white border-gray-100 ml-6` : `bg-white ${style.borderColor} ml-6`,
                            isLocked && "opacity-60"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center font-black text-sm md:text-lg shadow-sm shrink-0",
                            isCompleted ? "bg-green-500 text-white" :
                            isCurrent ? `${style.levelBg} text-white` : "bg-gray-100 text-gray-400"
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6" /> : lvl.level}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "font-black uppercase tracking-tight text-sm md:text-base",
                              isLocked ? "text-gray-400" : "text-gray-800"
                            )}>
                              {lvl.title}
                            </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {lvl.xpRequired} XP
                      </p>
                      {(isCurrent || lvl.level === currentLevel + 1) && (
                        <p className="text-[9px] md:text-[10px] font-black text-yellow-600 uppercase tracking-widest whitespace-nowrap">
                          {lvl.xpRequired - currentXp} to go
                        </p>
                      )}
                    </div>
                          </div>

                          {isCurrent && (
                            <div className="bg-yellow-400 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap shrink-0">
                              Current
                            </div>
                          )}

                          {isLocked && <Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-300 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Rewards;
