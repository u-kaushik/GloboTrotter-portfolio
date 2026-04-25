import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Save, Share2, Lock, CheckCircle2,
  Star, Heart, Lightbulb, Compass, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Itinerary, ItineraryDay } from '../types';
import { countryAlpha2 } from '../lib/countryFlags';

// ─── Activity type detection ──────────────────────────────────────────────────

type ActivityType = 'food' | 'transit' | 'sight' | 'stay' | 'culture' | 'other';

function detectActivityType(text: string): ActivityType {
  const t = text.toLowerCase();
  if (/\b(restaurant|dinner|lunch|breakfast|eat|food|caf[eé]|bistro|trattoria|tapas|sushi|pizza|street food|bar|winery|brewery|tasting|gelato)\b/.test(t)) return 'food';
  if (/\b(check.?in|check.?out|hotel|accommodation|hostel|resort|inn|lodge|airbnb)\b/.test(t)) return 'stay';
  if (/\b(flight|train|bus|taxi|uber|ferry|metro|subway|drive|transfer|depart|arrive|transit|airport|station|rail)\b/.test(t)) return 'transit';
  if (/\b(theater|theatre|concert|opera|performance|show|festival|ceremony|market|tradition|dance|live music|folk)\b/.test(t)) return 'culture';
  if (/\b(visit|museum|gallery|monument|palace|cathedral|church|historic|castle|ruins|temple|landmark|tour|shrine|site|park|gardens?)\b/.test(t)) return 'sight';
  return 'other';
}

const TYPE_EMOJI: Record<ActivityType, string> = {
  food:    '🍽️',
  transit: '🚆',
  sight:   '🏛️',
  stay:    '🏨',
  culture: '🎭',
  other:   '📍',
};

// ─── Time-of-day grouping ─────────────────────────────────────────────────────

function splitActivities(activities: string[]): { label: string; items: string[] }[] {
  const n = activities.length;
  if (n === 0) return [];
  if (n <= 2) return [{ label: '', items: activities }];

  const morningEnd = Math.ceil(n / 3);
  const afternoonEnd = Math.ceil((2 * n) / 3);

  return [
    { label: 'Morning',   items: activities.slice(0, morningEnd) },
    { label: 'Afternoon', items: activities.slice(morningEnd, afternoonEnd) },
    { label: 'Evening',   items: activities.slice(afternoonEnd) },
  ].filter(g => g.items.length > 0);
}

// ─── Refinement chips ─────────────────────────────────────────────────────────

const REFINEMENT_CHIPS = [
  'Make it shorter',
  'More adventurous',
  'Add beach time',
  'Budget-friendlier',
  'More cultural',
  'Kid-friendly',
  'More relaxed',
  'Off the beaten path',
];

// ─── Day Card ─────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: ItineraryDay;
  index: number;
  defaultExpanded: boolean;
  tourTarget?: string;
}

