import React, { useState, useEffect } from 'react';
import {
  Sparkles, MapPin, Target, Coffee, DollarSign,
  ArrowLeft, X, Clock,
  ChevronRight, Flame, Globe as GlobeIcon, Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSmartItinerary, refineItinerary, PlannerIntent } from '../services/aiService';
import ItineraryView from './ItineraryView';
import { friendlyCountryName } from '../lib/countryNames';
import { trackEvent } from '../services/analytics';
import { Itinerary, ItineraryDay, TravelDna, UserProfile } from '../types';
import { countryAlpha2 } from '../lib/countryFlags';
import { isDemoMode } from '../lib/demoMode';
import { DEMO_ONBOARDING_ACTIVE_KEY, DEMO_ONBOARDING_ITINERARY } from '../lib/demoOnboarding';

type Phase = 'cards' | 'preferences' | 'generating' | 'result';

interface ItineraryPlannerProps {
  onSave: (itinerary: Partial<Itinerary>) => void;
  savedItineraries: Itinerary[];
  credits: number;
  travelDna: TravelDna | null;
  profile: UserProfile;
  tripCount: number;
  onGlobePaint?: () => void;
  onFuelUsed?: () => void;
  isPro: boolean;
  onUpgrade: () => void;
  onViewMyTrips?: () => void;
  demoWalkStepId?: string;
  onDemoWalkAdvance?: (stepId: string) => void;
}

const FREE_SAVE_LIMIT = 3;

