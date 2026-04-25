export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  authProvider?: string;
  photoURL?: string;
  birthDate?: string;
  homeCountry?: string;
  interests?: string[];
  travelGoals?: string[];
  onboarded?: boolean;
  onboardingStep?: number;
  level: number;
  xp: number;
  badges: string[];
  totalCountries: number;
  totalCities: number;
  credits: number; // AI Travel Fuel
  isPro?: boolean; // granted by Stripe webhook after Pro purchase
  appStoreProBonusGranted?: boolean;
  referralCode?: string;
  referredBy?: string; // referrer's UID
  referredByName?: string; // referrer's display name, captured at signup
  referralCount?: number;
  showAge?: boolean; // whether to display age on travel cards (default true)
  historyOnboarded?: boolean; // true after completing Globe Paint
  lastLogin?: string;
  loginCount?: number;
  discoveryStreak?: number; // consecutive days a discovery has been revealed
  lastDiscoveryDate?: string; // ISO date of last reveal e.g. "2026-04-13"
}

export interface HistoricalContext {
  openingLine?: string;
  cityPulse?: string;
  foodMoment?: string;
  designNote?: string;
  topSong?: string;
  topArtist?: string;
  artworkUrl?: string; // cached iTunes album art URL — persisted so Dashboard doesn't need to re-fetch
  topSongs?: { title: string; artist: string }[];
  topTeam?: string;
  majorEvent?: string;
  funFact?: string;
  personalizedNugget?: string;
  movieOrShow?: string;
  techMilestone?: string;
}

export type StoryBackgroundColor =
  | 'sunset' | 'ocean' | 'forest' | 'night' | 'coral' | 'charcoal' | 'sage' | 'amber';

export interface Story {
  type: 'photo' | 'video' | 'text';
  mediaUrl?: string;           // Firebase Storage URL for photos/videos
  caption?: string;            // Caption for photo/video, or full text for text cards
  backgroundColor?: StoryBackgroundColor; // For text cards
  createdAt: string;           // ISO timestamp
}

export interface TravelLog {
  id?: string;
  uid: string;
  countryCode: string; // ISO 3166-1 alpha-3
  countryName: string;
  cityName: string;
  age?: number;
  year: number;
  month?: number; // 1-12, optional
  day?: number; // 1-31, optional
  duration?: number; // in days
  continent?: string;
  photoUrl?: string;
  souvenirs?: string[]; // Legacy: array of image URLs (migrated to stories)
  stories?: Story[];   // Instagram-style story cards
  moments?: string[]; // Specific events like "Euro 2016"
  notes?: string;
  historicalContext?: HistoricalContext;
  createdAt: string;
}

export interface ItineraryDay {
  dayNumber: number;
  city: string;
  country: string;
  activities: string[];
  interestHighlight?: string;
  personalConnection?: string;
  localTip?: string;
}

export type ItineraryStatus = 'upcoming' | 'completed' | 'dreamed';

export interface Itinerary {
  id?: string;
  uid: string;
  title: string;
  summary: string;
  intent: string;
  days: ItineraryDay[];
  totalDays: number;
  countries: string[];
  goalProgress?: string;
  destinations: string[]; // kept for backward compat with old itineraries
  createdAt: string;
  status?: ItineraryStatus; // 'upcoming' | 'completed' | 'dreamed' — default 'dreamed'
}

export interface TravelDna {
  visitedCountries: string[];
  visitedCities: string[];
  coveredContinents: string[];
  missingContinents: string[];
  totalCountries: number;
  avgDuration: number;
  mostVisitedContinent: string;
  interests: string[];
  travelGoals: string[];
  homeCountry: string;
  displayName: string;
}
