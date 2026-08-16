import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, MapPin, X, Search, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { TravelLog } from '../types';
import { COUNTRIES, ALPHA2_TO_NUMERIC, MONTHS } from '../constants/onboarding';
import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TravelFormProps {
  onSave: (log: Partial<TravelLog>) => void;
  onCancel: () => void;
  initialCountry?: { code: string; name: string };
  birthDate?: string;
  prefill?: Partial<TravelLog>;
  lockPrefill?: boolean;
  compact?: boolean;
  demoWalkStepId?: string;
}

interface CitySuggestion {
  name: string;
  displayName: string;
}

const currentYear = new Date().getFullYear();

const TravelForm: React.FC<TravelFormProps> = ({ onSave, onCancel, initialCountry, birthDate, prefill, lockPrefill, compact, demoWalkStepId }) => {
  const isCompact = compact || !!lockPrefill;
  const isDemoGuided = !!demoWalkStepId;
  const [countryName, setCountryName] = useState(initialCountry?.name || '');
  const [countryAlpha2, setCountryAlpha2] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryRef = useRef<HTMLDivElement>(null);

  const [cityName, setCityName] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [day, setDay] = useState<number | undefined>(undefined);
  const [duration, setDuration] = useState<number>(7);
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const notesAckButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Build list of { name, value } pairs for valid months
  const currentMonth = new Date().getMonth() + 1;
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : 1940;
  const birthMonth = birthDate ? new Date(birthDate).getMonth() + 1 : 1;

  const years = Array.from({ length: currentYear - birthYear + 1 }, (_, i) => currentYear - i);

  const monthOptions: { label: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    // Skip future months in current year
    if (year === currentYear && m > currentMonth) continue;
    // Skip entire month list if before birth year
    if (year < birthYear) continue;
    // Skip months before birth month in birth year
    if (year === birthYear && m < birthMonth) continue;
    monthOptions.push({ label: MONTHS[m - 1].slice(0, 3), value: m });
  }

  // Initialize alpha2 from initialCountry if provided
  useEffect(() => {
    if (initialCountry?.name) {
      const found = COUNTRIES.find(c => c.name === initialCountry.name);
      if (found) setCountryAlpha2(found.alpha2);
    }
  }, [initialCountry]);

  // Apply prefill (demo/onboarding)
  useEffect(() => {
    if (!prefill) return;
    if (prefill.countryName) {
      setCountryName(prefill.countryName);
      const found = COUNTRIES.find(c => c.name === prefill.countryName);
      if (found) setCountryAlpha2(found.alpha2);
    }
    if (prefill.cityName) setCityName(prefill.cityName);
    if (typeof prefill.year === 'number') setYear(prefill.year);
    if (typeof prefill.month === 'number') setMonth(prefill.month);
    if (typeof prefill.day === 'number') setDay(prefill.day);
    if (typeof prefill.duration === 'number') setDuration(prefill.duration);
    if (typeof prefill.notes === 'string') setNotes(prefill.notes);
  }, [prefill]);

  // Reset month if it becomes invalid when year changes
  useEffect(() => {
    const validValues = monthOptions.map(m => m.value);
    if (month && !validValues.includes(month)) {
      setMonth(undefined);
    }
  }, [year]);

  // Click outside handlers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryDropdownOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCitySuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  useEffect(() => {
    if (!isDemoGuided || !isCompact) return;
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    const target =
      demoWalkStepId === 'notesAck'
        ? notesAckButtonRef.current ?? notesSectionRef.current
        : demoWalkStepId === 'saveTrip'
          ? saveButtonRef.current
          : null;

    if (!target) return;

    const scrollTarget = () => {
      if (demoWalkStepId === 'saveTrip') {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
        target.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    const raf = window.requestAnimationFrame(scrollTarget);
    const timeout = window.setTimeout(scrollTarget, 180);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [demoWalkStepId, isCompact, isDemoGuided]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCitySuggestions = useCallback(async (query: string, alpha2: string) => {
    if (query.length < 2 || !alpha2) {
      setCitySuggestions([]);
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setCityLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=${alpha2}&format=json&limit=5&featuretype=settlement&addressdetails=1`,
        { 
          headers: { 'Accept-Language': 'en' },
          signal: abortController.signal
        }
      );
      const data = await res.json();
      const suggestions: CitySuggestion[] = data
        .filter((item: any) => item.type === 'city' || item.type === 'town' || item.type === 'village' || item.class === 'place')
        .map((item: any) => ({
          name: item.address?.city || item.address?.town || item.address?.village || item.name,
          displayName: item.display_name.split(',').slice(0, 2).join(','),
        }))
        .filter((s: CitySuggestion, i: number, arr: CitySuggestion[]) =>
          arr.findIndex(x => x.name === s.name) === i
        );
      setCitySuggestions(suggestions);
      setShowCitySuggestions(suggestions.length > 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setCitySuggestions([]);
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        setCityLoading(false);
      }
    }
  }, []);

  const handleCityChange = (value: string) => {
    setCityName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCitySuggestions(value, countryAlpha2);
    }, 150);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    },
  } as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryName || !cityName || isNaN(year) || !month) return;

    let photoUrl: string | undefined;
    if (photoFile && auth.currentUser) {
      setUploading(true);
      try {
        const uid = auth.currentUser.uid;
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const storageRef = ref(storage, `travel-photos/${uid}/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      } catch {
        // upload failed — save log without photo rather than blocking
      } finally {
        setUploading(false);
      }
    }

    const countryCode = ALPHA2_TO_NUMERIC[countryAlpha2] || 
      (initialCountry?.code?.length === 3 ? initialCountry.code : '000');
    
    onSave({
      countryCode,
      countryName,
      cityName,
      year,
      month,
      ...(day !== undefined && { day }),
      duration: isNaN(duration) ? undefined : duration,
      notes,
      photoUrl,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div data-tour-surface className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full border-4 border-green-100 max-h-[90vh] overflow-hidden relative z-20 flex flex-col">
      <div
        ref={scrollContainerRef}
        className={`p-4 sm:p-6 ${isCompact ? 'overflow-y-auto scrollbar-hide' : 'overflow-y-auto'} w-full max-h-[calc(90vh-2rem)]`}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-green-600 flex items-center gap-2">
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
            Log Adventure
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-red-500 text-sm font-bold">⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={isCompact ? 'grid gap-5 xl:grid-cols-[1.08fr_0.92fr] items-start' : 'space-y-4 sm:space-y-6'}
        >
          <div className={isCompact ? 'grid gap-4 sm:gap-5' : 'space-y-4 sm:space-y-6'}>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Country</label>
              <div ref={countryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                  disabled={!!lockPrefill}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-left flex items-center gap-3 hover:border-green-200 focus:border-green-400 outline-none transition-all"
                >
                  {countryName ? (
                    <>
                      <img src={`https://flagcdn.com/w40/${countryAlpha2}.png`} alt="" className="w-7 h-5 object-cover rounded-sm shadow-sm" />
                      <span className="font-black text-gray-700 text-sm sm:text-base">{countryName}</span>
                    </>
                  ) : (
                    <span className="text-gray-400 font-bold text-sm sm:text-base">Select a country</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {countryDropdownOpen && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-white border-2 border-gray-100 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="bg-transparent outline-none font-bold text-sm text-gray-900 placeholder-gray-400 w-full"
                          autoFocus
                          autoComplete="off"
                          data-1p-ignore
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto overflow-x-hidden">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.alpha2}
                          type="button"
                          onClick={() => {
                            setCountryName(c.name);
                            setCountryAlpha2(c.alpha2);
                            setCountryDropdownOpen(false);
                            setCountrySearch('');
                            setCityName('');
                            setCitySuggestions([]);
                          }}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-green-50 transition-colors"
                        >
                          <img src={`https://flagcdn.com/w40/${c.alpha2}.png`} alt="" className="w-6 h-4 object-cover rounded-sm shadow-sm" />
                          <span className="font-bold text-sm text-gray-700">{c.name}</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <div className="px-3 py-4 text-center text-gray-400 font-bold text-sm">No countries found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {isCompact && isDemoGuided && demoWalkStepId === 'countryAck' && (
                <button
                  type="button"
                  data-tour="demo-country-ack"
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-widest text-green-700 hover:bg-green-100 transition-colors"
                >
                  Looks good
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">City</label>
              <div ref={cityRef} className="relative">
                <input
                  type="text"
                  required
                  value={cityName}
                  onChange={(e) => handleCityChange(e.target.value)}
                  onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                  placeholder={countryName ? `City in ${countryName}...` : 'Select a country first'}
                  disabled={!countryName || !!lockPrefill}
                  autoComplete="off"
                  data-1p-ignore
                  className="w-full bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-gray-100 focus:border-green-400 outline-none transition-all font-bold text-sm sm:text-base text-gray-900 placeholder-gray-400 disabled:opacity-50"
                />
                {cityLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
                  </div>
                )}

                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-white border-2 border-gray-100 rounded-xl shadow-2xl overflow-hidden">
                    {citySuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCityName(s.name);
                          setShowCitySuggestions(false);
                          setCitySuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="font-bold text-sm text-gray-700">{s.name}</span>
                        <span className="text-xs text-gray-400 truncate ml-auto">{s.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isCompact && isDemoGuided && demoWalkStepId === 'cityAck' && (
                <button
                  type="button"
                  data-tour="demo-city-ack"
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-widest text-green-700 hover:bg-green-100 transition-colors"
                >
                  Looks good
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  disabled={!!lockPrefill}
                  className="w-full bg-gray-50 rounded-xl sm:rounded-2xl border-2 border-gray-100 py-3 px-3 sm:py-4 outline-none font-bold text-sm sm:text-base text-gray-900 appearance-none cursor-pointer"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Month</label>
                <select
                  value={month ?? ''}
                  onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!!lockPrefill}
                  className="w-full bg-gray-50 rounded-xl sm:rounded-2xl border-2 border-gray-100 py-3 px-3 sm:py-4 outline-none font-bold text-sm sm:text-base text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="">Month *</option>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Day</label>
                <input
                  type="number"
                  autoComplete="off"
                  data-1p-ignore
                  value={day === undefined ? '' : day}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setDay(e.target.value === '' ? undefined : Math.min(31, Math.max(1, v)));
                  }}
                  placeholder="—"
                  disabled={!!lockPrefill}
                  className="w-full bg-gray-50 rounded-xl sm:rounded-2xl border-2 border-gray-100 py-3 px-3 sm:py-4 outline-none font-bold text-sm sm:text-base text-gray-900 placeholder-gray-400"
                  min={1}
                  max={31}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Days</label>
                <input
                  type="number"
                  autoComplete="off"
                  data-1p-ignore
                  value={isNaN(duration) ? '' : duration}
                  onChange={(e) => setDuration(e.target.value === '' ? NaN : parseInt(e.target.value))}
                  disabled={!!lockPrefill}
                  className="w-full bg-gray-50 rounded-xl sm:rounded-2xl border-2 border-gray-100 py-3 px-3 sm:py-4 outline-none font-bold text-sm sm:text-base text-gray-900"
                  min={1}
                />
              </div>
            </div>
            {isCompact && isDemoGuided && demoWalkStepId === 'dateAck' && (
              <button
                type="button"
                data-tour="demo-date-ack"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-widest text-green-700 hover:bg-green-100 transition-colors"
              >
                Yep, looks right
              </button>
            )}
          </div>

          {isCompact ? (
            <div className="grid gap-4 sm:gap-5 min-w-0">
              <div className="grid gap-4">
                <div ref={notesSectionRef}>
                  <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                    placeholder="Any memories to capture..."
                    maxLength={2000}
                    rows={5}
                    autoComplete="off"
                    data-1p-ignore
                    className="w-full bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-gray-100 focus:border-green-400 outline-none transition-all font-bold text-sm sm:text-base text-gray-900 placeholder-gray-400 resize-none min-h-[170px]"
                  />
                </div>

                <div className="min-h-[176px]">
                  <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Proof of Visit</label>
                  <div
                    {...getRootProps()}
                    className="border-4 border-dashed border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer hover:border-green-200 transition-all bg-gray-50/50 min-h-[124px]"
                  >
                    <input {...getInputProps()} />
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full max-h-40 object-cover rounded-xl sm:rounded-2xl shadow-lg"
                      />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-xs sm:text-sm font-bold text-gray-400 text-center">Drop a photo here</p>
                      </>
                    )}
                  </div>
                </div>

                {isDemoGuided && demoWalkStepId === 'notesAck' && (
                  <button
                    ref={notesAckButtonRef}
                    type="button"
                    data-tour="demo-notes-ack"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-widest text-green-700 hover:bg-green-100 transition-colors"
                  >
                    Notes are in
                  </button>
                )}
              </div>

              <button
                ref={saveButtonRef}
                type="submit"
                data-tour="save-trip"
                disabled={!countryName || !cityName || !month || uploading || (isDemoGuided && demoWalkStepId !== 'saveTrip')}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_4px_0_0_#16a34a] sm:shadow-[0_6px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-base sm:text-lg"
              >
                {uploading ? 'Uploading...' : 'Save Memory'}
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  placeholder="Any memories to capture..."
                  maxLength={2000}
                  rows={2}
                  autoComplete="off"
                  data-1p-ignore
                  className="w-full bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-gray-100 focus:border-green-400 outline-none transition-all font-bold text-sm sm:text-base text-gray-900 placeholder-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Proof of Visit</label>
                <div
                  {...getRootProps()}
                  className="border-4 border-dashed border-gray-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center cursor-pointer hover:border-green-200 transition-all bg-gray-50/50"
                >
                  <input {...getInputProps()} />
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full aspect-video object-cover rounded-xl sm:rounded-2xl shadow-lg" />
                  ) : (
                    <>
                      <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mb-2" />
                      <p className="text-xs sm:text-sm font-bold text-gray-400">Drop a photo here</p>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                data-tour="save-trip"
                disabled={!countryName || !cityName || !month || uploading || (isDemoGuided && demoWalkStepId !== 'saveTrip')}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_4px_0_0_#16a34a] sm:shadow-[0_6px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-base sm:text-lg"
              >
                {uploading ? 'Uploading...' : 'Save Memory'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default TravelForm;
