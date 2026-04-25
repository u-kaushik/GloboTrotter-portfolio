import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ChevronRight, Sparkles, MapPin, Plus, SkipForward, Plane, Globe as GlobeIcon, Search } from 'lucide-react';
import Globe from './Globe';
import { NUMERIC_TO_CONTINENT, POPULAR_CITIES } from '../constants/countries';
import { ALPHA2_TO_NUMERIC, COUNTRIES } from '../constants/onboarding';
import { UserProfile } from '../types';

export interface PaintedCountry {
  code: string;
  name: string;
  continent: string;
  cities: { name: string; month?: number; year: number }[];
}

interface GlobePaintProps {
  profile: UserProfile;
  existingCountryCodes: string[];
  onComplete: (countries: PaintedCountry[]) => void;
  onSkip: () => void;
}

type Phase = 'paint' | 'cities' | 'reveal';

const CELEBRATIONS: Record<number, string> = {
  5: 'Nice start!',
  10: 'Double digits!',
  20: 'Seasoned traveler!',
  30: 'World explorer!',
  40: 'Legendary!',
  50: 'Globetrotter supreme!',
};

const ALL_CONTINENTS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

const NUMERIC_TO_NAME: Record<string, string> = {};
for (const c of COUNTRIES) {
  const num = ALPHA2_TO_NUMERIC[c.alpha2];
  if (num) NUMERIC_TO_NAME[num] = c.name;
}

