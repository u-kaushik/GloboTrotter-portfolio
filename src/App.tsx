import React, { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { initAnalytics, trackEvent, identifyUser, resetUser, trackPageView } from './services/analytics';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, getDoc, getDocs, limit, serverTimestamp, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { auth, db, signInWithApple, signInWithEmail, signInWithGoogle, signUpWithEmail, logout } from './firebase';
import { UserProfile, TravelLog, Itinerary, ItineraryStatus } from './types';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import Globe from './components/Globe';
import TravelForm from './components/TravelForm';
import ItineraryPlanner from './components/ItineraryPlanner';
import SavedTrips from './components/SavedTrips';
import Rewards from './components/Rewards';
import JournalView from './components/JournalView';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { Onboarding } from './components/Onboarding';
import BulkTripEntry from './components/BulkTripEntry';
import CookieBanner from './components/CookieBanner';
import GlobePaint, { PaintedCountry } from './components/GlobePaint';
import { NUMERIC_TO_CONTINENT } from './constants/countries';
import { Globe as GlobeIcon, Map, LayoutDashboard, LogOut, Plane, Sparkles, AlertCircle, Plus, X, Trophy, Settings as SettingsIcon, ChevronRight, Calendar, Camera, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LEVELS, BADGES } from './constants/gamification';
import { computeTravelDna } from './lib/travelDna';
import { friendlyCountryName } from './lib/countryNames';
import { formatTravelLogDate, getAvatarUrl } from './lib/utils';
import { isDemoMode, setDemoMode, getDemoProfile, getDemoLogs, getDemoItineraries, saveDemoLog, saveDemoItinerary, getStoredDemoLogs, clearDemoData } from './lib/demoMode';
import GuidedTour from './components/GuidedTour';
import DemoWalkthrough, { DemoWalkthroughStep } from './components/DemoWalkthrough';
import NostalgiaCelebration from './components/NostalgiaCelebration';
import { DEMO_ONBOARDING_ACTIVE_KEY, DEMO_ONBOARDING_DONE_KEY, DEMO_ONBOARDING_TRIP } from './lib/demoOnboarding';

const COOKIE_KEY = 'gt_cookie_consent';

const shouldShowCookieBannerInitially = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !isDemoMode() && !localStorage.getItem(COOKIE_KEY);
};

const getLevelFromXp = (xp: number): number => {
  let level = 1;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) level = l.level;
  }
  return level;
};

const generateReferralCode = (displayName: string): string => {
  const slug = (displayName || 'traveler')
    .split(' ')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return slug || 'traveler';
};

const stripUndefined = <T extends object>(data: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key as keyof T] = value as T[keyof T];
    }
  });
  return cleaned;
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

