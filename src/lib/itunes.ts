export interface TrackInfo {
  artworkUrl: string;
  previewUrl: string;
}

const cache = new Map<string, TrackInfo | null>();
// In-flight deduplication: multiple callers for the same key share one Promise
const inflight = new Map<string, Promise<TrackInfo | null>>();

/**
 * Fetch track info (artwork + preview URL) from iTunes Search API.
 * Returns null on failure. Positive results and explicit "no artwork" are cached.
 * Empty result sets (iTunes rate-limit response) are NOT cached so the next mount retries.
 * Concurrent calls for the same key share a single in-flight Promise.
 */
export async function fetchTrackInfo(song: string, artist: string): Promise<TrackInfo | null> {
  const key = `${song}|||${artist}`;
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = (async () => {
    try {
      const term = encodeURIComponent(`${song} ${artist}`);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`
      );
      if (!res.ok) {
        // HTTP error (429, 5xx) — transient, don't cache
        return null;
      }
      const data = await res.json();
      // Empty results array = iTunes rate-limiting returning a 200 with no matches.
      // Do NOT cache null here — allow the next mount to retry.
      if (!data.results?.length) return null;
      const result = data.results[0];
      if (!result?.artworkUrl100) {
        // Explicit "song found but no artwork" — safe to cache
        cache.set(key, null);
        return null;
      }
      const info: TrackInfo = {
        artworkUrl: result.artworkUrl100.replace('100x100', '600x600'),
        previewUrl: result.previewUrl ?? '',
      };
      cache.set(key, info);
      return info;
    } catch {
      // Network error — don't cache
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Backwards-compat export for Dashboard.tsx */
export async function fetchAlbumArt(song: string, artist: string): Promise<string | null> {
  const info = await fetchTrackInfo(song, artist);
  return info ? info.artworkUrl : null;
}