const DayCard: React.FC<DayCardProps> = ({ day, index, defaultExpanded, tourTarget }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const groups = splitActivities(day.activities);
  // Chevron is only needed for long trips where cards start collapsed
  const collapsible = !defaultExpanded;
  const previewLine = day.activities[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, type: 'spring', stiffness: 280, damping: 24 }}
      className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden"
      data-tour={tourTarget}
    >
      {/* Day header */}
      <div
        role={collapsible ? 'button' : undefined}
        onClick={collapsible ? () => setExpanded(e => !e) : undefined}
        className={`px-4 py-4 md:px-5 flex items-start gap-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
          {day.dayNumber}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {countryAlpha2(day.country) && (
              <img
                src={`https://flagcdn.com/w40/${countryAlpha2(day.country)}.png`}
                alt={day.country}
                className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-xs font-black text-stone-400 uppercase tracking-wider">
              {day.country}
            </span>
          </div>
          <div className="font-black text-stone-800 text-base leading-snug">{day.city}</div>
          {/* One-line preview when collapsed */}
          {collapsible && !expanded && previewLine && (
            <p className="text-sm text-stone-400 font-medium mt-1 line-clamp-1">{previewLine}</p>
          )}
        </div>

        {collapsible && (
          <div className="mt-1 shrink-0 text-stone-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Day body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 md:px-5 md:pb-6 space-y-4 border-t border-stone-100 pt-3">
              {groups.map((group) => (
                <div key={group.label || 'activities'}>
                  {group.label && (
                    <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-2.5">
                    {group.items.map((activity, j) => {
                      const type = detectActivityType(activity);
                      return (
                        <div key={j} className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 leading-tight mt-0.5">{TYPE_EMOJI[type]}</span>
                          <span className="text-base text-stone-700 font-medium leading-snug">{activity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {day.interestHighlight && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                  <span className="text-sm font-bold text-teal-700">{day.interestHighlight}</span>
                </div>
              )}

              {day.personalConnection && (
                <div className="flex items-start gap-2">
                  <Heart className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                  <span className="text-sm font-medium text-stone-500 italic">{day.personalConnection}</span>
                </div>
              )}

              {day.localTip && (
                <div className="flex items-start gap-2">
                  <Compass className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-stone-400 italic">{day.localTip}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── ItineraryView ────────────────────────────────────────────────────────────

export interface ItineraryViewProps {
  itinerary: Partial<Itinerary>;
  demoWalkStepId?: string;

  // Navigation — if provided, renders a back button
  onBack?: () => void;

  // Planner actions — omit for read-only (Saved Trip) view
  onSave?: () => void;
  onShare?: () => void;
  onRefine?: (instruction: string) => void;
  saved?: boolean;
  shared?: boolean;
  isRefining?: boolean;
  credits?: number;
  atSaveLimit?: boolean;
  onUpgrade?: () => void;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({
  itinerary,
  onBack,
  onSave,
  onShare,
  onRefine,
  saved = false,
  shared = false,
  isRefining = false,
  credits = 0,
  atSaveLimit = false,
  onUpgrade,
  demoWalkStepId,
}) => {
  const days = itinerary.days || [];
  const totalDays = itinerary.totalDays || days.length;
  const longTrip = totalDays > 5;

  // Build unique country → cities map for hero card
  const countryMap = new Map<string, string[]>();
  days.forEach(d => {
    const cities = countryMap.get(d.country) || [];
    if (!cities.includes(d.city)) cities.push(d.city);
    countryMap.set(d.country, cities);
  });
  const countryEntries = Array.from(countryMap.entries());
  const countryCount = itinerary.countries?.length || countryEntries.length;

  useEffect(() => {
    if (!demoWalkStepId) return;

    const targetMap: Record<string, string | undefined> = {
      plannerSummary: 'planner-summary',
      plannerDay1: 'planner-day-1',
      plannerDay2: 'planner-day-2',
      plannerDay3: 'planner-day-3',
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
  }, [demoWalkStepId, days.length]);

  return (
    <div className="lg:max-w-[560px] lg:mx-auto space-y-3">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* ─── Hero card ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-stone-200 rounded-xl shadow-sm"
        data-tour={demoWalkStepId ? 'planner-summary' : undefined}
      >
        <div className="px-4 py-5 md:px-5 md:py-6">
          {/* Country flags row */}
          {countryEntries.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3">
              {countryEntries.map(([country], i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {countryAlpha2(country) && (
                    <img
                      src={`https://flagcdn.com/w40/${countryAlpha2(country)}.png`}
                      alt={country}
                      className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="text-xs font-black text-stone-500 uppercase tracking-wider">{country}</span>
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl font-black text-stone-800 leading-snug mb-1">{itinerary.title}</h2>

          {/* Summary */}
          {itinerary.summary && (
            <p className="text-sm text-stone-500 font-medium leading-relaxed mb-4">{itinerary.summary}</p>
          )}

          {/* Meta badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="bg-stone-100 text-stone-600 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wide">
              {totalDays} {totalDays === 1 ? 'day' : 'days'}
            </span>
            <span className="bg-stone-100 text-stone-600 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wide">
              {countryCount} {countryCount === 1 ? 'country' : 'countries'}
            </span>
          </div>

          {/* Save / Share buttons (planner only) */}
          {(onSave || onShare) && (
            <div className="flex gap-2 mb-4">
              {onSave && (
                atSaveLimit ? (
                  <button
                    onClick={onUpgrade}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] hover:bg-stone-700"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Go Pro to Save
                  </button>
                ) : (
                  <button
                    onClick={onSave}
                    disabled={saved}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] ${
                      saved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-800 text-white hover:bg-stone-700'
                    }`}
                  >
                    {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {saved ? 'Saved!' : 'Save trip'}
                  </button>
                )
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shared ? 'Copied!' : 'Share'}
                </button>
              )}
            </div>
          )}

          {/* Refinement chips (planner only) */}
          {onRefine && (
            <div className={`transition-opacity duration-200 ${isRefining ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                {isRefining && (
                  <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest">
                  {isRefining ? 'Refining…' : 'Tune it up'}
                </span>
                {!isRefining && (
                  <span className="text-xs text-stone-300 font-bold">· 1 fuel each</span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {REFINEMENT_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => onRefine(chip)}
                    disabled={isRefining || credits <= 0}
                    className="shrink-0 px-3.5 py-2 rounded-full bg-stone-50 hover:bg-teal-50 hover:text-teal-700 border border-stone-200 hover:border-teal-200 text-stone-600 font-bold text-xs transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Goal progress callout */}
      {itinerary.goalProgress && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-sm font-bold text-amber-700">{itinerary.goalProgress}</span>
        </motion.div>
      )}

      {/* ─── Day cards ──────────────────────────────────────────────────────── */}
      {days.map((day, i) => (
        <DayCard
          key={i}
          day={day}
          index={i}
          defaultExpanded={!longTrip}
          tourTarget={demoWalkStepId ? `planner-day-${i + 1}` : undefined}
        />
      ))}
    </div>
  );
};

export default ItineraryView;
