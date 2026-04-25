import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Clock, Compass, Flame } from 'lucide-react';
import { discoveries } from '../data/discoveries';

// ── helpers ──────────────────────────────────────────────────────────────────

function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getFullYear(), 0, 0));
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start.getTime()) / 86_400_000); // 0-indexed
}

const SPIN_POOL = [
  '🌍', '✈️', '🏔️', '🌊', '🌴', '🏛️', '🍜', '🎭', '🗺️', '🌺',
  '🐘', '🦁', '🏰', '⛩️', '🎪', '🚢', '🌙', '🔮', '💎', '🎨',
];

const SPIN_FLAGS = [
  'jp', 'fr', 'br', 'in', 'au', 'mx', 'it', 'th', 'eg', 'no',
  'de', 'cn', 'gb', 'sg', 'tr', 'za', 'ar', 'vn', 'is', 'nz',
];

// ── sub-components ────────────────────────────────────────────────────────────

const Reel: React.FC<{
  spinning: boolean;
  finalEmoji?: string;
  finalFlag?: string;
  type: 'emoji' | 'flag' | 'sparkle';
  delay: number;
  stopped: boolean;
}> = ({ spinning, finalEmoji, finalFlag, type, delay, stopped }) => {
  const [frameIdx, setFrameIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (spinning && !stopped) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(i => (i + 1) % SPIN_POOL.length);
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spinning, stopped]);

  const isRevealed = stopped;

  return (
    <motion.div
      animate={
        spinning && !stopped
          ? { borderColor: ['#10b981', '#059669', '#10b981'], scale: [1, 1.04, 1] }
          : isRevealed
          ? { borderColor: '#10b981', scale: 1 }
          : { borderColor: '#e5e7eb', scale: 1 }
      }
      transition={{ duration: 0.4, repeat: spinning && !stopped ? Infinity : 0 }}
      className="relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 bg-gray-50 rounded-2xl border-2 flex items-center justify-center overflow-hidden select-none"
      style={{ borderColor: spinning ? '#10b981' : '#e5e7eb' }}
    >
      {/* idle mystery box */}
      {!spinning && !isRevealed && (
        <span className="text-2xl sm:text-3xl text-gray-300 font-black">?</span>
      )}

      {/* spinning frame */}
      {spinning && !stopped && (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={frameIdx}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.06 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {type === 'flag' ? (
              <img
                src={`https://flagcdn.com/w40/${SPIN_FLAGS[frameIdx % SPIN_FLAGS.length]}.png`}
                alt="flag"
                className="w-8 h-6 sm:w-10 sm:h-7 object-cover rounded-sm"
              />
            ) : type === 'sparkle' ? (
              <span className="text-xl sm:text-2xl font-black text-green-400">✦</span>
            ) : (
              <span className="text-3xl sm:text-4xl leading-none">{SPIN_POOL[frameIdx]}</span>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* landed result */}
      {isRevealed && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20, delay }}
          className="flex items-center justify-center"
        >
          {type === 'flag' && finalFlag ? (
            <img
              src={`https://flagcdn.com/w40/${finalFlag}.png`}
              alt="flag"
              className="w-10 h-7 sm:w-12 sm:h-8 object-cover rounded-sm"
              referrerPolicy="no-referrer"
            />
          ) : type === 'sparkle' ? (
            <span className="text-2xl sm:text-3xl font-black text-green-400">✦</span>
          ) : (
            <span className="text-3xl sm:text-4xl leading-none">{finalEmoji}</span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// ── share prompt rotation ─────────────────────────────────────────────────────

function getSharePrompts(_country: string): string[] {
  return [
    'Send to a friend',
    'Drop in the group chat',
    'Good for trivia night',
    'Worth the argument',
    'Tag your travel buddy',
    'Forward this along',
    'Someone needs to see this',
  ];
}

// ── main component ────────────────────────────────────────────────────────────

interface DailyDiscoveryProps {
  streak?: number;
  lastDiscoveryDate?: string; // YYYY-MM-DD UTC, from Firestore profile — drives cross-device sync
  onDiscoveryRevealed?: () => void;
}

const DailyDiscovery: React.FC<DailyDiscoveryProps> = ({ streak = 0, lastDiscoveryDate, onDiscoveryRevealed }) => {
  const todayStr = new Date().toDateString(); // local date string (localStorage key)
  const today = new Date();
  const todayUTCStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  const dayIndex = getDayOfYear(new Date());
  const discovery = discoveries[dayIndex % discoveries.length];

  // Revealed if Firestore says so (cross-device source of truth) or localStorage fast-path
  const alreadyRevealed =
    lastDiscoveryDate === todayUTCStr ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('gt_discovery_date') === todayStr);

  const [stage, setStage] = useState<'idle' | 'spinning' | 'revealed'>(
    alreadyRevealed ? 'revealed' : 'idle'
  );

  // Staggered reel stop: reel0 → reel1 → reel2
  const [reel0Stopped, setReel0Stopped] = useState(alreadyRevealed);
  const [reel1Stopped, setReel1Stopped] = useState(alreadyRevealed);
  const [reel2Stopped, setReel2Stopped] = useState(alreadyRevealed);

  // Cross-device live sync: if another device spins today, update this instance immediately
  useEffect(() => {
    if (lastDiscoveryDate === todayUTCStr && stage === 'idle') {
      setStage('revealed');
      setReel0Stopped(true);
      setReel1Stopped(true);
      setReel2Stopped(true);
    }
  }, [lastDiscoveryDate, todayUTCStr, stage]);
  const [copied, setCopied] = useState(false);

  // Rotating share prompts
  const prompts = getSharePrompts(discovery.country);
  const [promptIdx, setPromptIdx] = useState(0);

  useEffect(() => {
    if (stage !== 'revealed' || copied) return;
    const timer = setInterval(() => {
      setPromptIdx(i => (i + 1) % prompts.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [stage, copied, prompts.length]);

  const handleReveal = () => {
    setStage('spinning');
    setReel0Stopped(false);
    setReel1Stopped(false);
    setReel2Stopped(false);

    // Stagger: reel 0 lands at 2.5s, reel 1 at 3.2s, reel 2 at 3.8s
    setTimeout(() => setReel0Stopped(true), 2500);
    setTimeout(() => setReel1Stopped(true), 3200);
    setTimeout(() => {
      setReel2Stopped(true);
      setTimeout(() => {
        setStage('revealed');
        try {
          localStorage.setItem('gt_discovery_date', todayStr);
        } catch {
          // private-browsing or quota exceeded — silently ignore
        }
        if (!alreadyRevealed) {
          onDiscoveryRevealed?.();
        }
      }, 300);
    }, 3800);
  };

  const handleShare = () => {
    // Use first sentence as the hook
    const rawHook = discovery.fact.split('.')[0] + '.';
    const link = `globotrottr.com/d/${discovery.id}`;

    // Clipboard/fallback text — title included so it reads as a standalone message
    let clipboardText: string;
    if (streak > 1) {
      clipboardText = `Day ${streak} of these and this one's genuinely mad — ${discovery.title}. ${rawHook} ${link}`;
    } else {
      clipboardText = `${discovery.title}. ${rawHook} ${link}`;
    }

    // Clamp to 280 chars (for Twitter-via-clipboard)
    if (clipboardText.length > 280) {
      const budget = 280 - link.length - 2;
      clipboardText = clipboardText.slice(0, budget).trimEnd() + '… ' + link;
    }

    if (typeof navigator.share === 'function') {
      // navigator.share passes `title` as the email subject / share-sheet heading.
      // The `text` body must NOT repeat the title or it shows up twice (email, iMessage, etc.).
      let shareBody: string;
      if (streak > 1) {
        shareBody = `Day ${streak} of these and this one's genuinely mad. ${rawHook} ${link}`;
      } else {
        shareBody = `${rawHook} ${link}`;
      }
      navigator.share({ title: discovery.title, text: shareBody }).catch(() => {});
    } else {
      navigator.clipboard.writeText(clipboardText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const isSpinning = stage === 'spinning';

  return (
    <div className="bg-white rounded-[2rem] border-4 border-gray-100 shadow-sm overflow-hidden">
      {/* ── header ── */}
      <div className="px-3 py-3 sm:px-5 sm:py-4 flex items-center justify-between border-b border-gray-100 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[11px] sm:text-sm font-black text-gray-800 uppercase tracking-wider sm:tracking-widest leading-none">
              Daily Discovery
            </h2>
            <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium mt-0.5 whitespace-nowrap">
              New fact every day at midnight
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {streak > 1 && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-black px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap"
            >
              <Flame className="w-3 h-3" />
              <span>{streak}-day streak</span>
            </motion.div>
          )}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <span>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div className="p-3 sm:p-5">
        {/* ──── IDLE + SPINNING: slot machine reels ──── */}
        {stage !== 'revealed' && (
          <div className="flex flex-col items-center gap-4 sm:gap-5">
            <div className="flex gap-2 sm:gap-3 justify-center">
              <Reel
                spinning={isSpinning}
                type="emoji"
                finalEmoji={discovery.emoji}
                delay={0}
                stopped={reel0Stopped}
              />
              <Reel
                spinning={isSpinning}
                type="flag"
                finalFlag={discovery.countryCode}
                delay={0.08}
                stopped={reel1Stopped}
              />
              <Reel
                spinning={isSpinning}
                type="sparkle"
                delay={0.16}
                stopped={reel2Stopped}
              />
            </div>

            {stage === 'idle' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReveal}
                className="bg-green-500 hover:bg-green-400 text-white font-black text-xs uppercase tracking-widest px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl transition-colors shadow-[0_4px_0_0_#15803d]"
              >
                Reveal Today's Fact
              </motion.button>
            )}

            {stage === 'spinning' && (
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
                Discovering…
              </p>
            )}
          </div>
        )}

        {/* ──── REVEALED: full fact card ──── */}
        {stage === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="space-y-3 sm:space-y-4"
          >
            {/* country + emoji header */}
            <div className="flex items-start gap-4">
              <div className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-1.5 shrink-0 mt-0.5">
                <span className="text-4xl leading-none">{discovery.emoji}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={`https://flagcdn.com/w40/${discovery.countryCode}.png`}
                    alt={discovery.country}
                    className="w-6 h-4 object-contain rounded-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] font-black text-green-400 uppercase tracking-widest truncate">
                    {discovery.country}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-800 leading-snug">
                  {discovery.title}
                </h3>
              </div>
            </div>

            {/* fact body */}
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-4 border border-gray-100">
              {discovery.fact}
            </p>

            {/* share — rotating prompts */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-800 text-[11px] font-medium px-4 py-2.5 rounded-xl transition-colors overflow-hidden w-[13rem]"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <div className="relative h-4 flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
                      >
                        Copied to clipboard!
                      </motion.span>
                    ) : (
                      <motion.span
                        key={promptIdx}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
                      >
                        {prompts[promptIdx]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DailyDiscovery;
