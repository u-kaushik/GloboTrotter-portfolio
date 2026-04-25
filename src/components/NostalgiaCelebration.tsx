import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, Globe, Heart, Lightbulb, Cpu, Sparkles, Coffee, Palette, MapPin } from 'lucide-react';

interface NostalgiaCelebrationProps {
  log: {
    cityName: string;
    countryName: string;
    year: number;
    month?: number;
  };
  tourStepId?: string;
  context: {
    openingLine?: string;
    cityPulse?: string;
    foodMoment?: string;
    designNote?: string;
    topSong?: string;
    topArtist?: string;
    artworkUrl?: string;
    majorEvent?: string;
    funFact?: string;
    techMilestone?: string;
    personalizedNugget?: string;
  };
  onDismiss: () => void;
  onViewMemory?: () => void;
  onTourTargetClick?: () => void;
  userFuel?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NostalgiaCelebration: React.FC<NostalgiaCelebrationProps> = ({ log, tourStepId, context, onDismiss, onViewMemory, onTourTargetClick, userFuel }) => {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const timeLabel = log.month ? `${MONTHS[log.month - 1]} ${log.year}` : `${log.year}`;

  useEffect(() => {
    const newSparkles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setSparkles(newSparkles);
  }, []);

  useEffect(() => {
    if (!tourStepId) return;
    const targetMap: Record<string, string> = {
      nostalgiaMusic: 'nostalgia-music',
      nostalgiaScene: 'nostalgia-scene',
      nostalgiaCards: 'nostalgia-cards',
      nostalgiaFacts: 'nostalgia-facts',
    };
    const targetId = targetMap[tourStepId];
    if (!targetId) return;

    const container = contentRef.current;
    const target = container?.querySelector(`[data-tour="${targetId}"]`) as HTMLElement | null;
    if (!container || !target) return;

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
  }, [tourStepId]);

  const cards = [
    { icon: Music, bg: 'bg-pink-50', label: 'Top Song', value: context.topSong, sub: context.topArtist, tour: 'nostalgia-music' },
    { icon: MapPin, bg: 'bg-green-50', label: 'City Pulse', value: context.cityPulse, tour: 'nostalgia-cards' },
    { icon: Coffee, bg: 'bg-amber-50', label: 'Food Moment', value: context.foodMoment, tour: 'nostalgia-cards' },
    { icon: Palette, bg: 'bg-purple-50', label: 'Design Note', value: context.designNote, tour: 'nostalgia-cards' },
  ].filter(c => c.value);

  const extraFacts = [
    { icon: Globe, label: 'World', value: context.majorEvent },
    { icon: Cpu, label: 'Tech', value: context.techMilestone },
    { icon: Heart, label: 'For You', value: context.personalizedNugget },
    { icon: Lightbulb, label: 'Fun Fact', value: context.funFact },
  ].filter(f => f.value);

  const advanceIfActive = (step: string) => {
    if (tourStepId === step) onTourTargetClick?.();
  };

  return (
    <div data-tour-surface className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 pointer-events-none ${tourStepId ? 'bg-transparent' : 'bg-gray-900/80 backdrop-blur-md'}`}
      />

      {/* Magic dust sparkles */}
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: [0, -100] }}
          transition={{ duration: 2, delay: s.delay, ease: 'easeOut' }}
          className="absolute pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        data-tour-surface
        className="relative w-full max-w-md sm:max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 p-5 sm:p-7 text-center">
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.6, delay: 0.2 }}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
          >
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
          </motion.div>

          <h2 className="text-xl sm:text-2xl font-black text-white mb-1">Time Capsule Unlocked!</h2>
          <p className="text-green-100 font-bold text-sm">{log.cityName}, {log.countryName} • {timeLabel}</p>
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
          {/* Music hero — mirrors the dashboard/journey card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className={`bg-stone-50 rounded-xl px-4 py-5 sm:px-5 sm:py-6 ${tourStepId === 'nostalgiaMusic' ? 'cursor-pointer' : ''}`}
            data-tour="nostalgia-music"
            onClick={() => advanceIfActive('nostalgiaMusic')}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base leading-none">🎵</span>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Music</span>
            </div>

            <div className="flex items-center gap-4">
              {context.artworkUrl ? (
                <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16">
                  <img
                    src={context.artworkUrl}
                    alt={context.topSong ? `${context.topSong} artwork` : 'Album artwork'}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-md"
                  />
                </div>
              ) : (
                <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                {context.topSong && context.topArtist && (
                  <>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide mb-0.5">#1 song of the moment</p>
                    <p className="text-gray-800 font-black text-lg leading-snug truncate">{context.topSong}</p>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-wider mt-1 truncate">{context.topArtist}</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Main intro */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className={`text-center ${tourStepId === 'nostalgiaScene' ? 'cursor-pointer' : ''}`}
            data-tour="nostalgia-scene"
            onClick={() => advanceIfActive('nostalgiaScene')}
          >
            <p className="text-gray-600 font-medium text-sm sm:text-base leading-relaxed">
              {context.openingLine && (
                <span className="block text-gray-700 font-semibold mb-3">{context.openingLine}</span>
              )}
              {context.topSong && context.topArtist && (
                <span>Ahh, {timeLabel}... <span className="text-green-600 font-bold">"{context.topSong}"</span> by {context.topArtist} was everywhere.</span>
              )}
              {context.topTeam && (
                <span className="block mt-2">{context.topTeam}</span>
              )}
            </p>
          </motion.div>

          {/* Cards grid */}
          <div
            className={`grid grid-cols-2 gap-2 sm:gap-3 ${tourStepId === 'nostalgiaCards' ? 'cursor-pointer' : ''}`}
            data-tour="nostalgia-cards"
            onClick={() => advanceIfActive('nostalgiaCards')}
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={`${card.bg} rounded-xl p-3 sm:p-4`}
                data-tour={i === 0 ? card.tour : 'nostalgia-cards'}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{card.label}</span>
                </div>
                <p className="font-black text-gray-800 text-xs sm:text-sm leading-tight">{card.value}</p>
                {card.sub && <p className="text-[10px] text-gray-500 mt-0.5">{card.sub}</p>}
              </motion.div>
            ))}
          </div>

          {/* Extra facts */}
          {extraFacts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className={`space-y-2 ${tourStepId === 'nostalgiaFacts' ? 'cursor-pointer' : ''}`}
              data-tour="nostalgia-facts"
              onClick={() => advanceIfActive('nostalgiaFacts')}
            >
              {extraFacts.map((fact) => (
                <div key={fact.label} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <fact.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{fact.label}</span>
                    <p className="text-xs sm:text-sm text-gray-700 font-medium leading-tight">{fact.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 space-y-2">
          {userFuel !== undefined && (
            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold text-indigo-500 bg-indigo-50 py-1.5 sm:py-2 rounded-lg">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              {userFuel} fuel remaining
            </div>
          )}
          {onViewMemory && (
            <button
              onClick={onViewMemory}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 sm:py-4 rounded-xl uppercase tracking-widest text-xs sm:text-sm transition-colors shadow-lg whitespace-nowrap"
            >
              Go to this memory
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-full text-gray-400 hover:text-gray-600 font-bold py-2 rounded-xl text-xs sm:text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NostalgiaCelebration;