const ADMIN_EMAIL = 'ukaushik37@gmail.com';

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


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<TravelLog[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'globe' | 'planner' | 'rewards' | 'settings'>('dashboard');
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'app'>('app');
  const [showForm, setShowForm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [selectedLog, setSelectedLog] = useState<TravelLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stripeStatus, setStripeStatus] = useState<'pro' | 'canceled' | null>(null);
  const [countryTrips, setCountryTrips] = useState<{ name: string; logs: TravelLog[] } | null>(null);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [showGlobePaint, setShowGlobePaint] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<string | null>(null);
  const [plannerView, setPlannerView] = useState<'planner' | 'mytrips'>('planner');
  const clearDemoAndLogout = () => {
    localStorage.removeItem('gt_tour_completed');
    localStorage.setItem(DEMO_ONBOARDING_ACTIVE_KEY, 'true');
    localStorage.removeItem(DEMO_ONBOARDING_DONE_KEY);
    startDemoExperience();
  };

  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const demoTourTimer = useRef<number | null>(null);
  const demoTourScheduled = useRef(false);

  const TOUR_TARGETS = ['dashboard', 'globe-tab', 'planner-tab', 'rewards-tab', 'add-trip', 'settings-tab'] as const;

  const [demoWalkEnabled, setDemoWalkEnabled] = useState(false);
  const [demoWalkStepId, setDemoWalkStepId] = useState<'welcome' | 'addTrip' | 'countryAck' | 'cityAck' | 'dateAck' | 'notesAck' | 'saveTrip' | 'nostalgiaMusic' | 'nostalgiaScene' | 'nostalgiaCards' | 'nostalgiaFacts' | 'globePortugal' | 'portugalMemory' | 'memoryEnjoy' | 'memoryMoments' | 'memoryStoryOpen' | 'memoryPlanner' | 'plannerIntro' | 'plannerCards' | 'plannerGenerate' | 'plannerSummary' | 'plannerDay1' | 'plannerDay2' | 'plannerDay3' | 'rewardsIntro' | 'rewardsLevel' | 'rewardsSummary' | 'rewardsAchievements' | 'rewardsBadgeOpen' | 'rewardsRoadmap' | 'rewardsOutro'>('welcome');
  const [demoWalkPrefill, setDemoWalkPrefill] = useState<Partial<TravelLog> | null>(null);
  const [demoWalkLockForm, setDemoWalkLockForm] = useState(false);
  const [demoRewardBadgeId, setDemoRewardBadgeId] = useState<string | null>(null);
  const [showNostalgia, setShowNostalgia] = useState(false);
  const [loginStartMode, setLoginStartMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(shouldShowCookieBannerInitially);

  const demoWalkStep: DemoWalkthroughStep | null = (() => {
    if (!demoWalkEnabled) return null;
    switch (demoWalkStepId) {
      case 'welcome':
        return { id: 'welcome', title: 'Welcome to Your Demo', body: 'We’ll walk through logging a trip, reliving the memory, and planning what comes next. Ready when you are.', centered: true };
      case 'addTrip':
        return { id: 'addTrip', title: 'Log a Trip', body: 'Let’s add a memory — tap the + button and we’ll fill the Kyoto trip together, step by step.', targetDataTour: 'add-trip', tone: 'action', centered: true };
      case 'countryAck':
        return { id: 'countryAck', title: 'Country Set', body: 'Japan is filled in — give it a quick look, then tap the highlighted step.' , targetDataTour: 'demo-country-ack', tone: 'action' };
      case 'cityAck':
        return { id: 'cityAck', title: 'City Set', body: 'Kyoto is locked in now. One more check before we move on.', targetDataTour: 'demo-city-ack', tone: 'action' };
      case 'dateAck':
        return { id: 'dateAck', title: 'Dates Set', body: 'Oct 14, 2022 and 4 days — nice and tidy. Next we’ll confirm the notes.', targetDataTour: 'demo-date-ack', tone: 'action' };
      case 'notesAck':
        return { id: 'notesAck', title: 'Notes Added', body: 'The notes are in. Give them a quick read, then tap to unlock Save Memory.', targetDataTour: 'demo-notes-ack', tone: 'action' };
      case 'saveTrip':
        return { id: 'saveTrip', title: 'Save It', body: 'Nice. Now hit “Save Memory” and we’ll generate a Time Capsule for this trip.', targetDataTour: 'save-trip', tone: 'action' };
      case 'globePortugal':
        return { id: 'globePortugal', title: 'Tap Japan', body: 'Japan is centered now — tap it to open the Kyoto memory card.', targetDataTour: 'demo-globe-map', tone: 'action', dockCorner: 'bottom-right' };
      case 'nostalgiaMusic':
        return { id: 'nostalgiaMusic', title: 'Music Sets the Mood', body: 'This song card anchors the memory — album art, title, and the exact vibe of the trip.', targetDataTour: 'nostalgia-music', tone: 'action' };
      case 'nostalgiaScene':
        return { id: 'nostalgiaScene', title: 'The Scene Comes Alive', body: 'Now the opening line drops you straight into Kyoto — that’s what makes it feel real.', targetDataTour: 'nostalgia-scene', tone: 'action' };
      case 'nostalgiaCards':
        return { id: 'nostalgiaCards', title: 'Helpful Context', body: 'These cards add the little details — city pulse, food, design, and the bigger world around the trip.', targetDataTour: 'nostalgia-cards', tone: 'action' };
      case 'nostalgiaFacts':
        return { id: 'nostalgiaFacts', title: 'The Personal Layer', body: 'This is the bit that turns data into memory — the note that feels like it was written for you.', targetDataTour: 'nostalgia-facts', tone: 'action' };
      case 'portugalMemory':
        return { id: 'portugalMemory', title: 'Open the Kyoto Memory', body: 'This is the trip card — tap it to open the full memory page.', targetDataTour: 'demo-portugal-memory', tone: 'action' };
      case 'memoryEnjoy':
        return { id: 'memoryEnjoy', title: 'Enjoy the Memory', body: 'Take a moment with the Kyoto photo and the story before we jump into planning.', targetDataTour: 'memory-hero', tone: 'action' };
      case 'memoryMoments':
        return { id: 'memoryMoments', title: 'Store the Moments', body: 'This is your memory shelf — photos, videos, and little story cards all live here when you want to keep the trip going.', targetDataTour: 'demo-moments-store', tone: 'action', dockCorner: 'top-right' };
      case 'memoryStoryOpen':
        return { id: 'memoryStoryOpen', title: 'Memory, Full Screen', body: 'Take in the story, then tap the little close button to keep the adventure rolling.', targetDataTour: 'demo-story-viewer-close', tone: 'action', dockCorner: 'top-left' };
      case 'memoryPlanner':
        return { id: 'memoryPlanner', title: 'Ready for the AI Planner?', body: 'Tap the AI Planner button below and we’ll build a fresh trip from this memory.', targetDataTour: 'memory-planner', tone: 'action', dockCorner: 'top-right' };
      case 'plannerIntro':
        return { id: 'plannerIntro', title: 'Let’s Build the Next One', body: 'We’ll take the Kyoto vibe and turn it into a fresh getaway — nice and playful, one step at a time.', centered: true };
      case 'plannerCards':
        return { id: 'plannerCards', title: 'Pick a Vibe', body: 'Start with Surprise Me and watch the planner do the heavy lifting.', targetDataTour: 'planner-surprise', tone: 'action' };
      case 'plannerGenerate':
        return { id: 'plannerGenerate', title: 'The AI Brain at Work', body: 'Here’s the pretend AI layer — a little motion while the trip takes shape.', targetDataTour: 'planner-loading', tone: 'action' };
      case 'plannerSummary':
        return { id: 'plannerSummary', title: 'Marrakech Is Ready', body: 'Start with the overview, then click through each day to unpack the trip piece by piece.', targetDataTour: 'planner-summary', tone: 'action', dockCorner: 'bottom-right' };
      case 'plannerDay1':
        return { id: 'plannerDay1', title: 'Day One', body: 'Open the medina chapter first — this is where the tone of the trip really starts to hum.', targetDataTour: 'planner-day-1', tone: 'action', dockCorner: 'bottom-right' };
      case 'plannerDay2':
        return { id: 'plannerDay2', title: 'Day Two', body: 'Food, color, and architecture — the middle of the trip is where the details shine.', targetDataTour: 'planner-day-2', tone: 'action', dockCorner: 'bottom-right' };
      case 'plannerDay3':
        return { id: 'plannerDay3', title: 'Day Three', body: 'Close with a slower final day, then we’ll wrap the AI talk and move to Rewards.', targetDataTour: 'planner-day-3', tone: 'action', dockCorner: 'bottom-right' };
      case 'rewardsIntro':
        return { id: 'rewardsIntro', title: 'Your Rewards Are Ready', body: 'Let’s take a look at your level, your badges, and the road ahead.', centered: true };
      case 'rewardsLevel':
        return { id: 'rewardsLevel', title: 'Your Main Level', body: 'This is your current level — the part of the journey that grows as you travel more.', targetDataTour: 'rewards-level', tone: 'action' };
      case 'rewardsSummary':
        return { id: 'rewardsSummary', title: 'Your Travel Snapshot', body: 'A quick read on your badges, countries, cities, and photos all in one place.', targetDataTour: 'rewards-summary', tone: 'action' };
      case 'rewardsAchievements':
        return { id: 'rewardsAchievements', title: 'Your Kyoto Badge', body: 'Tap the badge you just unlocked — then we’ll take a closer look together.', targetDataTour: 'rewards-badge-continents', tone: 'action' };
      case 'rewardsBadgeOpen':
        return { id: 'rewardsBadgeOpen', title: 'Nice One', body: 'Read the badge details, then close it to keep the tour moving.', targetDataTour: 'rewards-badge-close', tone: 'action', dockCorner: 'top-left' };
      case 'rewardsRoadmap':
        return { id: 'rewardsRoadmap', title: 'The Levels Ahead', body: 'This is where the journey keeps going — a preview of the levels you can grow into.', targetDataTour: 'rewards-roadmap', tone: 'action', dockCorner: 'top-right' };
      case 'rewardsOutro':
        return { id: 'rewardsOutro', title: 'Ready to Make It Yours?', body: 'You’ve seen the full experience — now let’s get you into sign up so you can start your own journey.', centered: true };
      default:
        return null;
    }
  })();

  const skipDemoWalkthrough = () => {
    localStorage.setItem(DEMO_ONBOARDING_DONE_KEY, 'true');
    localStorage.removeItem(DEMO_ONBOARDING_ACTIVE_KEY);
    localStorage.setItem('gt_tour_completed', 'true');
    setDemoWalkEnabled(false);
    setShowNostalgia(false);
    setShowForm(false);
    setLogs(getDemoLogs());
    setItineraries(getDemoItineraries());
    setActiveTab('dashboard');
    setCurrentView('app');
  };

  const startDemoExperience = () => {
    // Reset scripted demo state
    clearDemoData();
    localStorage.removeItem(DEMO_ONBOARDING_DONE_KEY);
    localStorage.setItem(DEMO_ONBOARDING_ACTIVE_KEY, 'true');
    localStorage.setItem('gt_tour_completed', 'true');
    localStorage.removeItem('gt_last_itinerary');
    setDemoMode(true);

    const demoProfile = getDemoProfile();

    setActiveTab('dashboard');
    setUser({
      uid: demoProfile.uid,
      email: demoProfile.email,
      displayName: demoProfile.displayName,
      photoURL: demoProfile.photoURL,
    } as User);
    setProfile(demoProfile);
    setLogs(getDemoLogs());
    setItineraries([]);
    setSelectedLog(null);
    setShowForm(false);
    setShowNostalgia(false);
    setDemoWalkPrefill(null);
    setDemoWalkLockForm(false);
    setDemoRewardBadgeId(null);

    setDemoWalkEnabled(true);
    setDemoWalkStepId('welcome');
    setLoginStartMode('sign_in');
    setShowTour(false);
    setCurrentView('app');
  };

  const advanceDemoWalkthroughOnTarget = () => {
    switch (demoWalkStepId) {
      case 'addTrip': {
        setDemoWalkPrefill({
          countryName: DEMO_ONBOARDING_TRIP.countryName,
        });
        setDemoWalkLockForm(true);
        setShowForm(true);
        setDemoWalkStepId('countryAck');
        return;
      }
      case 'welcome': {
        setDemoWalkStepId('addTrip');
        return;
      }
      case 'countryAck': {
        setDemoWalkPrefill({
          countryName: DEMO_ONBOARDING_TRIP.countryName,
          cityName: DEMO_ONBOARDING_TRIP.cityName,
        });
        setDemoWalkStepId('cityAck');
        return;
      }
      case 'cityAck': {
        setDemoWalkPrefill({
          countryName: DEMO_ONBOARDING_TRIP.countryName,
          cityName: DEMO_ONBOARDING_TRIP.cityName,
          year: DEMO_ONBOARDING_TRIP.year,
          month: DEMO_ONBOARDING_TRIP.month,
          day: DEMO_ONBOARDING_TRIP.day,
          duration: DEMO_ONBOARDING_TRIP.duration,
        });
        setDemoWalkStepId('dateAck');
        return;
      }
      case 'dateAck': {
        setDemoWalkPrefill({
          countryName: DEMO_ONBOARDING_TRIP.countryName,
          cityName: DEMO_ONBOARDING_TRIP.cityName,
          year: DEMO_ONBOARDING_TRIP.year,
          month: DEMO_ONBOARDING_TRIP.month,
          day: DEMO_ONBOARDING_TRIP.day,
          duration: DEMO_ONBOARDING_TRIP.duration,
          notes: DEMO_ONBOARDING_TRIP.notes,
        });
        setDemoWalkStepId('notesAck');
        return;
      }
      case 'notesAck': {
        setDemoWalkStepId('saveTrip');
        return;
      }
      case 'nostalgiaMusic': {
        setDemoWalkStepId('nostalgiaScene');
        return;
      }
      case 'nostalgiaScene': {
        setDemoWalkStepId('nostalgiaCards');
        return;
      }
      case 'nostalgiaCards': {
        setDemoWalkStepId('nostalgiaFacts');
        return;
      }
      case 'nostalgiaFacts': {
        setShowNostalgia(false);
        setActiveTab('globe');
        window.setTimeout(() => setDemoWalkStepId('globePortugal'), 220);
        return;
      }
      case 'globePortugal': {
        const japanLogs = logs
          .filter(l => String(l.countryCode).padStart(3, '0') === '392')
          .sort((a, b) => b.year - a.year);
        if (japanLogs.length > 0) {
          setShowNostalgia(false);
          setCountryTrips({ name: 'Japan', logs: japanLogs });
          setDemoWalkStepId('portugalMemory');
        }
        return;
      }
      case 'portugalMemory': {
        setShowNostalgia(false);
        setCountryTrips(null);
        setSelectedLog(countryTrips?.logs[0] ?? null);
        setDemoWalkStepId('memoryEnjoy');
        return;
      }
      case 'memoryEnjoy': {
        setDemoWalkStepId('memoryMoments');
        return;
      }
      case 'memoryMoments': {
        setDemoWalkStepId('memoryStoryOpen');
        return;
      }
      case 'memoryStoryOpen': {
        setDemoWalkStepId('memoryPlanner');
        return;
      }
      case 'memoryPlanner': {
        setSelectedLog(null);
        setCountryTrips(null);
        setShowNostalgia(false);
        setActiveTab('planner');
        setPlannerView('planner');
        setDemoWalkStepId('plannerCards');
        return;
      }
      case 'plannerIntro': {
        setActiveTab('planner');
        setPlannerView('planner');
        setDemoWalkStepId('plannerCards');
        return;
      }
      case 'plannerCards': {
        return;
      }
      case 'plannerGenerate': {
        return;
      }
      case 'plannerSummary': {
        setDemoWalkStepId('plannerDay1');
        return;
      }
      case 'plannerDay1': {
        setDemoWalkStepId('plannerDay2');
        return;
      }
      case 'plannerDay2': {
        setDemoWalkStepId('plannerDay3');
        return;
      }
      case 'plannerDay3': {
        setActiveTab('rewards');
        setDemoWalkStepId('rewardsIntro');
        return;
      }
      case 'rewardsIntro': {
        setDemoWalkStepId('rewardsLevel');
        return;
      }
      case 'rewardsLevel': {
        setDemoWalkStepId('rewardsSummary');
        return;
      }
      case 'rewardsSummary': {
        setDemoWalkStepId('rewardsAchievements');
        return;
      }
      case 'rewardsAchievements': {
        setDemoWalkStepId('rewardsBadgeOpen');
        return;
      }
      case 'rewardsBadgeOpen': {
        setDemoWalkStepId('rewardsRoadmap');
        return;
      }
      case 'rewardsRoadmap': {
        setDemoWalkStepId('rewardsOutro');
        return;
      }
      case 'rewardsOutro': {
        localStorage.setItem(DEMO_ONBOARDING_DONE_KEY, 'true');
        localStorage.removeItem(DEMO_ONBOARDING_ACTIVE_KEY);
        localStorage.setItem('gt_tour_completed', 'true');
        setDemoWalkEnabled(false);
        setActiveTab('dashboard');
        setCurrentView('app');
        return;
      }
      case 'saveTrip':
      default:
        return;
    }
  };

  const nextTourStep = () => {
    if (tourStep >= TOUR_TARGETS.length - 1) {
      setShowTour(false);
      setTourStep(0);
    } else {
      const next = tourStep + 1;
      setTourStep(next);
      window.setTimeout(() => {
        const nextEl = document.querySelector(`[data-tour="${TOUR_TARGETS[next]}"]`);
        if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const prevTourStep = () => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  };

  const completeTour = () => {
    setShowTour(false);
    setTourStep(0);
    localStorage.setItem('gt_tour_completed', 'true');
  };

  useEffect(() => {
    if (!isDemoMode()) return;
    if (localStorage.getItem('gt_tour_completed')) return;
    if (localStorage.getItem(DEMO_ONBOARDING_DONE_KEY)) return;
    if (localStorage.getItem(DEMO_ONBOARDING_ACTIVE_KEY) === 'true') return;
    if (demoWalkEnabled) return;
    if (demoTourScheduled.current) return;
    if (currentView !== 'app' || loading) return;

    demoTourScheduled.current = true;

    let canceled = false;
    const tryStart = async () => {
      const startAt = Date.now();
      while (!canceled && Date.now() - startAt < 5000) {
        const el = document.querySelector('[data-tour="dashboard"]');
        if (el) {
          setShowTour(true);
          setTourStep(0);
          return;
        }
        await new Promise((r) => window.setTimeout(r, 150));
      }
    };

    demoTourTimer.current = window.setTimeout(() => {
      void tryStart();
    }, 800);

    return () => {
      canceled = true;
      demoTourScheduled.current = false;
      if (demoTourTimer.current) window.clearTimeout(demoTourTimer.current);
      demoTourTimer.current = null;
    };
  }, [currentView, loading]);

  // Demo walkthrough (scripted) — only in demo mode, only once
  useEffect(() => {
    if (!isDemoMode()) return;
    if (currentView !== 'app' || loading) return;
    if (demoWalkEnabled) return;
    if (localStorage.getItem(DEMO_ONBOARDING_DONE_KEY)) return;
    if (localStorage.getItem(DEMO_ONBOARDING_ACTIVE_KEY) !== 'true') return;
    localStorage.setItem(DEMO_ONBOARDING_ACTIVE_KEY, 'true');
    localStorage.setItem('gt_tour_completed', 'true');
    setDemoWalkEnabled(true);
    setDemoWalkStepId('addTrip');
    // Avoid overlapping tours
    setShowTour(false);
  }, [currentView, loading]);

  useEffect(() => {
    if (!demoWalkEnabled || !countryTrips || demoWalkStepId !== 'portugalMemory') return;
    const timeout = window.setTimeout(() => {
      document.querySelector('[data-tour="demo-portugal-memory"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [countryTrips, demoWalkEnabled, demoWalkStepId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (activeTab !== 'planner') setPlannerView('planner');
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    if (success === 'pro') {
      setStripeStatus('pro');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#6366f1', '#a855f7', '#d8b4fe', '#facc15'],
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (success === 'refill') {
      setStripeStatus('refill');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled')) {
      setStripeStatus('canceled');
      window.history.replaceState({}, '', window.location.pathname);
    }
    const ref = params.get('ref');
    if (ref) {
      setPendingReferral(ref);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const skippedInitialRouteTracking = useRef(false);

  const initAnalyticsOnce = () => {
    const measurementId = process.env.GA_MEASUREMENT_ID as string | undefined;
    if (measurementId) {
      initAnalytics(measurementId);
    }
  };

  const getCurrentRoutePath = () => (currentView === 'app' ? `/app/${activeTab}` : `/${currentView}`);

  useEffect(() => {
    initAnalyticsOnce();
  }, []);

  useEffect(() => {
    if (!skippedInitialRouteTracking.current) {
      skippedInitialRouteTracking.current = true;
      return;
    }
    trackPageView(getCurrentRoutePath());
  }, [activeTab, currentView]);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    const shouldShowOnView = currentView === 'landing' || currentView === 'login' || currentView === 'app';
    setShowCookieBanner(!isDemoMode() && shouldShowOnView && !consent);
  }, [currentView, user]);

  const handleCookieAccept = () => {
    localStorage.setItem(COOKIE_KEY, 'all');
    setShowCookieBanner(false);
  };

  const handleCookieDecline = () => {
    localStorage.setItem(COOKIE_KEY, 'essential');
    setShowCookieBanner(false);
  };

  const skipFirebaseAuth = isDemoMode();

  useEffect(() => {
    if (skipFirebaseAuth) {
      const demoProfile = getDemoProfile();
      const demoOnboardingActive = localStorage.getItem(DEMO_ONBOARDING_ACTIVE_KEY) === 'true' && !localStorage.getItem(DEMO_ONBOARDING_DONE_KEY);
      const demoLogs = demoOnboardingActive ? [] : (getStoredDemoLogs().length > 0 ? getStoredDemoLogs() : getDemoLogs());
      const demoItineraries = demoOnboardingActive ? [] : getDemoItineraries();
      setUser({ uid: demoProfile.uid, email: demoProfile.email, displayName: demoProfile.displayName, photoURL: demoProfile.photoURL } as User);
      setProfile(demoProfile);
      setLogs(demoLogs);
      setItineraries(demoItineraries);
      setCurrentView('app');
      setLoading(false);
      return;
    }

    let unsubLogs: (() => void) | null = null;
    let unsubItineraries: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log('Auth state changed:', u?.email, u?.uid);
      try {
        setUser(u);
        if (u) {
          const consent = localStorage.getItem(COOKIE_KEY);
          setShowCookieBanner(!consent);
          setCurrentView('app');
          // Fetch or create profile
          const profileRef = doc(db, 'users', u.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (!profileSnap.exists()) {
            // Look up referrer if ?ref= was in the URL
            let referredByUid: string | undefined;
            let referredByName: string | undefined;
            if (pendingReferral) {
              const refQuery = query(collection(db, 'users'), where('referralCode', '==', pendingReferral), limit(1));
              const refSnap = await getDocs(refQuery);
              if (!refSnap.empty) {
                referredByUid = refSnap.docs[0].id;
                referredByName = (refSnap.docs[0].data().displayName as string) || '';
              }
              setPendingReferral(null);
            }

            const primaryProvider = u.providerData.find((provider) => provider.providerId && provider.providerId !== 'firebase')?.providerId;

            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Traveler',
              email: u.email || '',
              authProvider: primaryProvider,
              photoURL: u.photoURL || undefined,
              level: 1,
              xp: 0,
              badges: ['New Explorer'],
              totalCountries: 0,
              totalCities: 0,
              credits: 5,
              referralCode: generateReferralCode(u.displayName || 'traveler'),
              referralCount: 0,
              onboarded: false,
              lastLogin: new Date().toISOString(),
              loginCount: 1,
            };
            if (referredByUid) {
              newProfile.referredBy = referredByUid;
              newProfile.referredByName = referredByName;
            }
            console.log('Creating new profile for:', u.email, 'uid:', u.uid);
            try {
              await setDoc(profileRef, stripUndefined(newProfile));
              console.log('Profile created successfully');
            } catch (writeErr) {
              console.error('Failed to write profile:', writeErr);
              throw writeErr;
            }
            setProfile(newProfile);
          } else {
            const profileData = profileSnap.data() as UserProfile;
            const updates: Record<string, any> = {};
            const primaryProvider = u.providerData.find((provider) => provider.providerId && provider.providerId !== 'firebase')?.providerId;
            // Always refresh login data for analytics
            updates.lastLogin = new Date().toISOString();
            updates.loginCount = (profileData.loginCount || 0) + 1;
            if (primaryProvider && profileData.authProvider !== primaryProvider) {
              profileData.authProvider = primaryProvider;
              updates.authProvider = primaryProvider;
            }
            // Auto-correct level if it doesn't match LEVELS thresholds
            const correctLevel = getLevelFromXp(profileData.xp);
            if (profileData.level !== correctLevel) {
              profileData.level = correctLevel;
              updates.level = correctLevel;
            }
            // Generate name-based referral code (migrate old GT- codes too)
            const expectedCode = generateReferralCode(u.displayName || 'traveler');
            if (!profileData.referralCode || profileData.referralCode.startsWith('GT-')) {
              profileData.referralCode = expectedCode;
              profileData.referralCount = profileData.referralCount || 0;
              updates.referralCode = profileData.referralCode;
              updates.referralCount = profileData.referralCount;
            }
            if (Object.keys(updates).length > 0) {
              await setDoc(profileRef, stripUndefined(updates), { merge: true });
            }
            setProfile(profileData);
            identifyUser(u.uid, {
              displayName: profileData.displayName,
              email: profileData.email,
              level: profileData.level,
              xp: profileData.xp,
              credits: profileData.credits,
              isPro: profileData.isPro,
            });
          }

          // Cleanup previous listeners if any
          if (unsubLogs) unsubLogs();
          if (unsubItineraries) unsubItineraries();
          if (unsubProfile) unsubProfile();

          // Real-time profile listener — keeps profile state in sync across devices.
          // Skip the first fire (initialization already set the profile via getDoc above).
          let skipFirstProfileSnap = true;
          unsubProfile = onSnapshot(profileRef, (snap) => {
            if (skipFirstProfileSnap) { skipFirstProfileSnap = false; return; }
            if (snap.exists()) setProfile(snap.data() as UserProfile);
          });

          // Listen to logs
          const logsQuery = query(collection(db, 'travelLogs'), where('uid', '==', u.uid));
          unsubLogs = onSnapshot(logsQuery, (snapshot) => {
            setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TravelLog)));
          }, (err) => handleFirestoreError(err, 'list', 'travelLogs'));

          // Listen to itineraries
          const itinerariesQuery = query(collection(db, 'itineraries'), where('uid', '==', u.uid));
          unsubItineraries = onSnapshot(itinerariesQuery, (snapshot) => {
            setItineraries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Itinerary)));
          }, (err) => handleFirestoreError(err, 'list', 'itineraries'));
        } else {
          setProfile(null);
          setLogs([]);
          setItineraries([]);
          if (unsubLogs) unsubLogs();
          if (unsubItineraries) unsubItineraries();
          if (unsubProfile) unsubProfile();
          unsubLogs = null;
          unsubItineraries = null;
          unsubProfile = null;
        }
      } catch (err: any) {
        console.error("Auth initialization error:", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        console.error("Full error:", JSON.stringify(err));
        const errorMsg = err?.message || err?.code || "Unknown error";
        setError(`Failed to connect to your profile: ${errorMsg}. Please refresh.`);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubLogs) unsubLogs();
      if (unsubItineraries) unsubItineraries();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleFirestoreError = (err: any, op: string, path: string) => {
    const errInfo = {
      error: err.message,
      operationType: op,
      path,
      authInfo: { userId: auth.currentUser?.uid }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    setError(`Database error (${op} ${path}): ${err.message}`);
  };

  const generateHistoricalContext = async (
    year: number,
    month: number | undefined,
    country: string,
    interests: string[] = [],
    homeCountry: string = '',
    day?: number,
    city?: string
  ) => {
    if ((profile?.credits ?? 0) <= 0) {
      setError('Out of fuel — historical nostalgia was skipped. Top up fuel to re-enable.');
      return null;
    }

    if (isDemoMode()) {
      return {
        topSong: 'Blinding Lights',
        topArtist: 'The Weeknd',
        funFact: `${country} is home to ${Math.floor(Math.random() * 50) + 10} UNESCO World Heritage Sites!`,
      };
    }

    const payload = { countryName: country, cityName: city, year, month, day, interests, homeCountry };

    const tryDevEndpoint = async () => {
      const res = await fetch('/api/generate-historical-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return res.json();
    };

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/.netlify/functions/ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'generateHistoricalContext',
          payload,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          return await tryDevEndpoint();
        }
        const body = await res.json().catch(() => ({}));
        if (body?.error === 'INSUFFICIENT_FUEL') setError('Out of fuel — historical nostalgia was skipped. Top up fuel to re-enable.');
        return await tryDevEndpoint();
      }
      const result = await res.json();
      setProfile(p => p ? { ...p, credits: Math.max(0, p.credits - 1) } : p);
      return result;
    } catch (err) {
      console.error("Failed to generate historical context:", err);
      return await tryDevEndpoint();
    }
  };

  const saveLog = async (logData: Partial<TravelLog>) => {
    if (!user || !profile) return;

    if (isDemoMode()) {
      if (demoWalkEnabled && demoWalkStepId === 'saveTrip') {
        saveDemoLog(DEMO_ONBOARDING_TRIP);
        const updated = [...getDemoLogs(), ...getStoredDemoLogs()];
        setLogs(updated);
        const previousXp = profile?.xp || 0;
        const previousLevel = profile?.level || 1;
        const newXp = previousXp + 220;
        const newLevel = getLevelFromXp(newXp);
        const uniqueCountries = new Set(updated.map(l => l.countryCode)).size;
        if (newLevel > previousLevel) {
          confetti({
            particleCount: 140,
            spread: 75,
            origin: { y: 0.58 },
            colors: ['#10b981', '#34d399', '#f59e0b', '#6366f1', '#ec4899'],
          });
        }
        setDemoRewardBadgeId('continents');
        setProfile(prev => prev ? {
          ...prev,
          xp: newXp,
          level: newLevel,
          totalCountries: uniqueCountries,
          totalCities: updated.length,
        } : prev);
        setShowForm(false);
        setDemoWalkStepId('nostalgiaMusic');
        setShowNostalgia(true);
        return;
      }

      const newLog: TravelLog = {
        ...logData,
        id: `demo-log-${Date.now()}`,
        uid: user.uid,
        createdAt: new Date().toISOString(),
      } as TravelLog;
      saveDemoLog(newLog);
      setLogs(prev => {
        const updated = [...prev, newLog];
        const uniqueCountries = new Set(updated.map(l => l.countryCode)).size;
        const newXp = (profile?.xp || 0) + 20;
        setProfile(prevProfile => prevProfile ? {
          ...prevProfile,
          xp: newXp,
          level: getLevelFromXp(newXp),
          totalCountries: uniqueCountries,
          totalCities: updated.length,
        } : prevProfile);
        return updated;
      });
      setShowForm(false);
      return;
    }

    try {
      setLoading(true);
      const historicalContext = await generateHistoricalContext(
        logData.year || 2024,
        logData.month,
        logData.countryName || '',
        profile.interests,
        friendlyCountryName(profile.homeCountry || ''),
        logData.day,
        logData.cityName
      );

      // Auto-compute age from birthDate if available
      const age = profile.birthDate
        ? (logData.year || new Date().getFullYear()) - new Date(profile.birthDate).getFullYear()
        : undefined;

      // Filter out undefined values before writing to Firestore
      const writeData: Record<string, unknown> = {};
      Object.entries({ ...logData, uid: user.uid, age, historicalContext, createdAt: serverTimestamp() }).forEach(([key, value]) => {
        if (value !== undefined) writeData[key] = value;
      });

      await addDoc(collection(db, 'travelLogs'), writeData);
      
      // Update XP and Stats
      const newXp = profile.xp + 20;
      const newLevel = getLevelFromXp(newXp);
      
      // Recalculate unique countries locally for immediate update
      const updatedLogs = [...logs, { ...logData, uid: user.uid } as TravelLog];
      const uniqueCountries = new Set(updatedLogs.map(l => l.countryCode)).size;

      await setDoc(doc(db, 'users', user.uid), stripUndefined({
        ...profile,
        xp: newXp,
        level: newLevel,
        totalCountries: uniqueCountries,
        totalCities: updatedLogs.length,
        credits: Math.max(0, (profile.credits || 0) - 1) // Deduct 1 fuel for nostalgia
      }));
      setShowForm(false);
      trackEvent('Trip Logged', {
        country: logData.countryName,
        city: logData.cityName,
        year: logData.year,
        month: logData.month,
        hasPhoto: !!logData.photoUrl,
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'travelLogs');
    } finally {
      setLoading(false);
    }
  };

  const updateLog = async (updatedLog: TravelLog, regenerateContext = false) => {
    if (!user || !updatedLog.id) return;

    if (isDemoMode()) {
      setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
      setSelectedLog(updatedLog);
      return;
    }

    try {
      const logRef = doc(db, 'travelLogs', updatedLog.id);
      const { id, _regenerateContext, ...data } = updatedLog as any;
      
      // Regenerate historical context if requested
      let historicalContext = data.historicalContext;
      if (regenerateContext || _regenerateContext) {
        const newCtx = await generateHistoricalContext(
          data.year || 2024,
          data.month,
          data.countryName || '',
          profile?.interests,
          friendlyCountryName(profile?.homeCountry || ''),
          data.day,
          data.cityName
        );
        if (newCtx) historicalContext = newCtx;
      }

      // Never write undefined to Firestore — filter before every write
      const writeData: Record<string, unknown> = {};
      Object.entries({ ...data }).forEach(([key, value]) => {
        if (value !== undefined) writeData[key] = value;
      });
      if (historicalContext != null) writeData.historicalContext = historicalContext;

      await setDoc(logRef, writeData, { merge: true });
      setSelectedLog({ ...updatedLog, historicalContext });
    } catch (err) {
      handleFirestoreError(err, 'update', 'travelLogs');
    }
  };

  const deleteLog = async (log: TravelLog) => {
    if (!user || !log.id) return;

    if (isDemoMode()) {
      setLogs(prev => prev.filter(l => l.id !== log.id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'travelLogs', log.id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'travelLogs');
    }
  };

  const handleDiscoveryRevealed = async () => {
    if (!user || !profile) return;
    const today = new Date();
    const todayISO = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

    const last = profile.lastDiscoveryDate;
    let newStreak = 1;

    if (last) {
      const lastDate = new Date(last + 'T00:00:00Z');
      const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
      const yesterdayISO = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;

      if (last === todayISO) return; // already counted today
      if (lastDate.toISOString().startsWith(yesterdayISO)) {
        newStreak = (profile.discoveryStreak ?? 0) + 1;
      }
      // older than yesterday → reset to 1 (default)
    }

    try {
      const profileRef = doc(db, 'users', user.uid);
      const update: Record<string, unknown> = {
        discoveryStreak: newStreak,
        lastDiscoveryDate: todayISO,
      };
      await setDoc(profileRef, update, { merge: true });
      setProfile({ ...profile, discoveryStreak: newStreak, lastDiscoveryDate: todayISO });
    } catch (err) {
      console.error('Failed to update discovery streak:', err);
    }
  };

  const checkReferralCode = async (code: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return true; // available
      // If the only match is the current user, it's still available (their own code)
      return snap.docs[0].id === user.uid;
    } catch (err) {
      console.error('Failed to check referral code:', err);
      return false; // treat as taken on error — safer than allowing duplicates
    }
  };

  const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!user || !profile) return;

    if (isDemoMode()) {
      setProfile({ ...profile, ...updatedProfile });
      return;
    }

    try {
      const profileRef = doc(db, 'users', user.uid);
      await setDoc(profileRef, stripUndefined(updatedProfile), { merge: true });
      setProfile({ ...profile, ...updatedProfile });
    } catch (err) {
      handleFirestoreError(err, 'update', 'users');
    }
  };

  const FREE_SAVE_LIMIT = 3;

  const saveItinerary = async (itineraryData: Partial<Itinerary>) => {
    if (!user || !profile) return;

    if (isDemoMode()) {
      saveDemoItinerary(itineraryData);
      const updated = getDemoItineraries();
      setItineraries(updated);
      return;
    }

    if (!profile.isPro && itineraries.length >= FREE_SAVE_LIMIT) {
      setActiveTab('settings');
      return;
    }

    try {
      const dupQuery = query(
        collection(db, 'itineraries'),
        where('uid', '==', user.uid),
        where('title', '==', itineraryData.title || ''),
        limit(1)
      );
      const dupSnapshot = await getDocs(dupQuery);
      if (!dupSnapshot.empty) return;

      await addDoc(collection(db, 'itineraries'), {
        ...itineraryData,
        uid: user.uid,
        status: 'dreamed',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'itineraries');
    }
  };

  const updateItinerary = async (id: string, status: ItineraryStatus) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'itineraries', id), { status }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', 'itineraries');
    }
  };

  const saveBulkLogs = async (bulkLogs: Partial<TravelLog>[]) => {
    if (!user || !profile) return;

    if (isDemoMode()) {
      const newLogs = bulkLogs.map(log => ({
        ...log,
        id: `demo-log-${Date.now()}-${Math.random()}`,
        uid: user.uid,
        createdAt: new Date().toISOString(),
      })) as TravelLog[];
      setLogs(prev => [...prev, ...newLogs]);
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const log of bulkLogs) {
        const logRef = doc(collection(db, 'travelLogs'));
        batch.set(logRef, { ...log, uid: user.uid });
      }
      // Update XP and stats
      const allLogs = [...logs, ...bulkLogs.map(l => ({ ...l, uid: user.uid } as TravelLog))];
      const uniqueCountries = new Set(allLogs.map(l => l.countryCode)).size;
      const newXp = profile.xp + bulkLogs.length * 20;
      const newLevel = getLevelFromXp(newXp);
      const profileRef = doc(db, 'users', user.uid);
      batch.update(profileRef, {
        xp: newXp,
        level: newLevel,
        totalCountries: uniqueCountries,
        totalCities: allLogs.length,
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'write', 'travelLogs/bulk');
    }
  };

  const handleGlobePaintComplete = async (countries: PaintedCountry[]) => {
    if (!user || !profile) return;

    if (isDemoMode()) {
      const newLogs: TravelLog[] = countries.flatMap(c => {
        if (c.cities.length > 0) {
          return c.cities.map(city => ({
            id: `demo-log-${Date.now()}-${Math.random()}`,
            countryCode: c.code,
            countryName: c.name,
            cityName: city.name,
            continent: c.continent,
            year: city.year || new Date().getFullYear(),
            month: city.month,
            uid: user.uid,
            createdAt: new Date().toISOString(),
          }));
        }
        return [{
          id: `demo-log-${Date.now()}-${Math.random()}`,
          countryCode: c.code,
          countryName: c.name,
          cityName: c.name,
          continent: c.continent,
          year: new Date().getFullYear(),
          uid: user.uid,
          createdAt: new Date().toISOString(),
        }];
      });
      setLogs(prev => [...prev, ...newLogs]);
      setProfile({ ...profile, historyOnboarded: true });
      setShowGlobePaint(false);
      setActiveTab('planner');
      return;
    }

    try {
      const batch = writeBatch(db);
      const newLogs: Partial<TravelLog>[] = countries.flatMap(c => {
        if (c.cities.length > 0) {
          return c.cities.map(city => ({
            countryCode: c.code,
            countryName: c.name,
            cityName: city.name,
            continent: c.continent,
            year: city.year || new Date().getFullYear(),
            month: city.month,
            uid: user.uid,
            createdAt: new Date().toISOString(),
          }));
        }
        // No cities: create one log with country name as city
        return [{
          countryCode: c.code,
          countryName: c.name,
          cityName: c.name,
          continent: c.continent,
          year: new Date().getFullYear(),
          uid: user.uid,
          createdAt: new Date().toISOString(),
        }];
      });

      for (const log of newLogs) {
        const logRef = doc(collection(db, 'travelLogs'));
        batch.set(logRef, log);
      }

      // Update profile: XP, stats, historyOnboarded
      const allLogs = [...logs, ...newLogs.map(l => l as TravelLog)];
      const uniqueCountries = new Set(allLogs.map(l => l.countryCode)).size;
      const newXp = profile.xp + countries.length * 10; // 10 XP per country (lighter than normal 20)
      const newLevel = getLevelFromXp(newXp);
      const profileRef = doc(db, 'users', user.uid);
      batch.update(profileRef, {
        xp: newXp,
        level: newLevel,
        totalCountries: uniqueCountries,
        totalCities: allLogs.length,
        historyOnboarded: true,
      });
      await batch.commit();
      setProfile({ ...profile, xp: newXp, level: newLevel, totalCountries: uniqueCountries, totalCities: allLogs.length, historyOnboarded: true });
      setShowGlobePaint(false);
      setActiveTab('planner');
    } catch (err) {
      handleFirestoreError(err, 'write', 'travelLogs/globePaint');
      setShowGlobePaint(false);
    }
  };

  const handleGlobePaintSkip = async () => {
    if (!user || !profile) return;

    if (isDemoMode()) {
      setProfile({ ...profile, historyOnboarded: true });
      setShowGlobePaint(false);
      return;
    }

    try {
      const profileRef = doc(db, 'users', user.uid);
      await setDoc(profileRef, { historyOnboarded: true }, { merge: true });
      setProfile({ ...profile, historyOnboarded: true });
    } catch (err) {
      console.error('Failed to update historyOnboarded:', err);
    }
    setShowGlobePaint(false);
  };

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (provider: 'google' | 'apple' = 'google') => {
    setLoginError(null);
    setLoading(true);
    const providerLabel = provider === 'apple' ? 'Apple' : 'Google';
    trackEvent(`${providerLabel} Login Started`);
    try {
      if (provider === 'apple') {
        await signInWithApple();
      } else {
        await signInWithGoogle();
      }
      trackEvent(`${providerLabel} Login Succeeded`);
      setCurrentView('app');
    } catch (err: any) {
      console.error("Login error:", err);
      trackEvent(`${providerLabel} Login Failed`, {
        errorCode: err?.code,
      });
      if (err.code === 'auth/popup-blocked') {
        setLoginError("Popup was blocked. Please allow popups and try again.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError("This domain isn't authorized for sign-in. Add localhost to Firebase Auth authorized domains.");
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, not a fatal error
      } else {
        setLoginError(err.message || "Failed to sign in. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleEmailAuth = async (
    email: string,
    password: string,
    mode: 'sign_in' | 'sign_up',
  ) => {
    setLoginError(null);
    setLoading(true);
    trackEvent('Email Login Started', { mode });
    try {
      if (mode === 'sign_up') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      trackEvent('Email Login Succeeded', { mode });
      setCurrentView('app');
    } catch (err: any) {
      console.error('Email auth error:', err);
      trackEvent('Email Login Failed', {
        mode,
        errorCode: err?.code,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = (mode: 'sign_in' | 'sign_up' = 'sign_up') => {
    setLoginStartMode(mode);
    setCurrentView('login');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  // Simple path-based routing for legal pages
  const path = window.location.pathname;
  const goHome = () => { window.history.pushState({}, '', '/'); window.location.reload(); };
  const cookieBannerNode = showCookieBanner && !showTour && !isDemoMode() ? (
    <AnimatePresence>
      <CookieBanner onAccept={handleCookieAccept} onDecline={handleCookieDecline} />
    </AnimatePresence>
  ) : null;
  const profileAvatarUrl = getAvatarUrl(profile?.photoURL);

  if (path === '/privacy') {
    return <PrivacyPolicy onBack={goHome} />;
  }
  if (path === '/terms') {
    return <TermsOfService onBack={goHome} />;
  }

  // Admin panel route (admin only)
  if (path === '/admin') {
    if (loading) return null;
    if (!user || user.email !== ADMIN_EMAIL) {
      return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
    }
    return <AdminPanel onBack={goHome} />;
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative w-24 h-24 mb-8">
            <div className="w-24 h-24 border-8 border-green-100 border-t-green-500 rounded-full animate-spin shadow-xl" />
            <GlobeIcon className="w-10 h-10 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 animate-pulse">Preparing your passport...</h2>
          <p className="text-gray-400 font-bold mt-2">Connecting to GloboTrotter HQ</p>
        </div>
        {cookieBannerNode}
      </>
    );
  }

  if (currentView === 'landing') {
    return null;
  }

  if (currentView === 'login') {
    return null;
  }

  // currentView === 'app'
  if (!user) {
    return null;
  }

  const navTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'globe', icon: GlobeIcon, label: 'Globe' },
    { id: 'planner', icon: Map, label: 'Planner' },
    { id: 'rewards', icon: Trophy, label: 'Rewards' },
  ] as const;

  const allTabs = [...navTabs, { id: 'settings' as const, icon: SettingsIcon, label: 'Settings' }];

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-24 lg:pb-0">
      <AnimatePresence>
        {user && profile && profile.onboarded === false && (
          <Onboarding
            userEmail={user.email || ''}
            initialName={user.displayName?.split(' ')[0] || ''}
            onComplete={async (data) => {
              await updateProfile({ ...data, onboarded: true });
              // Referral reward: if this user was referred, reward both parties
              if (profile?.referredBy && user) {
                try {
                  const batch = writeBatch(db);
                  // Reward referrer: +2 fuel + increment referralCount
                  const referrerRef = doc(db, 'users', profile.referredBy);
                  batch.update(referrerRef, {
                    credits: increment(2),
                    referralCount: increment(1),
                  });
                  // Reward new user: +2 fuel
                  const myRef = doc(db, 'users', user.uid);
                  batch.update(myRef, { credits: increment(2) });
                  await batch.commit();
                  // Update local profile credits
                  setProfile(prev => prev ? { ...prev, credits: prev.credits + 2 } : prev);
                } catch (err) {
                  console.error('Referral reward failed:', err);
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r-4 border-gray-100 flex-col z-40">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
            <GlobeIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-gray-800 tracking-tight">GloboTrotter</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              data-tour={tab.id === 'dashboard' ? 'dashboard' : tab.id === 'globe' ? 'globe-tab' : tab.id === 'planner' ? 'planner-tab' : tab.id === 'rewards' ? 'rewards-tab' : undefined}
              onClick={() => { setActiveTab(tab.id as any); setSelectedLog(null); }}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                  : 'text-gray-400 hover:bg-green-50 hover:text-gray-600'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}

          {user?.email === ADMIN_EMAIL && (
            <button
              onClick={() => { window.history.pushState({}, '', '/admin'); window.location.reload(); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all text-gray-400 hover:bg-green-50 hover:text-gray-600`}
            >
              <SettingsIcon className="w-5 h-5" /> Admin
            </button>
          )}
        </nav>

        {/* Settings + User Panel pinned to bottom */}
        <div className="px-4 pb-4 space-y-2 border-t-2 border-gray-100 pt-3">
          <button
            data-tour="settings-tab"
            onClick={() => { setActiveTab('settings'); setSelectedLog(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
              activeTab === 'settings'
                ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                : 'text-gray-400 hover:bg-green-50 hover:text-gray-600'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </button>

          <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-2xl">
            <div className="relative shrink-0">
              <div className="w-11 h-11 min-w-[2.75rem] rounded-lg overflow-hidden bg-gray-100 border-2 border-green-100">
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={profile?.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || '')}&background=22c55e&color=fff&size=128`}
                    alt={profile?.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getTierBg(LEVELS.find(l => l.level === profile?.level)?.tier || 'Bronze')} rounded-md rotate-12 flex items-center justify-center shadow-md border border-white`}>
                <span className="text-[10px] font-black text-white -rotate-12 leading-none">{profile?.level}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-gray-800 flex items-center gap-2">
                <span className="truncate">{profile?.displayName}</span>
                {profile?.isPro && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-sm">
                    PRO
                  </span>
                )}
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${getTierText(LEVELS.find(l => l.level === profile?.level)?.tier || 'Bronze')}`}>LVL {profile?.level}</div>
            </div>
            <button
              onClick={clearDemoAndLogout}
              title="Restart demo"
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className="lg:hidden bg-white border-b-4 border-gray-100 sticky top-0 z-40 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-sm">
              <GlobeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-gray-800 tracking-tight">GloboTrotter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div className="w-9 h-9 min-w-[2.25rem] rounded-md overflow-hidden bg-gray-100 border-2 border-green-100">
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={profile?.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || '')}&background=22c55e&color=fff&size=128`}
                    alt={profile?.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getTierBg(LEVELS.find(l => l.level === profile?.level)?.tier || 'Bronze')} rounded-sm rotate-12 flex items-center justify-center shadow-md border border-white`}>
                <span className="text-[8px] font-black text-white -rotate-12 leading-none">{profile?.level}</span>
              </div>
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-black text-gray-800 flex items-center gap-1.5 min-w-0">
                <span className="truncate">{profile?.displayName}</span>
                {profile?.isPro && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[8px] font-black uppercase tracking-wider rounded-full">
                    PRO
                  </span>
                )}
              </div>
              <div className={`text-[9px] font-black uppercase tracking-widest ${getTierText(LEVELS.find(l => l.level === profile?.level)?.tier || 'Bronze')}`}>LVL {profile?.level}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative lg:ml-64">
        <AnimatePresence mode="wait">
          {selectedLog ? (
            <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <JournalView
                log={selectedLog}
                profile={profile!}
                onBack={() => setSelectedLog(null)}
                onUpdate={updateLog}
                onDelete={() => { deleteLog(selectedLog); setSelectedLog(null); }}
                onPlanTrip={demoWalkEnabled ? () => {
                  setSelectedLog(null);
                  setCountryTrips(null);
                  setShowNostalgia(false);
                  setActiveTab('planner');
                  setPlannerView('planner');
                  setDemoWalkEnabled(true);
                  setDemoWalkStepId('plannerCards');
                } : undefined}
                demoWalkStepId={demoWalkEnabled ? demoWalkStepId : undefined}
                onDemoWalkAdvance={demoWalkEnabled ? (stepId) => setDemoWalkStepId(stepId as any) : undefined}
              />
            </motion.div>
          ) : activeTab === 'dashboard' && profile && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard 
                profile={profile} 
                logs={logs} 
                earnedBadges={(() => {
                  const ISLAND_NATIONS = new Set(['Maldives', 'Fiji', 'Jamaica', 'Cuba', 'Iceland', 'Japan', 'Philippines', 'Indonesia', 'Sri Lanka', 'Madagascar', 'New Zealand', 'Singapore', 'Bahamas', 'Barbados', 'Trinidad and Tobago', 'Mauritius', 'Seychelles', 'Malta', 'Cyprus', 'Cabo Verde', 'Comoros', 'Dominica', 'Grenada', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'Palau', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Sao Tome and Principe', 'East Timor', 'Papua New Guinea', 'Antigua and Barbuda', 'Bahrain']);
                  const MILESTONE_AGES = [18, 21, 30, 40, 50, 60];
                  const uniqueCountries = new Set(logs.map(l => l.countryCode)).size;
                  const totalCities = logs.length;
                  const photosCount = logs.filter(l => l.photoUrl).length;
                  const yearsCount = new Set(logs.map(l => l.year)).size;
                  const earlyBird = logs.some(l => l.age < 10);

                  const getBadgeProgress = (badgeId: string) => {
                    const badge = BADGES.find(b => b.id === badgeId);
                    if (!badge) return { earned: false };

                    let value = 0;
                    let hasAntarctica = false;

                    switch (badgeId) {
                      case 'explorer': value = 1; break;
                      case 'cities': value = totalCities; break;
                      case 'countries': value = uniqueCountries; break;
                      case 'photos': value = photosCount; break;
                      case 'early_bird': value = earlyBird ? 1 : 0; break;
                      case 'loyalty': value = yearsCount; break;
                      case 'decades': value = new Set(logs.map(l => Math.floor(l.year / 10))).size; break;
                      case 'golden_voyager': value = logs.some(l => l.age >= 70) ? 1 : 0; break;
                      case 'duration': value = Math.max(0, ...logs.map(l => l.duration || 0)); break;
                      case 'continents': value = new Set(logs.map(l => l.continent)).size; break;
                      case 'referrals': value = profile.referralCount || 0; break;
                      case 'weekend_warrior': value = logs.filter(l => l.duration && l.duration <= 3).length; break;
                      case 'island_hopper': value = new Set(logs.filter(l => ISLAND_NATIONS.has(l.countryName)).map(l => l.countryName)).size; break;
                      case 'milestone_trip': value = new Set(logs.filter(l => l.age && MILESTONE_AGES.includes(l.age)).map(l => l.age)).size; break;
                      case 'home_explorer': value = logs.filter(l => l.countryName === profile.homeCountry).length; break;
                      case 'jet_setter': {
                        const countriesByYear: Record<number, Set<string>> = {};
                        logs.forEach(l => {
                          if (!countriesByYear[l.year]) countriesByYear[l.year] = new Set();
                          countriesByYear[l.year].add(l.countryCode);
                        });
                        value = Math.max(0, ...Object.values(countriesByYear).map(s => s.size));
                        break;
                      }
                      case 'antarctica':
                        hasAntarctica = logs.some(l => l.continent === 'Antarctica');
                        value = hasAntarctica ? 1 : 0;
                        break;
                      case 'extreme_explorer':
                        hasAntarctica = logs.some(l => l.continent === 'Antarctica');
                        value = new Set(logs.map(l => l.continent)).size;
                        break;
                    }

                    let currentTierIndex = badge.tiers.findIndex(t => value < t.target);
                    if (currentTierIndex === -1) currentTierIndex = badge.tiers.length - 1;
                    const currentTier = badge.tiers[currentTierIndex];

                    const earned = badgeId === 'extreme_explorer'
                      ? (value >= currentTier.target && hasAntarctica)
                      : value >= currentTier.target;
                    return { earned };
                  };
                  return BADGES.filter(b => getBadgeProgress(b.id).earned);
                })()}
                onLogClick={setSelectedLog}
                onBulkEntry={() => setShowBulkEntry(true)}
                onPlanTrip={() => setActiveTab('planner')}
                onGlobePaint={() => setShowGlobePaint(true)}
                onDeleteLog={deleteLog}
                onDiscoveryRevealed={handleDiscoveryRevealed}
                onUpdate={updateLog}
                demoWalkStepId={demoWalkEnabled ? demoWalkStepId : undefined}
              />
            </motion.div>
          )}
          
          {activeTab === 'globe' && (
            <motion.div key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto p-4 md:p-6 pb-24 lg:pb-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Your World</h2>
                <p className="text-sm text-gray-400 font-bold mt-1">
                  {(() => {
                    const count = new Set(logs.map(l => l.countryCode)).size;
                    if (count === 0) return "Ready to paint your first country?";
                    if (count <= 5) return "A few spots on the map already. Nice work.";
                    if (count <= 10) return "Look at all the ground you've covered.";
                    if (count <= 19) return "Your globe is looking pretty green from up here.";
                    return "At this point, the blank spots are the rare part.";
                  })()}
                </p>
              </div>
              <Globe
                visitedCountries={logs.map(l => l.countryCode)}
                focusCountryCode={demoWalkEnabled && demoWalkStepId === 'globePortugal' ? '392' : undefined}
                interactiveCountryCodes={demoWalkEnabled && demoWalkStepId === 'globePortugal' ? ['392'] : undefined}
                lockInteraction={demoWalkEnabled && demoWalkStepId === 'globePortugal'}
                pulseCountryCode={demoWalkEnabled && demoWalkStepId === 'globePortugal' ? '392' : undefined}
                onCountryClick={(code, name) => {
                  const paddedCode = String(code).padStart(3, '0');
                  const countryLogs = logs.filter(l => {
                    const logCode = String(l.countryCode).padStart(3, '0');
                    return logCode === paddedCode;
                  });
                  if (countryLogs.length > 0) {
                    setShowNostalgia(false);
                    setCountryTrips({ name, logs: countryLogs.sort((a, b) => b.year - a.year) });
                    if (demoWalkEnabled && demoWalkStepId === 'globePortugal' && paddedCode === '392') {
                      setDemoWalkStepId('portugalMemory');
                    }
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'planner' && profile && plannerView === 'mytrips' && (
            <motion.div key="mytrips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SavedTrips
                itineraries={itineraries}
                onUpdateStatus={updateItinerary}
                onBack={() => setPlannerView('planner')}
                onPlanTrip={() => setPlannerView('planner')}
              />
            </motion.div>
          )}

          {activeTab === 'planner' && profile && plannerView === 'planner' && (
            <motion.div key="planner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ItineraryPlanner
                onSave={saveItinerary}
                savedItineraries={itineraries}
                credits={profile.credits}
                travelDna={logs.length > 0 ? computeTravelDna(logs, profile) : null}
                profile={profile}
                tripCount={logs.length}
                onGlobePaint={() => setShowGlobePaint(true)}
                onFuelUsed={() => setProfile(p => p ? { ...p, credits: p.credits - 2 } : p)}
                isPro={profile.isPro ?? false}
                onUpgrade={() => setActiveTab('settings')}
                onViewMyTrips={() => setPlannerView('mytrips')}
                demoWalkStepId={demoWalkEnabled ? demoWalkStepId : undefined}
                onDemoWalkAdvance={(stepId) => setDemoWalkStepId(stepId as any)}
              />
            </motion.div>
          )}

          {activeTab === 'rewards' && profile && (
            <motion.div key="rewards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Rewards
                profile={profile}
                logs={logs}
                demoWalkStepId={demoWalkEnabled ? demoWalkStepId : undefined}
                demoHighlightBadgeId={demoWalkEnabled ? demoRewardBadgeId : undefined}
                onDemoWalkAdvance={demoWalkEnabled ? (stepId) => setDemoWalkStepId(stepId as any) : undefined}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && profile && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Settings profile={profile} onUpdate={updateProfile} onLogout={clearDemoAndLogout} onCheckReferralCode={checkReferralCode} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-gray-100 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-2 sm:px-4 pt-2 pb-2 flex justify-around items-end">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              data-tour={tab.id === 'dashboard' ? 'dashboard' : tab.id === 'globe' ? 'globe-tab' : tab.id === 'planner' ? 'planner-tab' : tab.id === 'rewards' ? 'rewards-tab' : tab.id === 'settings' ? 'settings-tab' : undefined}
              onClick={() => { setActiveTab(tab.id as any); setSelectedLog(null); }}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                activeTab === tab.id ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              <tab.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        data-tour="add-trip"
        onClick={() => {
          setSelectedCountry(null);
          setShowForm(true);
          if (demoWalkEnabled && demoWalkStepId === 'addTrip') {
            window.setTimeout(() => advanceDemoWalkthroughOnTarget(), 0);
          }
        }}
        className="fixed bottom-24 right-5 sm:bottom-28 sm:right-8 md:bottom-28 md:right-8 lg:bottom-8 lg:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-[0_6px_0_0_#16a34a] sm:shadow-[0_8px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center z-50 group"
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-90 transition-transform" />
      </button>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <div data-tour-surface role="dialog" aria-modal="true" aria-label="Log a trip" className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (demoWalkEnabled) return;
                setShowForm(false);
              }}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <div className={`relative z-10 w-full my-auto ${demoWalkEnabled ? 'max-w-5xl' : 'max-w-md'}`}>
              <ErrorBoundary>
                <TravelForm
                  initialCountry={selectedCountry || undefined}
                  birthDate={profile.birthDate}
                  onSave={saveLog}
                  onCancel={() => {
                    if (demoWalkEnabled) return;
                    setShowForm(false);
                  }}
                  prefill={demoWalkEnabled ? (demoWalkPrefill ?? undefined) : undefined}
                  lockPrefill={demoWalkEnabled && demoWalkLockForm}
                  compact={demoWalkEnabled}
                  demoWalkStepId={demoWalkEnabled ? demoWalkStepId : undefined}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Country Trips Modal */}
      <AnimatePresence>
        {countryTrips && (
          <div data-tour-surface role="dialog" aria-modal="true" aria-label={`Trips in ${countryTrips.name}`} className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCountryTrips(null)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl border-4 border-green-100 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="p-5 sm:p-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-800">{countryTrips.name}</h2>
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">
                    {countryTrips.logs.length} {countryTrips.logs.length === 1 ? 'trip' : 'trips'} logged
                  </p>
                </div>
                <button onClick={() => setCountryTrips(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 sm:p-6 space-y-3">
                {countryTrips.logs.map((log, i) => {
                  const flagCode = { '724': 'es', '840': 'us', '356': 'in', '826': 'gb', '250': 'fr', '276': 'de', '380': 'it', '392': 'jp', '036': 'au', '124': 'ca', '578': 'no', '752': 'se', '246': 'fi', '528': 'nl', '056': 'be', '756': 'ch', '040': 'at', '616': 'pl', '554': 'nz', '710': 'za', '076': 'br', '032': 'ar', '152': 'cl', '484': 'mx', '156': 'cn', '410': 'kr', '702': 'sg', '764': 'th', '458': 'my', '360': 'id', '608': 'ph', '704': 'vn', '818': 'eg', '784': 'ae', '682': 'sa', '376': 'il', '792': 'tr', '643': 'ru', '804': 'ua', '300': 'gr', '620': 'pt', '348': 'hu', '203': 'cz', '703': 'sk', '642': 'ro', '100': 'bg', '191': 'hr', '705': 'si', '233': 'ee', '428': 'lv', '440': 'lt', '372': 'ie', '470': 'mt', '196': 'cy', '442': 'lu', '352': 'is' }[String(log.countryCode).padStart(3, '0')] || 'un';
                  return (
                  <motion.button
                    key={log.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { setSelectedLog(log); setCountryTrips(null); }}
                    data-tour={i === 0 ? 'demo-portugal-memory' : undefined}
                    className="w-full text-left bg-gray-50 hover:bg-green-50 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-200 transition-all group flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                      {log.photoUrl ? (
                        <img
                          src={log.photoUrl}
                          alt={log.cityName}
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest">
                        <img src={`https://flagcdn.com/w40/${flagCode}.png`} alt={log.countryName} className="w-5 h-3 object-cover rounded-sm" referrerPolicy="no-referrer" />
                        {log.countryName}
                      </div>
                      <div className="font-black text-gray-800 text-sm sm:text-base truncate">{log.cityName}</div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="truncate">{formatTravelLogDate(log)}</span>
                      </div>
                    </div>
                  </motion.button>
                );})}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Globe Paint */}
      <AnimatePresence>
        {showGlobePaint && profile && (
          <GlobePaint
            profile={profile}
            existingCountryCodes={logs.map(l => l.countryCode)}
            onComplete={handleGlobePaintComplete}
            onSkip={handleGlobePaintSkip}
          />
        )}
      </AnimatePresence>

      {/* Bulk Trip Entry */}
      <AnimatePresence>
        {showBulkEntry && (
          <BulkTripEntry
            birthDate={profile?.birthDate}
            onSave={saveBulkLogs}
            onClose={() => setShowBulkEntry(false)}
          />
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[300] font-bold"
          >
            <AlertCircle className="w-6 h-6" />
            {error}
            <button onClick={() => setError(null)} className="ml-4 hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stripe Status Toasts */}
      <AnimatePresence>
        {stripeStatus === 'pro' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[200] font-bold whitespace-nowrap"
          >
            <Trophy className="w-6 h-6 text-yellow-300" />
            Welcome to GloboTrotter Pro!
            <button onClick={() => setStripeStatus(null)} className="ml-4 hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
        {stripeStatus === 'canceled' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[200] font-bold"
          >
            <AlertCircle className="w-6 h-6 text-gray-400" />
            Checkout Canceled
            <button onClick={() => setStripeStatus(null)} className="ml-4 hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {demoWalkEnabled && (
        <DemoWalkthrough
          isOpen={demoWalkEnabled && !!demoWalkStep}
          step={demoWalkStep}
          onSkip={() => { skipDemoWalkthrough(); }}
          onTargetClick={() => { advanceDemoWalkthroughOnTarget(); }}
        />
      )}

      {cookieBannerNode}

      <AnimatePresence>
        {showNostalgia && demoWalkEnabled && DEMO_ONBOARDING_TRIP.historicalContext && (
          <NostalgiaCelebration
            tourStepId={demoWalkStepId}
            log={{
              cityName: DEMO_ONBOARDING_TRIP.cityName,
              countryName: DEMO_ONBOARDING_TRIP.countryName,
              year: DEMO_ONBOARDING_TRIP.year,
              month: DEMO_ONBOARDING_TRIP.month,
            }}
            context={DEMO_ONBOARDING_TRIP.historicalContext}
            onTourTargetClick={advanceDemoWalkthroughOnTarget}
              onDismiss={() => {
                setShowNostalgia(false);
                setActiveTab('globe');
                window.setTimeout(() => setDemoWalkStepId('globePortugal'), 220);
              }}
          />
        )}
      </AnimatePresence>

      <GuidedTour
        isOpen={showTour && !demoWalkEnabled}
        onComplete={completeTour}
        onSkip={completeTour}
        currentStep={tourStep}
        onNext={nextTourStep}
        onPrev={prevTourStep}
      />
    </div>
  );
};

export default App;