const PROMPT_CARDS = [
  { intent: 'surprise' as PlannerIntent, icon: Sparkles, label: 'Surprise Me', desc: 'Let AI pick — you just pack', gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 border-emerald-200', accent: 'text-emerald-600' },
  { intent: 'destination' as PlannerIntent, icon: MapPin, label: 'I Know Where', desc: 'Got a place in mind? Let\'s plan it out', gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-50 border-blue-200', accent: 'text-blue-600' },
  { intent: 'goal' as PlannerIntent, icon: Target, label: 'Complete a Goal', desc: 'Tick something off that bucket list', gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-50 border-amber-200', accent: 'text-amber-600' },
  { intent: 'weekend' as PlannerIntent, icon: Coffee, label: 'Weekend Getaway', desc: 'A quick escape — you deserve it', gradient: 'from-purple-500 to-fuchsia-600', light: 'bg-purple-50 border-purple-200', accent: 'text-purple-600' },
  { intent: 'budget' as PlannerIntent, icon: DollarSign, label: 'Budget Friendly', desc: 'Big adventures, small spend', gradient: 'from-teal-500 to-cyan-600', light: 'bg-teal-50 border-teal-200', accent: 'text-teal-600' },
];

const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({ onSave, savedItineraries, credits, travelDna, profile, tripCount, onGlobePaint, onFuelUsed, isPro, onUpgrade, onViewMyTrips, demoWalkStepId, onDemoWalkAdvance }) => {
  const atSaveLimit = !isPro && savedItineraries.length >= FREE_SAVE_LIMIT;
  // Load last itinerary from localStorage on mount to persist across navigation
  useEffect(() => {
    if (demoWalkStepId) return;
    try {
      const raw = localStorage.getItem('gt_last_itinerary');
      if (raw) {
        const last = JSON.parse(raw);
        if (last && (last.title || last.days)) {
          setResult(last);
          setPhase('result');
        }
      }
    } catch {
      // ignore parsing errors
    }
  }, [demoWalkStepId]);

  const [phase, setPhase] = useState<Phase>('cards');
  const [intent, setIntent] = useState<PlannerIntent | null>(null);
  const [destination, setDestination] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [duration, setDuration] = useState(travelDna?.avgDuration || 7);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<Itinerary | null>(null);
  const [dismissedGate, setDismissedGate] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const showPlannerIntro = demoWalkStepId === 'plannerIntro';
  const lockToSurpriseMe = demoWalkStepId === 'plannerCards';

  // Show Globe Paint interstitial for new users with fewer than 3 logged trips
  const showGate = !isDemoMode() && !dismissedGate && !profile.historyOnboarded && onGlobePaint && tripCount < 3;

  const dna: TravelDna = travelDna || {
    visitedCountries: [],
    visitedCities: [],
    coveredContinents: [],
    missingContinents: ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'],
    totalCountries: 0,
    avgDuration: 7,
    mostVisitedContinent: 'None',
    interests: profile.interests || [],
    travelGoals: profile.travelGoals || [],
    homeCountry: friendlyCountryName(profile.homeCountry || 'Unknown'),
    displayName: profile.displayName,
  };

  const genMessages = [
    dna.totalCountries > 0 ? `Checking out your ${dna.totalCountries} countries...` : 'Getting to know your travel vibe...',
    dna.interests.length > 0 ? `You love ${dna.interests.slice(0, 2).join(' & ')} — noted!` : 'Hunting down the perfect spots...',
    'Almost there — this one\'s gonna be good...',
  ];

  const handleCardClick = (selectedIntent: PlannerIntent) => {
    setIntent(selectedIntent);
    setError(null);
    setSaved(false);
    trackEvent('Planner Card Click', { intent: selectedIntent });
    if (selectedIntent === 'surprise') {
      handleGenerate(selectedIntent);
    } else {
      setPhase('preferences');
    }
  };

  const handleGenerate = async (overrideIntent?: PlannerIntent) => {
    const finalIntent = overrideIntent || intent;
    if (!finalIntent) return;
    if (credits <= 0) {
      setError('You\'re out of fuel! Top up in Settings to keep planning.');
      return;
    }

    const isDemo = isDemoMode();
    const isDemoPlannerFlow = isDemo && Boolean(onDemoWalkAdvance) && (demoWalkStepId === 'plannerCards' || demoWalkStepId === 'plannerGenerate');

    trackEvent('Planner Generate Start', { intent: finalIntent, destination, duration, goal: finalIntent === 'goal' ? selectedGoal : undefined });
    setPhase('generating');
    setGenStep(0);
    setError(null);
    setSaved(false);
    if (isDemoPlannerFlow && demoWalkStepId === 'plannerCards') {
      onDemoWalkAdvance?.('plannerGenerate');
    }

    const stepInterval = setInterval(() => {
      setGenStep(prev => prev < genMessages.length - 1 ? prev + 1 : prev);
    }, 1500);

    try {
      let itinerary: any;
      
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const onboardingActive = localStorage.getItem(DEMO_ONBOARDING_ACTIVE_KEY) === 'true';
        itinerary = onboardingActive
          ? { ...DEMO_ONBOARDING_ITINERARY }
          : generateMockItinerary(finalIntent, destination, duration, selectedGoal, dna);
      } else {
        itinerary = await generateSmartItinerary({
          intent: finalIntent,
          dna,
          destination: finalIntent === 'destination' ? destination : undefined,
          duration,
          goal: finalIntent === 'goal' ? selectedGoal : undefined,
        });
      }
      
      setResult(itinerary);
      onFuelUsed?.();
      if (isDemoPlannerFlow) {
        onDemoWalkAdvance?.('plannerSummary');
      }
      trackEvent('Planner Generated', {
        title: itinerary.title,
        days: itinerary.days?.length || 0,
        countries: itinerary.countries?.length || 0,
      });
      try {
        localStorage.setItem('gt_last_itinerary', JSON.stringify(itinerary));
      } catch {}
      setPhase('result');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg === 'INSUFFICIENT_FUEL') {
        setError("You're out of fuel! Top up in Settings to keep planning.");
      } else {
        setError(`Failed to generate: ${msg}`);
      }
      trackEvent('Planner Generation Failed', { error: msg, intent: finalIntent });
      setPhase(finalIntent === 'surprise' ? 'cards' : 'preferences');
    } finally {
      clearInterval(stepInterval);
    }
  };

  const handleSave = () => {
    if (!result) return;
    onSave(result);
    setSaved(true);
    trackEvent('Itinerary Saved', { title: result.title, days: result.days?.length || 0, destinations: result.destinations?.length || 0 });
  };

  const handleShare = async () => {
    if (!result) return;
    const days = result.days || [];
    const shareText = [
      result.title,
      '',
      result.summary,
      '',
      ...days.map((d: ItineraryDay) => `Day ${d.dayNumber}: ${d.city}, ${d.country}`),
      '',
      'Planned with GloboTrotter',
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: result.title, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
      trackEvent('Itinerary Shared', { days: days.length, destinations: result.destinations?.length || 0 });
    } catch { /* user cancelled share */ }
  };

  const resetPlanner = () => {
    setPhase('cards');
    setIntent(null);
    setDestination('');
    setSelectedGoal('');
    setDuration(dna.avgDuration || 7);
    setResult(null);
    setError(null);
    setSaved(false);
    // Clear persisted itinerary
    try { localStorage.removeItem('gt_last_itinerary'); } catch {}
  };

  const handleRefine = async (instruction: string) => {
    if (!result || isRefining || credits <= 0) return;
    setIsRefining(true);
    setError(null);
    try {
      const refined = await refineItinerary(result, instruction);
      setResult(refined);
      setSaved(false);
      onFuelUsed?.();
      trackEvent('Itinerary Refined', { instruction, days: refined.days?.length || 0 });
      try { localStorage.setItem('gt_last_itinerary', JSON.stringify(refined)); } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg === 'INSUFFICIENT_FUEL') {
        setError("You're out of fuel! Top up in Settings to keep planning.");
      } else {
        setError(`Refinement failed: ${msg}`);
      }
    } finally {
      setIsRefining(false);
    }
  };

  if (showGate) {
    return (
      <div className="max-w-md mx-auto p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <GlobeIcon className="w-10 h-10 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">First things first!</h2>
            <p className="text-gray-500 font-bold text-sm leading-relaxed">
              Show us where you've been and we'll plan trips that actually get you. Takes about 60 seconds — totally worth it.
            </p>
          </div>
          <button
            onClick={onGlobePaint}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3"
          >
            <GlobeIcon className="w-5 h-5" />
            Let's do it
          </button>
          <button
            onClick={() => setDismissedGate(true)}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors"
          >
            Nah, skip for now
          </button>
        </motion.div>
      </div>
    );
  }

  if (showPlannerIntro) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 min-h-[70vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-xl bg-white rounded-[2rem] shadow-[0_24px_80px_rgba(15,23,42,0.16)] border-2 border-teal-100 p-8 md:p-10 text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-teal-600">Planner</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight">
              Ready to make the next getaway?
            </h2>
            <p className="text-base md:text-lg text-gray-500 font-semibold leading-relaxed max-w-lg mx-auto">
              We’ll take the Kyoto energy, feed it into the planner, and let the fake AI build the next trip in a few playful beats.
            </p>
          </div>
          <button
            onClick={() => {
              setPhase('cards');
              onDemoWalkAdvance?.('plannerCards');
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-lg active:scale-[0.98] transition-transform"
          >
            Let’s Explore
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-8 pb-24 lg:pb-6">
      {/* Header with fuel gauge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800">
              {phase === 'result' ? 'Your Trip' : 'Plan a Trip'}
            </h1>
            <p className="text-sm text-gray-400 font-bold mt-1">
              {phase === 'cards' && 'Pick your vibe, we\'ll handle the rest'}
              {phase === 'preferences' && 'Dial it in just how you like'}
              {phase === 'generating' && 'Cooking up something good...'}
              {phase === 'result' && (result?.countries?.length ? `${result.countries.length} countries, ${result.totalDays} days — let's go!` : '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onViewMyTrips && savedItineraries.length > 0 && (
            <button
              onClick={onViewMyTrips}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] whitespace-nowrap"
            >
              My Trips ({savedItineraries.length})
            </button>
          )}
          <div className="flex items-center gap-2 bg-teal-50 px-3 py-2 rounded-xl border-2 border-teal-100 shrink-0">
            <Flame className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-black text-teal-600 uppercase tracking-widest">{credits} Fuel</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border-2 border-red-100 text-red-600 text-sm font-bold p-4 rounded-2xl flex items-center gap-3"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* PHASE 1: Prompt Cards */}
        {phase === 'cards' && (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {PROMPT_CARDS.map((card, i) => (
              <motion.button
                key={card.intent}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => {
                  if (lockToSurpriseMe && card.intent !== 'surprise') return;
                  handleCardClick(card.intent);
                }}
                disabled={credits <= 0 || (lockToSurpriseMe && card.intent !== 'surprise')}
                data-tour={card.intent === 'surprise' ? 'planner-surprise' : undefined}
                aria-disabled={lockToSurpriseMe && card.intent !== 'surprise'}
                className={`${lockToSurpriseMe && card.intent === 'surprise' ? 'bg-white border-teal-300' : card.light} border-2 p-5 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed group ${
                  card.intent === 'surprise' ? 'sm:col-span-2' : ''
                } ${
                  lockToSurpriseMe && card.intent !== 'surprise'
                    ? 'opacity-35 saturate-50 grayscale pointer-events-none'
                    : 'disabled:opacity-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-black text-base ${lockToSurpriseMe && card.intent === 'surprise' ? 'text-emerald-700' : card.accent}`}>{card.label}</div>
                    <div className={`text-xs font-medium mt-0.5 ${lockToSurpriseMe && card.intent === 'surprise' ? 'text-slate-600' : 'text-gray-500'}`}>
                      {card.intent === 'weekend' ? `Quick escape from ${friendlyCountryName(dna.homeCountry || 'home')}` : card.desc}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* PHASE 2: Preferences */}
        {phase === 'preferences' && intent && (
          <motion.div
            key="prefs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <button
              onClick={() => { setPhase('cards'); setIntent(null); }}
              className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Destination input */}
            {intent === 'destination' && (
              <div>
                <label className="text-sm font-black text-gray-700 uppercase tracking-widest mb-2 block">Where are we going?</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  className="w-full bg-white p-4 rounded-2xl border-2 border-gray-200 outline-none font-bold text-gray-900 placeholder-gray-400 focus:border-teal-400 transition-all"
                  autoFocus
                />
              </div>
            )}

            {/* Goal selector */}
            {intent === 'goal' && (
              <div>
                <label className="text-sm font-black text-gray-700 uppercase tracking-widest mb-3 block">What are we ticking off?</label>
                {dna.travelGoals.length > 0 ? (
                  <div className="space-y-2">
                    {dna.travelGoals.map((goal, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedGoal(goal)}
                        className={`w-full text-left p-4 rounded-2xl border-2 font-bold transition-all ${
                          selectedGoal === goal
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Target className={`w-4 h-4 ${selectedGoal === goal ? 'text-amber-500' : 'text-gray-400'}`} />
                          {goal}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 font-medium">No goals yet — head to Settings and add a few!</p>
                )}
              </div>
            )}

            {/* Duration slider */}
            <div>
              <label className="text-sm font-black text-gray-700 uppercase tracking-widest mb-2 block">
                How many days? <span className="text-teal-500 normal-case tracking-normal">{duration} days</span>
              </label>
              <input
                type="range"
                min={2}
                max={21}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1">
                <span>2 days</span>
                <span>21 days</span>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={() => handleGenerate()}
              disabled={
                credits <= 0 ||
                (intent === 'destination' && !destination.trim()) ||
                (intent === 'goal' && !selectedGoal)
              }
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-black py-4 rounded-2xl shadow-lg disabled:shadow-none active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 whitespace-nowrap"
            >
              <Sparkles className="w-5 h-5" />
              {credits <= 0 ? 'Out of Fuel!' : 'Make it happen (2 Fuel)'}
            </button>
          </motion.div>
        )}

        {/* PHASE 3: Generating Animation */}
        {phase === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 space-y-8"
            data-tour={demoWalkStepId === 'plannerGenerate' ? 'planner-loading' : undefined}
          >
            <div className="relative">
              <div className="w-20 h-20 border-[6px] border-teal-100 border-t-teal-500 rounded-full animate-spin" />
              <Compass className="w-8 h-8 text-teal-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={genStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-bold text-gray-600 text-center"
              >
                {genMessages[genStep]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* PHASE 4: Result — card-stack via ItineraryView */}
        {phase === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <button
              onClick={resetPlanner}
              className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Plan something else
            </button>

            <ItineraryView
              itinerary={result}
              onSave={handleSave}
              onShare={handleShare}
              onRefine={handleRefine}
              saved={saved}
              shared={shared}
              isRefining={isRefining}
              credits={credits}
              atSaveLimit={atSaveLimit}
              onUpgrade={onUpgrade}
              demoWalkStepId={demoWalkStepId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Itineraries */}
      {phase !== 'generating' && savedItineraries.length > 0 && (
      <section className="space-y-4 pt-4 border-t-2 border-gray-100">
          <h2 className="text-lg font-black text-gray-800">Saved trips</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedItineraries.map((plan) => {
              // Build unique city pills from days (city + country) or destinations
              const cityListFromDays = plan.days?.length
                ? plan.days.map(d => `${d.city}${d.country ? `, ${d.country}` : ''}`)
                : plan.destinations;
              const seen = new Set<string>();
              const pills: string[] = [];
              (cityListFromDays || []).forEach((c) => {
                if (!seen.has(c)) {
                  seen.add(c);
                  pills.push(c);
                }
              });
              const displayPills = pills.slice(0, 2);
              const extra = pills.length > 2 ? pills.length - 2 : 0;

              // Build unique countries with their cities for flag display
              const countryMap = new Map<string, string[]>();
              (plan.days || []).forEach((d) => {
                const cities = countryMap.get(d.country) || [];
                if (!cities.includes(d.city)) cities.push(d.city);
                countryMap.set(d.country, cities);
              });
              const countryEntries = Array.from(countryMap.entries()).slice(0, 2);
              const extraCountries = countryMap.size > 2 ? countryMap.size - 2 : 0;

              return (
                <button
                  key={plan.id}
                  onClick={() => setViewingPlan(plan)}
                  className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-teal-200 hover:shadow-md transition-all text-left group"
                >
                  <h4 className="font-black text-gray-800 text-sm mb-1 group-hover:text-teal-600 transition-colors line-clamp-1">{plan.title}</h4>
                  <p className="text-xs text-gray-400 font-medium mb-3 line-clamp-2">{plan.summary}</p>
                  <div className="space-y-1.5">
                    {countryEntries.length > 0 ? countryEntries.map(([country, cities], idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {countryAlpha2(country) && (
                          <img src={`https://flagcdn.com/w40/${countryAlpha2(country)}.png`} alt={country} className="w-5 h-3 object-cover rounded-sm" referrerPolicy="no-referrer" />
                        )}
                        <span className="text-[9px] uppercase tracking-wider font-black text-teal-600">{country}</span>
                        <span className="text-[9px] text-gray-400 font-medium truncate">{cities.join(', ')}</span>
                      </div>
                    )) : displayPills.map((p, idx) => (
                      <span key={idx} className="text-[9px] uppercase tracking-wider font-black bg-gray-50 px-2 py-0.5 rounded-md text-gray-400 border border-gray-100">
                        {p}
                      </span>
                    ))}
                    {extraCountries > 0 && (
                      <span className="text-[9px] font-black text-gray-300">+{extraCountries} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Viewing Plan Modal */}
      <AnimatePresence>
        {viewingPlan && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingPlan(null)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-lg bg-stone-50 rounded-3xl shadow-2xl my-8 max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 flex items-center justify-end shrink-0 border-b border-stone-100">
                <button onClick={() => setViewingPlan(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>
              <div className="overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ItineraryView itinerary={viewingPlan} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MOCK_DESTINATIONS: Record<PlannerIntent, { cities: string[]; countries: string[]; titles: string[] }> = {
  surprise: {
    cities: ['Santorini', 'Kyoto', 'Reykjavik', 'Marrakech', 'Bali', 'Cape Town', 'Prague', 'Buenos Aires'],
    countries: ['Greece', 'Japan', 'Iceland', 'Morocco', 'Indonesia', 'South Africa', 'Czech Republic', 'Argentina'],
    titles: ['Mediterranean Dream', 'Japanese Odyssey', 'Northern Lights Quest', 'Desert & Spice Adventure', 'Island Paradise', 'Safari & Sunset', 'Fairytale Europe', 'Latin Rhythm'],
  },
  destination: {
    cities: [],
    countries: [],
    titles: [],
  },
  goal: {
    cities: ['Everest Base Camp', 'Machu Picchu', 'Great Barrier Reef', 'Northern Lights', 'Antarctica'],
    countries: ['Nepal', 'Peru', 'Australia', 'Iceland', 'Antarctica'],
    titles: ['Peak Achievement', 'Inca Trail Explorer', 'Ocean Wonder', 'Aurora Borealis', 'End of the World'],
  },
  weekend: {
    cities: ['Las Vegas', 'Miami', 'Nashville', 'Amsterdam', 'Barcelona', 'Kyoto', 'Mexico City'],
    countries: ['USA', 'USA', 'USA', 'Netherlands', 'Spain', 'Japan', 'Mexico'],
    titles: ['Quick Vegas Escape', 'Miami Beach Weekend', 'Music City Getaway', 'Amsterdam Weekend', 'Barcelona Break', 'Kyoto Escape', 'Mexico City Express'],
  },
  budget: {
    cities: ['Bangkok', 'Hanoi', 'Budapest', 'Krakow', 'Kyoto', 'Mexico City', 'Bali'],
    countries: ['Thailand', 'Vietnam', 'Poland', 'Poland', 'Japan', 'Mexico', 'Indonesia'],
    titles: ['Thai Treasure', 'Vietnam Value', 'Budapest on a Budget', 'Polish Adventure', 'Kyoto on a Budget', 'Mexico Magic', 'Bali on a Dime'],
  },
};

function generateMockItinerary(
  intent: PlannerIntent,
  destination: string,
  duration: number,
  selectedGoal: string,
  dna: TravelDna
): any {
  const mock = MOCK_DESTINATIONS[intent] || MOCK_DESTINATIONS.surprise;
  let selectedCity = destination || mock.cities[Math.floor(Math.random() * mock.cities.length)];
  let selectedCountry = mock.countries[mock.cities.indexOf(selectedCity)] || 'Unknown';
  
  if (intent === 'destination' && destination) {
    const parts = destination.split(',').map(s => s.trim());
    selectedCity = parts[0];
    selectedCountry = parts[1] || 'Unknown';
  }
  
  if (intent === 'goal' && selectedGoal) {
    const goalMock = MOCK_DESTINATIONS.goal;
    const idx = goalMock.cities.findIndex(c => c.toLowerCase().includes(selectedGoal.toLowerCase().split(' ')[0]));
    if (idx >= 0) {
      selectedCity = goalMock.cities[idx];
      selectedCountry = goalMock.countries[idx];
    }
  }
  
  const days = [];
  const activities = [
    'Explore the historic old town and wander through cobblestone streets',
    'Visit a renowned local market and sample authentic cuisine',
    'Take a guided tour of famous landmarks and cultural sites',
    'Enjoy a scenic hike with breathtaking panoramic views',
    'Relax at a cozy cafe and soak in the local atmosphere',
    'Discover hidden gems off the beaten path',
    'Experience a traditional local activity or workshop',
    'Watch a stunning sunset at a iconic viewpoint',
  ];
  
  const hotels = [
    'Boutique Hotel Central',
    'City View Suites',
    'Heritage Inn',
    'Riverside Lodge',
    'Old Town B&B',
  ];
  
  for (let i = 1; i <= Math.min(duration, 7); i++) {
    days.push({
      dayNumber: i,
      city: selectedCity,
      country: selectedCountry,
      title: `Day ${i}: ${activities[i % activities.length].split(' ')[0]} & More`,
      activities: [activities[i % activities.length], activities[(i + 2) % activities.length]],
      hotel: hotels[i % hotels.length],
      meal: i % 3 === 0 ? 'Street food tour' : i % 3 === 1 ? 'Local restaurant' : 'Hotel dining',
    });
  }
  
  const title = mock.titles[Math.floor(Math.random() * mock.titles.length)];
  
  return {
    title: intent === 'destination' && destination ? `${selectedCity} Adventure` : title,
    summary: `A ${duration}-day adventure in ${selectedCity}, ${selectedCountry}. Experience the best of ${selectedCountry} with this carefully curated itinerary.`,
    totalDays: duration,
    totalNights: duration - 1,
    countries: [selectedCountry],
    destinations: [`${selectedCity}, ${selectedCountry}`],
    days,
    imageUrl: `https://source.unsplash.com/800x600/?${selectedCity.toLowerCase()},travel`,
    generatedAt: new Date().toISOString(),
  };
}

export default ItineraryPlanner;
