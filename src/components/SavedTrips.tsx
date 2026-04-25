import React, { useState } from 'react';
import { ArrowLeft, Clock, Calendar, Plane } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Itinerary, ItineraryStatus } from '../types';
import { countryAlpha2 } from '../lib/countryFlags';
import ItineraryView from './ItineraryView';

interface SavedTripsProps {
  itineraries: Itinerary[];
  onUpdateStatus: (id: string, status: ItineraryStatus) => void;
  onBack: () => void;
  onPlanTrip: () => void;
}

const STATUS_CONFIG: Record<ItineraryStatus, { label: string; bg: string; text: string; dot: string }> = {
  dreamed:   { label: 'Dreamed',   bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400' },
  upcoming:  { label: 'Upcoming',  bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  completed: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
};

const STATUS_CYCLE: ItineraryStatus[] = ['dreamed', 'upcoming', 'completed'];

const formatDate = (createdAt: unknown): string => {
  try {
    let date: Date;
    if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
      date = new Date((createdAt as { seconds: number }).seconds * 1000);
    } else {
      date = new Date(createdAt as string);
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

type FilterTab = 'all' | ItineraryStatus;

const SavedTrips: React.FC<SavedTripsProps> = ({ itineraries, onUpdateStatus, onBack, onPlanTrip }) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [viewingItinerary, setViewingItinerary] = useState<Itinerary | null>(null);

  const sorted = [...itineraries].sort((a, b) => {
    const toMs = (v: unknown): number => {
      if (!v) return 0;
      if (typeof v === 'object' && v !== null && 'seconds' in v) return (v as { seconds: number }).seconds * 1000;
      return new Date(v as string).getTime();
    };
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

  const countByStatus = (s: ItineraryStatus) => itineraries.filter(i => (i.status || 'dreamed') === s).length;
  const filtered = filter === 'all' ? sorted : sorted.filter(i => (i.status || 'dreamed') === filter);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: `All (${itineraries.length})` },
    { key: 'dreamed',   label: `Dreamed (${countByStatus('dreamed')})` },
    { key: 'upcoming',  label: `Upcoming (${countByStatus('upcoming')})` },
    { key: 'completed', label: `Completed (${countByStatus('completed')})` },
  ];

  const handleStatusToggle = (e: React.MouseEvent, itinerary: Itinerary) => {
    e.stopPropagation();
    if (!itinerary.id) return;
    const current = (itinerary.status || 'dreamed') as ItineraryStatus;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    onUpdateStatus(itinerary.id, next);
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (viewingItinerary) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 lg:pb-6">
        <ItineraryView
          itinerary={viewingItinerary}
          onBack={() => setViewingItinerary(null)}
        />
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Planner
        </button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800">My Trips</h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            {itineraries.length} saved {itineraries.length === 1 ? 'adventure' : 'adventures'}
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              filter === tab.key
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center space-y-5"
        >
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center">
            <Plane className="w-9 h-9 text-stone-400" />
          </div>
          {filter === 'all' ? (
            <>
              <div>
                <h3 className="text-lg font-black text-gray-700 mb-1">Your saved adventures will appear here</h3>
                <p className="text-sm text-gray-400 font-medium">Generate a trip plan and hit Save to get started.</p>
              </div>
              <button
                onClick={onPlanTrip}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm rounded-2xl uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
              >
                Plan one now →
              </button>
            </>
          ) : (
            <div>
              <h3 className="text-lg font-black text-gray-700 mb-1">No {filter} trips yet</h3>
              <p className="text-sm text-gray-400 font-medium">Tap the status chip on any trip to change it.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Trip Cards */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((itinerary, idx) => {
            const status = (itinerary.status || 'dreamed') as ItineraryStatus;
            const cfg = STATUS_CONFIG[status];

            const countryMap = new Map<string, string[]>();
            (itinerary.days || []).forEach(d => {
              const cities = countryMap.get(d.country) || [];
              if (!cities.includes(d.city)) cities.push(d.city);
              countryMap.set(d.country, cities);
            });
            const countryEntries = Array.from(countryMap.entries());
            const displayEntries = countryEntries.slice(0, 3);
            const extraCountries = countryEntries.length > 3 ? countryEntries.length - 3 : 0;

            return (
              <motion.div
                key={itinerary.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Card — tapping navigates to detail view */}
                <button
                  onClick={() => setViewingItinerary(itinerary)}
                  className="w-full p-5 text-left group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-black text-stone-900 text-base leading-snug flex-1 group-hover:text-teal-600 transition-colors line-clamp-2">
                      {itinerary.title}
                    </h3>
                  </div>

                  {/* Country flags row */}
                  {countryEntries.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3">
                      {displayEntries.map(([country], i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {countryAlpha2(country) && (
                            <img
                              src={`https://flagcdn.com/w40/${countryAlpha2(country)}.png`}
                              alt={country}
                              className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="text-[10px] font-black text-stone-600 uppercase tracking-wider">{country}</span>
                        </div>
                      ))}
                      {extraCountries > 0 && (
                        <span className="text-[10px] font-black text-stone-400">+{extraCountries} more</span>
                      )}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status chip — tap to cycle */}
                    <button
                      onClick={(e) => handleStatusToggle(e, itinerary)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-80 active:scale-95 whitespace-nowrap ${cfg.bg} ${cfg.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>

                    {/* Days */}
                    <div className="flex items-center gap-1 text-stone-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{itinerary.totalDays || itinerary.days?.length || 0} days</span>
                    </div>

                    {/* Date */}
                    {itinerary.createdAt && (
                      <div className="flex items-center gap-1 text-stone-500">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{formatDate(itinerary.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SavedTrips;
