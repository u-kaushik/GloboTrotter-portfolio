import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TravelLog, Story } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Google avatars default to =s96-c (96px). This helper upsizes them so they
// don't look pixelated/clipped when rendered in larger containers.
export const getAvatarUrl = (photoURL?: string, fallbackSize = 256): string | undefined => {
  if (!photoURL) return undefined;
  if (photoURL.includes('lh3.googleusercontent.com') || photoURL.includes('lh4.googleusercontent.com') || photoURL.includes('lh5.googleusercontent.com') || photoURL.includes('lh6.googleusercontent.com')) {
    return photoURL.replace(/=s\d+-c?/, `=s${fallbackSize}-c`);
  }
  return photoURL;
};

// Normalize all legacy content fields (notes, moments, souvenirs) + new stories
// into a single unified Story[]. Mirrors JournalView.tsx normalizeSouvenirs.
export function normalizeStories(log: TravelLog): Story[] {
  const notesCards: Story[] = log.notes?.trim()
    ? [{ type: 'text' as const, caption: log.notes.trim(), backgroundColor: 'charcoal' as const, createdAt: log.createdAt }]
    : [];

  const momentCards: Story[] = (log.moments || [])
    .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
    .map(m => ({ type: 'text' as const, caption: m, backgroundColor: 'charcoal' as const, createdAt: log.createdAt }));

  const souvenirCards: Story[] = (log.souvenirs || [])
    .filter(url => typeof url === 'string')
    .map(url => {
      if (url.startsWith('http') || url.startsWith('data:')) {
        return { type: 'photo' as const, mediaUrl: url, createdAt: log.createdAt };
      }
      return { type: 'text' as const, caption: url, backgroundColor: 'charcoal' as const, createdAt: log.createdAt };
    });

  return [...notesCards, ...momentCards, ...souvenirCards, ...(log.stories || [])];
}

// Helper to format travel log date info
export const formatTravelLogDate = (log: TravelLog) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parts: string[] = [];
  
  // Safely parse month - it could be a number or a string
  let parsedMonth: number | undefined = undefined;
  if (log.month != null) {
    if (typeof log.month === 'number') parsedMonth = log.month;
    else if (typeof log.month === 'string') {
      const asInt = parseInt(log.month, 10);
      if (!isNaN(asInt)) {
        parsedMonth = asInt;
      } else {
        const mIndex = months.findIndex(m => m.toLowerCase() === String(log.month).trim().toLowerCase().slice(0, 3));
        if (mIndex !== -1) parsedMonth = mIndex + 1;
      }
    }
  }
  
  if (parsedMonth && parsedMonth >= 1 && parsedMonth <= 12 && log.year) {
    const m = months[parsedMonth - 1];
    parts.push(`${m} ${log.year}`);
  } else if (log.year) {
    parts.push(String(log.year));
  }

  // Safely parse duration
  let parsedDuration: number | undefined = undefined;
  // @ts-ignore
  const rawDuration = log.duration ?? log.days;
  if (rawDuration != null) {
    if (typeof rawDuration === 'number') parsedDuration = rawDuration;
    else if (typeof rawDuration === 'string' && !isNaN(parseInt(rawDuration, 10))) {
      parsedDuration = parseInt(rawDuration, 10);
    }
  }
  
  if (parsedDuration && parsedDuration > 0) {
    parts.push(`${parsedDuration} ${parsedDuration === 1 ? 'day' : 'days'}`);
  }
  return parts.join(' • ');
};
