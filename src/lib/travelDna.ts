import { TravelLog, TravelDna, UserProfile } from '../types';
import { friendlyCountryName } from './countryNames';

const ALL_CONTINENTS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'];

export function computeTravelDna(logs: TravelLog[], profile: UserProfile): TravelDna {
  const visitedCountries = [...new Set(logs.map(l => l.countryName))];
  const visitedCities = [...new Set(logs.map(l => l.cityName))];
  const coveredContinents = [...new Set(logs.map(l => l.continent).filter(Boolean))] as string[];
  const missingContinents = ALL_CONTINENTS.filter(c => !coveredContinents.includes(c));

  // Average trip duration (only from logs that have duration)
  const durations = logs.map(l => l.duration).filter((d): d is number => d != null && d > 0);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 7; // default

  // Most visited continent
  const continentCounts: Record<string, number> = {};
  logs.forEach(l => {
    if (l.continent) continentCounts[l.continent] = (continentCounts[l.continent] || 0) + 1;
  });
  const mostVisitedContinent = Object.entries(continentCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  return {
    visitedCountries,
    visitedCities,
    coveredContinents,
    missingContinents,
    totalCountries: visitedCountries.length,
    avgDuration,
    mostVisitedContinent,
    interests: profile.interests || [],
    travelGoals: profile.travelGoals || [],
    homeCountry: friendlyCountryName(profile.homeCountry || 'Unknown'),
    displayName: profile.displayName,
  };
}

/** Build a one-line "gap finder" suggestion from the travel DNA */
export function getGapSuggestion(dna: TravelDna): string | null {
  if (dna.missingContinents.length > 0 && dna.missingContinents.length <= 4) {
    const missing = dna.missingContinents.filter(c => c !== 'Antarctica');
    if (missing.length > 0) {
      return `You haven't explored ${missing[0]} yet — ready to change that?`;
    }
  }
  if (dna.totalCountries > 0 && dna.totalCountries < 10) {
    return `You're at ${dna.totalCountries} countries — let's get you to 10!`;
  }
  if (dna.totalCountries >= 10 && dna.totalCountries < 25) {
    return `${dna.totalCountries} countries down — halfway to 50!`;
  }
  return null;
}