const GlobePaint: React.FC<GlobePaintProps> = ({ profile, existingCountryCodes, onComplete, onSkip }) => {
  const [phase, setPhase] = useState<Phase>('paint');
  const [painted, setPainted] = useState<Map<string, string>>(new Map());
  const [celebration, setCelebration] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusCode, setFocusCode] = useState<string | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const [cityData, setCityData] = useState<Map<string, { name: string; month?: number; year: number }[]>>(new Map());
  const [currentCityCard, setCurrentCityCard] = useState(0);
  const [customCity, setCustomCity] = useState('');
  const currentYear = new Date().getFullYear();
  const [customMonth, setCustomMonth] = useState<number | ''>('');
  const [customYear, setCustomYear] = useState(currentYear);

  const paintedCodes = useMemo(() => Array.from(painted.keys()), [painted]);
  const totalCount = paintedCodes.length + existingCountryCodes.length;

  const unlockedContinents = useMemo(() => {
    const allCodes = [...paintedCodes, ...existingCountryCodes];
    const continents = new Set<string>();
    allCodes.forEach(code => {
      const cont = NUMERIC_TO_CONTINENT[code];
      if (cont) continents.add(cont);
    });
    return continents;
  }, [paintedCodes, existingCountryCodes]);

  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase();
    return COUNTRIES
      .map(c => ({ name: c.name, code: ALPHA2_TO_NUMERIC[c.alpha2] }))
      .filter(c => c.code && c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery]);

  const handleSearchSelect = (code: string, name: string) => {
    setFocusCode(code);
    if (!painted.has(code)) {
      handlePaintToggle(code, name);
    }
    setSearchQuery('');
    searchRef.current?.blur();
  };

  useEffect(() => {
    const msg = CELEBRATIONS[totalCount];
    if (msg) {
      setCelebration(msg);
      const t = setTimeout(() => setCelebration(null), 2000);
      return () => clearTimeout(t);
    }
  }, [totalCount]);

  const handlePaintToggle = (code: string, name: string) => {
    setPainted(prev => {
      const next = new Map(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.set(code, name);
      }
      return next;
    });
  };

  const cityCardCountries = useMemo(() => {
    const entries = Array.from(painted.entries()).map(([code, name]) => ({ code, name }));
    entries.sort((a, b) => {
      const aHas = POPULAR_CITIES[a.code] ? 1 : 0;
      const bHas = POPULAR_CITIES[b.code] ? 1 : 0;
      return bHas - aHas;
    });
    if (entries.length > 8) return entries.slice(0, 8);
    return entries;
  }, [painted]);

  const handleDone = () => {
    if (painted.size === 0) return;
    setPhase('cities');
  };

  const toggleCity = (countryCode: string, city: string) => {
    setCityData(prev => {
      const next = new Map<string, { name: string; month?: number; year: number }[]>(prev);
      const current = next.get(countryCode) || [];
      const existingIndex = current.findIndex(c => c.name === city);
      if (existingIndex >= 0) {
        next.set(countryCode, current.filter(c => c.name !== city));
      } else {
        next.set(countryCode, [...current, { name: city, month: undefined, year: currentYear }]);
      }
      return next;
    });
  };

  const addCustomCity = (countryCode: string) => {
    if (!customCity.trim()) return;
    const cityNames = customCity.split(',').map(c => c.trim()).filter(c => c);
    
    setCityData(prev => {
      const next = new Map<string, { name: string; month?: number; year: number }[]>(prev);
      let current = next.get(countryCode) || [];
      
      for (const cityName of cityNames) {
        if (!current.find(c => c.name.toLowerCase() === cityName.toLowerCase())) {
          current = [...current, { name: cityName, month: customMonth || undefined, year: customYear }];
        }
      }
      
      next.set(countryCode, current);
      return next;
    });
    setCustomCity('');
    setCustomMonth('');
    setCustomYear(currentYear);
  };

  const skipAllCities = () => {
    setPhase('reveal');
  };

  const nextCityCard = () => {
    if (currentCityCard < cityCardCountries.length - 1) {
      setCurrentCityCard(prev => prev + 1);
      setCustomCity('');
    } else {
      setPhase('reveal');
    }
  };

  const finishAndSave = () => {
    const results: PaintedCountry[] = Array.from(painted.entries()).map(([code, name]) => ({
      code,
      name,
      continent: NUMERIC_TO_CONTINENT[code] || 'Unknown',
      cities: cityData.get(code) || [],
    }));
    onComplete(results);
  };

  const getFlag = (numericCode: string): string => {
    for (const [alpha2, num] of Object.entries(ALPHA2_TO_NUMERIC)) {
      if (num === numericCode) {
        return alpha2.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
      }
    }
    return '🌍';
  };

  if (phase === 'paint') {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-950 flex flex-col overflow-hidden">
        <div className="relative z-10 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onSkip}
              className="text-white/50 hover:text-white/80 text-sm font-bold flex items-center gap-1 transition-colors"
            >
              Skip — I'll start fresh
            </button>
            <div className="text-white/30 text-xs font-bold">
              {profile.displayName}
            </div>
          </div>

          {/* Country search */}
          <div className="relative mb-3">
            <div className="flex items-center bg-white/10 border border-white/15 rounded-xl px-3 py-2 gap-2">
              <Search className="w-4 h-4 text-white/40 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search countries..."
                className="flex-1 bg-transparent text-white text-sm font-bold placeholder-white/30 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/15 rounded-xl overflow-hidden z-50 shadow-xl"
                >
                  {searchResults.map(result => (
                    <button
                      key={result.code}
                      onMouseDown={e => { e.preventDefault(); handleSearchSelect(result.code!, result.name); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10 ${
                        painted.has(result.code!) ? 'text-green-400' : 'text-white/80'
                      }`}
                    >
                      <span className="text-base">{getFlag(result.code!)}</span>
                      <span className="text-sm font-bold">{result.name}</span>
                      {painted.has(result.code!) && <Check className="w-4 h-4 ml-auto shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center">
            {ALL_CONTINENTS.map(cont => (
              <span
                key={cont}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  unlockedContinents.has(cont)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-white/20 border border-white/10'
                }`}
              >
                {unlockedContinents.has(cont) ? '✓ ' : ''}{cont}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative -mt-4">
          <div className="w-full max-w-[500px]">
            <Globe
              mode="paint"
              visitedCountries={existingCountryCodes}
              paintedCountries={paintedCodes}
              onPaintToggle={handlePaintToggle}
              focusCountryCode={focusCode}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 text-center"
          >
            <p className="text-white/80 text-sm sm:text-base font-bold px-4">
              Tap every country you've ever set foot in
            </p>
          </motion.div>

          <AnimatePresence>
            {celebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <div className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-green-500/30 font-black text-lg">
                  {celebration}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-10 px-4 pb-6 pt-2 flex items-center justify-between gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-2.5 rounded-full">
            <span className="text-white font-black text-lg">{totalCount}</span>
            <span className="text-white/50 font-bold text-sm ml-1.5">
              {totalCount === 1 ? 'country' : 'countries'}
            </span>
          </div>

          <AnimatePresence>
            {painted.size > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleDone}
                className="bg-green-500 hover:bg-green-600 text-white font-black px-8 py-3 rounded-full shadow-lg shadow-green-500/30 flex items-center gap-2 text-base transition-colors"
              >
                Done <ChevronRight className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (phase === 'cities') {
    const current = cityCardCountries[currentCityCard];
    if (!current) {
      setPhase('reveal');
      return null;
    }
    const suggestions = POPULAR_CITIES[current.code] || [];
    const selectedCities = cityData.get(current.code) || [];

    return (
      <div className="fixed inset-0 z-[200] bg-gray-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-full flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-white border-b-4 border-gray-100 px-4 py-4 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-gray-800">Add Cities</h2>
              <button
                onClick={skipAllCities}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <SkipForward className="w-4 h-4" /> Skip All
              </button>
            </div>
            <p className="text-gray-500 text-sm font-bold">
              This helps us avoid places you've already been
            </p>
            <div className="mt-3 flex gap-1">
              {cityCardCountries.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= currentCityCard ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            {painted.size > 8 && (
              <p className="text-[10px] font-bold text-gray-400 mt-2">
                Showing top 8 countries • Add cities for the rest later
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.code}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="bg-white rounded-3xl border-4 border-gray-100 p-5 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{getFlag(current.code)}</span>
                  <div>
                    <h3 className="text-xl font-black text-gray-800">{current.name}</h3>
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                      {NUMERIC_TO_CONTINENT[current.code] || ''}
                    </p>
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {suggestions.map(city => {
                      const isSelected = selectedCities.some(c => c.name === city);
                      const isInInput = customCity.toLowerCase().split(',').some(c => c.trim() === city.toLowerCase());
                      const isHighlighted = isSelected || isInInput;
                      return (
                        <button
                          key={city}
                          onClick={() => {
                            if (isSelected) {
                              toggleCity(current.code, city);
                            } else {
                              setCustomCity(prev => prev ? `${prev}, ${city}` : city);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            isHighlighted
                              ? 'bg-green-500 text-white shadow-md shadow-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {city}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={customCity}
                      onChange={e => setCustomCity(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomCity(current.code)}
                      placeholder="Add city..."
                      className="flex-1 min-w-0 bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400"
                    />
                    <select
                      value={customMonth}
                      onChange={e => setCustomMonth(e.target.value ? Number(e.target.value) : '')}
                      className="bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl px-1 sm:px-2 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-green-400 appearance-none cursor-pointer shrink-0"
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                    </select>
                    <select
                      value={customYear}
                      onChange={e => setCustomYear(Number(e.target.value))}
                      className="bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl px-1 sm:px-2 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-green-400 appearance-none cursor-pointer w-14 sm:w-20 shrink-0"
                    >
                      {YEARS.slice(0, 30).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                      onClick={() => addCustomCity(current.code)}
                      disabled={!customCity.trim()}
                      className="bg-green-500 disabled:bg-gray-200 text-white disabled:text-gray-400 p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>

                {selectedCities.filter(c => !suggestions.includes(c.name)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedCities.filter(c => !suggestions.includes(c.name)).map(city => (
                      <span
                        key={city.name}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        {city.name}
                        <button onClick={() => toggleCity(current.code, city.name)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="bg-white border-t-4 border-gray-100 px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => {
                setCustomCity('');
                nextCityCard();
              }}
              className="text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors"
            >
              Skip this country
            </button>
            <button
              onClick={() => {
                setCustomCity('');
                nextCityCard();
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-black px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-colors"
            >
              {currentCityCard < cityCardCountries.length - 1 ? 'Next' : 'Finish'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allCountries = [...Array.from(painted.entries()).map(([code, name]) => ({ code, name }))];
  const totalWithExisting = allCountries.length + existingCountryCodes.length;
  const continentCount = unlockedContinents.size;

  const missingContinents = ALL_CONTINENTS.filter(c => !unlockedContinents.has(c));
  const gapText = missingContinents.length > 0
    ? `You haven't explored ${missingContinents[0]} yet — ready to change that?`
    : "You've touched every continent — incredible!";

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-b from-gray-900 via-gray-900 to-green-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md w-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Sparkles className="w-8 h-8 text-green-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl sm:text-4xl font-black text-white mb-2"
        >
          Your Travel DNA is Ready
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/50 font-bold mb-8"
        >
          Look what we know about you now
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-6"
        >
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <CountUp target={totalWithExisting} delay={1000} />
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">Countries</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <CountUp target={continentCount} delay={1200} />
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">Continents</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center mt-4">
            {ALL_CONTINENTS.map(cont => (
              <span
                key={cont}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  unlockedContinents.has(cont)
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/5 text-white/20'
                }`}
              >
                {cont}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6"
        >
          <p className="text-amber-300 text-sm font-bold">{gapText}</p>
        </motion.div>

        {profile.interests && profile.interests.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-white/30 text-xs font-bold mb-8"
          >
            Matched with your love of {profile.interests.slice(0, 3).join(', ')}
          </motion.p>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          onClick={finishAndSave}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-3 text-lg transition-colors"
        >
          <Plane className="w-6 h-6" />
          Plan Your Next Trip
        </motion.button>
      </motion.div>
    </div>
  );
};

const CountUp: React.FC<{ target: number; delay?: number }> = ({ target, delay = 0 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1000;
      const steps = Math.min(target, 30);
      const interval = duration / steps;
      let current = 0;
      const timer = setInterval(() => {
        current++;
        setCount(Math.round((current / steps) * target));
        if (current >= steps) {
          clearInterval(timer);
          setCount(target);
        }
      }, interval);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay]);

  return (
    <span className="text-4xl font-black text-white tabular-nums">{count}</span>
  );
};

export default GlobePaint;
