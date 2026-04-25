declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let measurementId: string | null = null;

const toEventName = (eventName: string) =>
  eventName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'custom_event';

const toParamKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const sanitizeValue = (value: unknown): string | number | boolean => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return JSON.stringify(value);
};

// Keep GA user properties intentionally narrow so we avoid sending noisy or sensitive data.
const safeUserProperties = (traits?: Record<string, unknown>) => {
  if (!traits) return {};

  const allowedKeys = new Set([
    'level',
    'xp',
    'credits',
    'isPro',
    'loginCount',
    'totalCountries',
    'totalCities',
    'referralCount',
    'onboarded',
  ]);

  return Object.entries(traits).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (!allowedKeys.has(key)) return acc;
    acc[toParamKey(key)] = sanitizeValue(value);
    return acc;
  }, {});
};

const pushGtag = (...args: unknown[]) => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...args);
};

const ensureStub = () => {
  if (typeof window === 'undefined') return false;
  window.dataLayer = window.dataLayer || [];
  // The head snippet defines gtag, but this fallback keeps the app resilient during local startup.
  window.gtag =
    window.gtag ||
    function gtagStub(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  return true;
};

export function initAnalytics(id?: string) {
  try {
    if (!id || typeof window === 'undefined') return;

    measurementId = id;
    ensureStub();
  } catch {
    // Swallow init errors in case analytics is disabled in dev.
  }
}

export function trackPageView(pathname?: string) {
  try {
    if (!measurementId) return;

    pushGtag('event', 'page_view', {
      page_title: typeof document !== 'undefined' ? document.title : undefined,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      page_path: pathname ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    });
  } catch {
    // Ignore tracking failures in prod.
  }
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  try {
    if (!measurementId) return;

    const params = Object.entries(properties || {}).reduce<Record<string, string | number | boolean>>(
      (acc, [key, value]) => {
        acc[toParamKey(key)] = sanitizeValue(value);
        return acc;
      },
      {},
    );

    pushGtag('event', toEventName(eventName), params);
  } catch {
    // Ignore tracking failures in prod.
  }
}

export function identifyUser(uid: string, traits?: Record<string, unknown>) {
  try {
    if (!measurementId) return;

    pushGtag('config', measurementId, { user_id: uid });
    const userProperties = safeUserProperties(traits);
    if (Object.keys(userProperties).length > 0) {
      pushGtag('set', 'user_properties', userProperties);
    }
  } catch {
    // Ignore failures.
  }
}

export function resetUser() {
  try {
    if (!measurementId) return;

    pushGtag('config', measurementId, { user_id: null });
    pushGtag('set', 'user_properties', {});
  } catch {
    // Ignore failures.
  }
}
