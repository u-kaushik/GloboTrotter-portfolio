// TODO: Add VITE_TMDB_API_KEY to .env (Netlify env var: TMDB_API_KEY exposed via vite.config.ts)
// Get a free read-access token at https://developer.themoviedb.org/
// Without it, Cinema cards render text-only (graceful fallback).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TMDB_KEY = (import.meta as any).env?.VITE_TMDB_API_KEY as string | undefined;
const cache = new Map<string, string | null>();

/**
 * Fetch a TMDB poster URL for a movie/show title.
 * Returns null if key is missing, network fails, or no result found.
 * Results are cached by title so re-renders don't re-fetch.
 */
export async function fetchTmdbPoster(title: string): Promise<string | null> {
  if (!TMDB_KEY) return null;

  const key = title.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const query = encodeURIComponent(title);
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${query}&include_adult=false&language=en-US&page=1`,
      { headers: { Authorization: `Bearer ${TMDB_KEY}` } }
    );
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = await res.json();
    const posterPath = data.results?.[0]?.poster_path;
    if (!posterPath) {
      cache.set(key, null);
      return null;
    }
    const url = `https://image.tmdb.org/t/p/w185${posterPath}`;
    cache.set(key, url);
    return url;
  } catch {
    cache.set(key, null);
    return null;
  }
}
