import { TravelDna } from '../types';
import { auth } from '../firebase';

export type PlannerIntent = 'surprise' | 'destination' | 'goal' | 'weekend' | 'budget';

interface PlanRequest {
  intent: PlannerIntent;
  dna: TravelDna;
  destination?: string;
  duration?: number;
  goal?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export async function generateItinerary(destinations: string[]) {
  const res = await fetch('/.netlify/functions/ai-proxy', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'generateItinerary',
      payload: { intent: 'destination', dna: { visitedCountries: [], visitedCities: [], coveredContinents: [], missingContinents: [], totalCountries: 0, avgDuration: 7, mostVisitedContinent: 'None', interests: [], travelGoals: [], homeCountry: 'Unknown', displayName: 'Traveler' }, destination: destinations.join(', '), duration: 7 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}

export async function generateSmartItinerary(req: PlanRequest) {
  const res = await fetch('/.netlify/functions/ai-proxy', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'generateItinerary', payload: req }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}


export async function refineItinerary(itinerary: any, instruction: string) {
  const res = await fetch('/.netlify/functions/ai-proxy', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'refineItinerary', payload: { itinerary, instruction } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Refinement failed' }));
    throw new Error(err.error || 'Refinement failed');
  }
  return res.json();
}

export async function generateHistoricalContext(cityName: string, countryName: string, year: number, month?: number) {
  try {
    const res = await fetch('/.netlify/functions/ai-proxy', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ action: 'generateHistoricalContext', payload: { cityName, countryName, year, month } }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
