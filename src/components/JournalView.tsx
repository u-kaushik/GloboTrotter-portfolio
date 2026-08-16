import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TravelLog, UserProfile, Story, StoryBackgroundColor } from '../types';
import {
  ArrowLeft, Camera, Plus, X, Share2, BookOpen, Check, ImagePlus, Loader2,
  ChevronLeft, ChevronRight, Type, Image, Sparkles
} from 'lucide-react';
import { MONTHS, NUMERIC_TO_ALPHA2 } from '../constants/onboarding';
import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fetchTrackInfo, TrackInfo } from '../lib/itunes';
import { fetchTmdbPoster } from '../lib/tmdb';
import { trackEvent } from '../services/analytics';

interface JournalViewProps {
  log: TravelLog;
  profile: UserProfile;
  onBack: () => void;
  onUpdate: (updatedLog: TravelLog) => void | Promise<void>;
  onDelete?: () => void;
  onPlanTrip?: () => void;
  demoWalkStepId?: string;
  onDemoWalkAdvance?: (stepId: string) => void;
}

// ─── Story background gradient map ─────────────────────────────────────────
const BG_GRADIENTS: Record<StoryBackgroundColor, string> = {
  sunset:   'from-orange-400 via-pink-500 to-red-400',
  ocean:    'from-blue-500 via-cyan-400 to-teal-400',
  forest:   'from-green-600 via-emerald-500 to-teal-600',
  night:    'from-indigo-900 via-purple-800 to-slate-900',
  coral:    'from-rose-400 via-pink-400 to-orange-300',
  charcoal: 'from-slate-700 via-slate-600 to-zinc-700',
  sage:     'from-green-300 via-teal-300 to-emerald-200',
  amber:    'from-amber-400 via-yellow-400 to-orange-300',
};

const BG_LABEL: Record<StoryBackgroundColor, string> = {
  sunset: 'Sunset', ocean: 'Ocean', forest: 'Forest', night: 'Night',
  coral: 'Coral', charcoal: 'Charcoal', sage: 'Sage', amber: 'Amber',
};

const BG_COLORS = Object.keys(BG_GRADIENTS) as StoryBackgroundColor[];

// Normalize all legacy text/photo data + new stories into a unified Story[]
// Order: notes card → moments chips → souvenir photos/texts → new stories
function normalizeSouvenirs(log: TravelLog): Story[] {
  // Legacy notes paragraph → single text card
  const notesCards: Story[] = log.notes?.trim()
    ? [{ type: 'text' as const, caption: log.notes.trim(), backgroundColor: 'charcoal' as const, createdAt: log.createdAt }]
    : [];

  // Legacy moments chips → text cards
  const momentCards: Story[] = (log.moments || [])
    .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
    .map(m => ({ type: 'text' as const, caption: m, backgroundColor: 'charcoal' as const, createdAt: log.createdAt }));

  // Legacy souvenirs: photo URLs or old text strings stored in souvenirs[]
  const souvenirCards: Story[] = (log.souvenirs || [])
    .filter(url => typeof url === 'string')
    .map(url => {
      if (url.startsWith('http') || url.startsWith('data:')) {
        return { type: 'photo' as const, mediaUrl: url, createdAt: log.createdAt };
      }
      return { type: 'text' as const, caption: url, backgroundColor: 'charcoal' as const, createdAt: log.createdAt };
    });

  return [...notesCards, ...momentCards, ...souvenirCards, ...(log.stories || [])];
}

// ─── Story Card (grid cell) ────────────────────────────────────────────────
const StoryCard: React.FC<{
  story: Story;
  index: number;
  onTap: () => void;
  onDelete: () => void;
}> = ({ story, index, onTap, onDelete }) => {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group bg-gray-100"
      onClick={onTap}
      onContextMenu={e => { e.preventDefault(); setShowDelete(true); }}
    >
      {story.type === 'text' ? (
        /* Text card */
        story.mediaUrl ? (
          <div className="relative w-full h-full">
            <img
              src={story.mediaUrl}
              alt="Memory"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <p className="w-full text-white font-bold text-[10px] leading-snug line-clamp-5 drop-shadow">
                {story.caption}
              </p>
            </div>
          </div>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${BG_GRADIENTS[story.backgroundColor || 'sunset']} flex items-center justify-center p-2.5`}>
            <p className="w-full text-white font-bold text-center text-[10px] leading-snug line-clamp-4 drop-shadow-sm">
              {story.caption}
            </p>
          </div>
        )
      ) : (
        /* Photo/video card */
        <>
          <img
            src={story.mediaUrl}
            alt="Moment"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          {story.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-2">
              <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">
                {story.caption}
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete overlay — hover shows X but passes clicks through; showDelete (long-press) blocks full card */}
      <div
        className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-150
          ${showDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'}`}
        onClick={e => { e.stopPropagation(); setShowDelete(false); }}
      >
        <div
          className={`bg-white/20 backdrop-blur-sm p-2 rounded-full border border-white/30 ${showDelete ? 'pointer-events-auto' : 'pointer-events-none'}`}
          onClick={e => { e.stopPropagation(); setShowDelete(false); onDelete(); }}
        >
          <X className="w-4 h-4 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ─── Fullscreen story viewer ───────────────────────────────────────────────
const StoryViewer: React.FC<{
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}> = ({ stories, initialIndex, onClose }) => {
  const [idx, setIdx] = useState(initialIndex);
  const story = stories[idx];

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(stories.length - 1, i + 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Story content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.18 }}
          className="w-full h-full flex items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          {story.type === 'text' ? (
            story.mediaUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={story.mediaUrl}
                  alt="Memory"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
                <p className="absolute inset-x-8 bottom-12 text-white font-bold text-2xl text-center leading-relaxed drop-shadow-lg">
                  {story.caption}
                </p>
              </div>
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${BG_GRADIENTS[story.backgroundColor || 'sunset']} flex items-center justify-center p-10`}>
                <p className="text-white font-bold text-2xl text-center leading-relaxed max-w-sm drop-shadow-lg">
                  {story.caption}
                </p>
              </div>
            )
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={story.mediaUrl}
                alt="Moment"
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
              {story.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pt-12 pb-8">
                  <p className="text-white text-base font-semibold leading-snug text-center">
                    {story.caption}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Close */}
      <button
        onClick={onClose}
        data-tour="demo-story-viewer-close"
        className="absolute top-5 right-5 z-10 p-2.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/25 transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Prev */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/25 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}
      {/* Next */}
      {idx < stories.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/25 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Dot indicators */}
      {stories.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
          {stories.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ─── Add Moment Modal ──────────────────────────────────────────────────────
type AddStoryStep = 'choose' | 'photo-caption' | 'text-compose';

const AddStoryModal: React.FC<{
  onClose: () => void;
  onSave: (story: Story) => Promise<void>;
  tripId: string;
}> = ({ onClose, onSave, tripId }) => {
  const [step, setStep] = useState<AddStoryStep>('choose');
  const [pendingMediaUrl, setPendingMediaUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState<StoryBackgroundColor>('sunset');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
  const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (file.size > maxBytes) {
      setUploadError(`Max ${isVideo ? '25MB' : '5MB'} for ${isVideo ? 'videos' : 'photos'}.`);
      e.target.value = '';
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || !tripId) {
      setUploadError('Upload failed. Please try again.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(
        storage,
        `trip-souvenirs/${uid}/${tripId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setPendingMediaUrl(url);
      setStep('photo-caption');
    } catch (err) {
      console.error('Firebase Storage upload error:', err);
      setUploadError(`Upload failed: ${err instanceof Error ? err.message : 'Check Firebase Storage rules (trip-souvenirs path must allow authenticated writes).'}`);
    } finally {
      setIsUploading(false);
    }
    e.target.value = '';
  };

  const savePhoto = async () => {
    if (!pendingMediaUrl) return;
    setIsSaving(true);
    await onSave({
      type: 'photo',
      mediaUrl: pendingMediaUrl,
      caption: caption.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setIsSaving(false);
    onClose();
  };

  const saveText = async () => {
    if (!text.trim() || text.length > 280) return;
    setIsSaving(true);
    await onSave({
      type: 'text',
      caption: text.trim(),
      backgroundColor: bgColor,
      createdAt: new Date().toISOString(),
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-sm p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-800">
            {step === 'choose' && 'Add a Moment'}
            {step === 'photo-caption' && 'Add Caption'}
            {step === 'text-compose' && 'Write a Note'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Choose ── */}
        {step === 'choose' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex flex-col items-center justify-center gap-3 py-8 bg-gray-50 border-2 border-gray-100 hover:border-green-300 hover:bg-green-50 rounded-2xl transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
              ) : (
                <Image className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                {isUploading ? 'Uploading…' : 'Photo / Video'}
              </span>
            </button>
            <button
              onClick={() => setStep('text-compose')}
              className="flex flex-col items-center justify-center gap-3 py-8 bg-gray-50 border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-2xl transition-colors"
            >
              <Type className="w-8 h-8 text-gray-400" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Write a Note</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* ── Photo caption ── */}
        {step === 'photo-caption' && pendingMediaUrl && (
          <div className="space-y-4">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={pendingMediaUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption… (optional)"
              maxLength={200}
              autoFocus
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-green-300 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 placeholder:text-gray-300 outline-none transition-colors"
              onKeyDown={e => { if (e.key === 'Enter') savePhoto(); }}
            />
            <button
              onClick={savePhoto}
              disabled={isSaving}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3.5 rounded-2xl text-sm uppercase tracking-widest transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? 'Saving…' : 'Save Moment'}
            </button>
          </div>
        )}

        {/* ── Text compose ── */}
        {step === 'text-compose' && (
          <div className="space-y-4">
            {/* Live preview */}
            <div className={`w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${BG_GRADIENTS[bgColor]} flex items-center justify-center p-5`}>
              <p className="text-white font-bold text-center text-sm leading-snug drop-shadow">
                {text || <span className="opacity-50">Your note will look like this…</span>}
              </p>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                autoFocus
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-indigo-300 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none resize-none transition-colors"
              />
              <p className={`mt-1 text-right text-xs font-semibold tabular-nums ${text.length > 260 ? text.length > 280 ? 'text-red-500' : 'text-amber-500' : 'text-gray-400'}`}>
                {text.length}/280
              </p>
            </div>

            {/* Color picker */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {BG_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  title={BG_LABEL[color]}
                  className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${BG_GRADIENTS[color]} transition-all
                    ${bgColor === color ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'}`}
                />
              ))}
            </div>

            <button
              onClick={saveText}
              disabled={isSaving || !text.trim() || text.length > 280}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-3.5 rounded-2xl text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        )}

        {/* Error */}
        {uploadError && (
          <p className="mt-3 text-xs font-bold text-red-500 text-center">{uploadError}</p>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Main JournalView ──────────────────────────────────────────────────────
const JournalView: React.FC<JournalViewProps> = ({ log, profile, onBack, onUpdate, onDelete, onPlanTrip, demoWalkStepId, onDemoWalkAdvance }) => {
  const [newMoment, setNewMoment] = useState('');
  const [isAddingMoment, setIsAddingMoment] = useState(false);
  const momentInputRef = useRef<HTMLInputElement>(null);
  const plannerCtaRef = useRef<HTMLButtonElement | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editedDuration, setEditedDuration] = useState<string>(log.duration != null ? String(log.duration) : '');
  const [isEditingMonth, setIsEditingMonth] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [sparkleActive, setSparkleActive] = useState(false);
  const sparkledRef = useRef(false);

  const [showAddStory, setShowAddStory] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const demoWalkActive = Boolean(demoWalkStepId);

  // Always start at the top when opening a memory
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (demoWalkStepId !== 'memoryPlanner') return;
    const target = plannerCtaRef.current;
    if (!target) return;
    const t = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => window.clearTimeout(t);
  }, [demoWalkStepId]);

  useEffect(() => {
    if (!demoWalkActive) return;
    setShowAddStory(false);
    setIsAddingMoment(false);
  }, [demoWalkActive]);

  useEffect(() => {
    if (demoWalkStepId !== 'memoryMoments') return;
    const t = window.setTimeout(() => {
      document.querySelector('[data-tour="demo-moments-store"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => window.clearTimeout(t);
  }, [demoWalkStepId]);

  useEffect(() => {
    if (demoWalkStepId !== 'memoryStoryOpen') return;
    if (viewerIndex !== null) return;
    const t = window.setTimeout(() => {
      setViewerIndex(0);
    }, 220);
    return () => window.clearTimeout(t);
  }, [demoWalkStepId, viewerIndex]);

  // Sparkle animation — fires once when historicalContext first appears
  useEffect(() => {
    if (log.historicalContext && !sparkledRef.current) {
      sparkledRef.current = true;
      setSparkleActive(true);
      const t = setTimeout(() => setSparkleActive(false), 1000);
      return () => clearTimeout(t);
    }
  }, [log.historicalContext]);

  // Track info (artwork + preview) for time capsule music row.
  // Pre-seed from Firestore-cached artworkUrl so image shows immediately on open.
  const [musicTrack, setMusicTrack] = useState<TrackInfo | null>(
    log.historicalContext?.artworkUrl
      ? { artworkUrl: log.historicalContext.artworkUrl, previewUrl: '' }
      : null
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewPlayedRef = useRef(false);

  useEffect(() => {
    // Prefer topSong; fall back to topSongs[0] for older trips that only have the array
    const song = log.historicalContext?.topSong ?? log.historicalContext?.topSongs?.[0]?.title;
    const artist = log.historicalContext?.topArtist ?? log.historicalContext?.topSongs?.[0]?.artist;
    if (!song) { setMusicTrack(null); return; }
    let cancelled = false;
    previewPlayedRef.current = false;
    setIsPlaying(false);
    fetchTrackInfo(song, artist ?? '').then(info => {
      if (!cancelled) {
        setMusicTrack(info);
        // Persist artworkUrl to Firestore so Dashboard can display it without re-fetching
        if (info?.artworkUrl && !log.historicalContext?.artworkUrl) {
          onUpdate({
            ...log,
            historicalContext: { ...log.historicalContext, artworkUrl: info.artworkUrl },
          });
        }
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.historicalContext?.topSong, log.historicalContext?.topArtist, log.historicalContext?.topSongs?.[0]?.title]);

  // Pause audio on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // TMDB poster for Cinema card
  const [tmdbPoster, setTmdbPoster] = useState<string | null>(null);
  useEffect(() => {
    const title = log.historicalContext?.movieOrShow;
    if (!title) { setTmdbPoster(null); return; }
    let cancelled = false;
    fetchTmdbPoster(title).then(url => {
      if (!cancelled) setTmdbPoster(url);
    });
    return () => { cancelled = true; };
  }, [log.historicalContext?.movieOrShow]);

  const togglePreview = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
      if (!previewPlayedRef.current) {
        previewPlayedRef.current = true;
        trackEvent('Song Preview Played', {
          song: log.historicalContext?.topSong,
          artist: log.historicalContext?.topArtist,
          country: log.country,
          year: log.year,
        });
      }
    }
  };

  const [editedNotes, setEditedNotes] = useState(log.notes || '');
  const [shareToast, setShareToast] = useState(false);

  const allStories = normalizeSouvenirs(log);

  const getFlagUrl = (numericCode: string) => {
    const alpha2 = NUMERIC_TO_ALPHA2[numericCode?.padStart(3, '0') ?? ''] || 'un';
    return `https://flagcdn.com/w40/${alpha2}.png`;
  };

  const timeLabel = log.month ? `${MONTHS[log.month - 1]} ${log.year}` : `${log.year}`;

  const addMoment = () => {
    if (!newMoment.trim()) return;
    onUpdate({ ...log, moments: [...(log.moments || []), newMoment.trim()] });
    setNewMoment('');
    setIsAddingMoment(false);
  };

  const removeMoment = (index: number) => {
    onUpdate({ ...log, moments: (log.moments || []).filter((_, i) => i !== index) });
  };

  const saveNotes = () => {
    onUpdate({ ...log, notes: editedNotes });
    setIsEditingNotes(false);
  };

  const saveDuration = () => {
    const num = parseInt(editedDuration, 10);
    if (!isNaN(num) && num > 0) {
      onUpdate({ ...log, duration: num });
    }
    setIsEditingDuration(false);
  };

  const addStory = async (story: Story) => {
    // When saving a new story, also clear legacy souvenirs if they've been
    // normalized into the stories array to avoid duplication on reload.
    const currentStories = log.stories || [];
    onUpdate({ ...log, stories: [...currentStories, story] });
  };

  const removeStory = (index: number) => {
    // Index is into allStories: [notesCard?, ...momentCards, ...souvenirCards, ...stories]
    const notesCount = log.notes?.trim() ? 1 : 0;
    const momentsCount = (log.moments || []).length;
    const souvenirCount = (log.souvenirs || []).filter(u => typeof u === 'string').length;
    const legacyCount = notesCount + momentsCount + souvenirCount;

    if (index < notesCount) {
      onUpdate({ ...log, notes: '' });
    } else if (index < notesCount + momentsCount) {
      const momentIndex = index - notesCount;
      onUpdate({ ...log, moments: (log.moments || []).filter((_, i) => i !== momentIndex) });
    } else if (index < legacyCount) {
      const souvenirIndex = index - notesCount - momentsCount;
      const newSouvenirs = (log.souvenirs || []).filter((_, i) => i !== souvenirIndex);
      onUpdate({ ...log, souvenirs: newSouvenirs });
    } else {
      const storyIndex = index - legacyCount;
      const newStories = (log.stories || []).filter((_, i) => i !== storyIndex);
      onUpdate({ ...log, stories: newStories });
    }
  };

  const handleShare = async () => {
    const shareText = [
      `${log.cityName}, ${log.countryName} (${timeLabel})`,
      log.historicalContext?.topSong
        ? `#1 Song: "${log.historicalContext.topSong}" by ${log.historicalContext.topArtist}`
        : '',
      log.historicalContext?.funFact || '',
      '',
      'Shared from GloboTrotter'
    ].filter(Boolean).join('\n');

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${log.cityName} Memories`, text: shareText });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const ctx = log.historicalContext;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6 pb-24 lg:pb-6">
      {/* ===== SECTION 1: Hero Header ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full aspect-[16/10] min-h-[220px] rounded-[2rem] overflow-hidden"
        data-tour="memory-hero"
      >
        {log.photoUrl || log.stories?.find(story => story.type === 'photo')?.mediaUrl ? (
          <img
            src={log.photoUrl || log.stories?.find(story => story.type === 'photo')?.mediaUrl}
            alt={log.cityName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-50 to-green-50 flex flex-col items-center justify-center">
            <Camera className="w-12 h-12 text-teal-200 mb-2" />
            <p className="text-teal-400 font-bold text-sm">Add your photos to customize this card</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 md:p-6">
          <button
            onClick={onBack}
            className="p-2.5 bg-black/30 backdrop-blur-sm rounded-xl hover:bg-black/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 bg-black/30 backdrop-blur-sm rounded-xl hover:bg-red-500/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2.5 bg-black/30 backdrop-blur-sm rounded-xl hover:bg-black/50 transition-colors relative"
            >
              <Share2 className="w-5 h-5 text-white" />
              {shareToast && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-9 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg whitespace-nowrap"
                >
                  Copied!
                </motion.div>
              )}
            </button>
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <img
                src={getFlagUrl(log.countryCode)}
                alt={log.countryName}
                className="w-5 h-3 object-cover rounded-sm"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{log.countryName}</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-1">
            {log.cityName}
          </h1>
          <p className="text-sm md:text-base font-bold text-white/80 flex items-center flex-wrap gap-x-1">
            {/* Month — editable */}
            {isEditingMonth ? (
              <select
                value={log.month ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  const month = val ? Number(val) : undefined;
                  onUpdate({ ...log, month, _regenerateContext: true } as any);
                  setIsEditingMonth(false);
                }}
                onBlur={() => setIsEditingMonth(false)}
                autoFocus
                className="bg-black/50 text-white text-sm font-bold rounded-lg outline-none border border-white/40 px-2 py-0.5 backdrop-blur-sm mr-1"
              >
                <option value="">No month</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setIsEditingMonth(true)}
                className="hover:text-white transition-colors underline decoration-dotted underline-offset-2 mr-0.5"
                title="Tap to edit month"
              >
                {log.month ? `${MONTHS[log.month - 1]} ` : '+ month '}
              </button>
            )}
            {log.year}
            {profile.showAge !== false && log.age != null && ` · Age ${log.age}`}
            {' · '}
            {/* Duration — editable */}
            {isEditingDuration ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={editedDuration}
                  onChange={e => setEditedDuration(e.target.value)}
                  onBlur={saveDuration}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') { setIsEditingDuration(false); setEditedDuration(log.duration != null ? String(log.duration) : ''); }
                  }}
                  autoFocus
                  className="w-12 bg-white/20 backdrop-blur-sm text-white text-center text-sm font-bold outline-none border-b border-white/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>days</span>
              </span>
            ) : (
              <button
                onClick={() => { setEditedDuration(log.duration != null ? String(log.duration) : ''); setIsEditingDuration(true); }}
                className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
                title="Tap to edit days"
              >
                {log.duration ? `${log.duration} ${log.duration === 1 ? 'day' : 'days'}` : '+ add days'}
              </button>
            )}
          </p>
        </div>
      </motion.div>

      {/* ===== SECTION 2: Time Capsule ===== */}
      {ctx && (
        <div className="relative">
          {/* Sparkle particles — play once on first load */}
          {sparkleActive && (
            <div className="absolute pointer-events-none" style={{ top: '30%', left: '50%', zIndex: 20 }}>
              <div className="sparkle-dot sparkle-dot-1" />
              <div className="sparkle-dot sparkle-dot-2" />
              <div className="sparkle-dot sparkle-dot-3" />
              <div className="sparkle-dot sparkle-dot-4" />
              <div className="sparkle-dot sparkle-dot-5" />
            </div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden bg-white rounded-[2rem] border-4 border-gray-100 shadow-lg p-5 md:p-7"
          >
            {sparkleActive && <div className="shimmer-bar" />}

            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm leading-none">📍</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Capsule</span>
              </div>
              <p className="text-gray-500 font-semibold text-sm leading-snug">
                You were in{' '}
                <span className="text-gray-800 font-black">{log.cityName}, {log.countryName}</span>
                {log.year && (
                  <span className="text-gray-400">
                    {' '}—{' '}
                    {log.month ? `${MONTHS[log.month - 1]} ` : ''}{log.year}
                  </span>
                )}
              </p>
            </div>

            {/* Moment cards — vertical stack */}
            <div className="space-y-4 md:space-y-5">

              {/* ── Music (hero card) ── */}
              {(ctx.topSong || (ctx.topSongs && ctx.topSongs.length > 0)) && (
                <div className="bg-stone-50 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">🎵</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Music</span>
                  </div>
                  {ctx.topSongs && ctx.topSongs.length > 0 ? (
                    <div className="space-y-3">
                      {ctx.topSongs.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          {idx === 0 && musicTrack?.artworkUrl ? (
                            <img
                              src={musicTrack.artworkUrl}
                              alt={s.title}
                              className="shrink-0 w-12 h-12 rounded-xl object-cover shadow-md"
                            />
                          ) : (
                            <span className={`text-[11px] font-black w-5 shrink-0 ${idx === 0 ? 'text-amber-500' : 'text-gray-400'}`}>#{idx + 1}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            {idx === 0 && musicTrack?.artworkUrl && (
                              <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide mb-0.5">#1</p>
                            )}
                            <p className={`font-black leading-snug truncate ${idx === 0 ? 'text-gray-800 text-lg' : 'text-gray-500 text-sm'}`}>{s.title}</p>
                            <p className={`font-bold uppercase tracking-wider ${idx === 0 ? 'text-gray-500 text-xs' : 'text-gray-400 text-[10px]'}`}>{s.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {musicTrack?.artworkUrl ? (
                        <div className="relative shrink-0 w-14 h-14">
                          <img
                            src={musicTrack.artworkUrl}
                            alt={ctx.topSong}
                            className="w-14 h-14 rounded-xl object-cover shadow-md"
                          />
                          {musicTrack.previewUrl && (
                            <>
                              <audio
                                ref={audioRef}
                                src={musicTrack.previewUrl}
                                preload="none"
                                onEnded={() => setIsPlaying(false)}
                              />
                              <button
                                onClick={togglePreview}
                                aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                                className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 hover:bg-black/65 transition-colors"
                              >
                                {isPlaying ? (
                                  <svg width="18" height="18" viewBox="0 0 18 18" fill="white" aria-hidden="true">
                                    <rect x="3" y="2" width="4" height="14" rx="1"/>
                                    <rect x="11" y="2" width="4" height="14" rx="1"/>
                                  </svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 18 18" fill="white" aria-hidden="true">
                                    <path d="M5 3.5l10 5.5-10 5.5V3.5z"/>
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        /* No artwork: icon placeholder */
                        <div className="shrink-0 w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                          <span className="text-2xl">🎵</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-800 font-black text-xl leading-snug truncate">{ctx.topSong}</p>
                          {musicTrack && (
                            <div className="flex items-end gap-[3px] shrink-0 h-4 pb-[1px]">
                              {[0,1,2,3,4].map(i => (
                                <span key={i} className={`eq-bar bg-teal-400${isPlaying ? ' playing' : ''}`} />
                              ))}
                            </div>
                          )}
                        </div>
                        {ctx.topArtist && <p className="text-gray-500 font-bold text-sm uppercase tracking-wider mt-1 truncate">{ctx.topArtist}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Cinema ── */}
              {ctx.movieOrShow && (
                <div className="bg-stone-50 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">🎬</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Cinema</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <p className="text-gray-700 text-base leading-snug font-semibold flex-1">{ctx.movieOrShow}</p>
                    {tmdbPoster && (
                      <img
                        src={tmdbPoster}
                        alt={ctx.movieOrShow}
                        className="shrink-0 w-16 rounded-lg object-cover shadow-md"
                        style={{ aspectRatio: '2/3' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── News (Major Event) ── */}
              {ctx.majorEvent && (
                <div className="bg-stone-50 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">🗞️</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">News</span>
                  </div>
                  <p className="text-gray-700 text-base leading-snug font-semibold">{ctx.majorEvent}</p>
                </div>
              )}

              {/* ── Tech ── */}
              {ctx.techMilestone && (
                <div className="bg-stone-50 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">🖥️</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Tech</span>
                  </div>
                  <p className="text-gray-700 text-base leading-snug font-semibold">{ctx.techMilestone}</p>
                </div>
              )}

              {/* ── Sports ── */}
              {ctx.topTeam && (
                <div className="bg-stone-50 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">🏟️</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Sports</span>
                  </div>
                  <p className="text-gray-700 text-base leading-snug font-semibold">{ctx.topTeam}</p>
                </div>
              )}

              {/* ── Fun Fact ── */}
              {ctx.funFact && (
                <div className="bg-stone-50 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">💡</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Fun Fact</span>
                  </div>
                  <p className="text-gray-700 text-base leading-snug font-semibold">{ctx.funFact}</p>
                </div>
              )}

              {/* ── Just For You (amber accent — always last) ── */}
              {ctx.personalizedNugget && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-5 md:px-5 md:py-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">✨</span>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-wider">Just For You</span>
                  </div>
                  <p className="text-amber-700 text-base leading-snug italic">{ctx.personalizedNugget}</p>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}

      {/* No time capsule empty state */}
      {!ctx && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-[2rem] border-4 border-dashed border-gray-200 p-8 text-center shadow-sm"
        >
          <span className="text-3xl block mb-3">📍</span>
          <p className="font-bold text-gray-400 text-sm">No time capsule for this trip yet</p>
          <p className="text-xs text-gray-400 mt-1">Add a month to generate nostalgic facts from that era</p>
          <button
            disabled={isRegenerating}
            onClick={async () => {
              setIsRegenerating(true);
              try {
                await onUpdate({ ...log, _regenerateContext: true } as any);
              } finally {
                setIsRegenerating(false);
              }
            }}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegenerating ? 'Generating...' : 'Generate Time Capsule'}
          </button>
        </motion.div>
      )}

      {/* ===== SECTION 3: My Moments ===== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-[2rem] border-4 border-gray-100 p-6 md:p-8 shadow-lg"
        data-tour="demo-moments-store"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">My Moments</h2>
              {allStories.length > 0 && (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {allStories.length} {allStories.length === 1 ? 'card' : 'cards'}
                </p>
              )}
            </div>
          </div>
          {!demoWalkActive && (
            <button
              onClick={() => setShowAddStory(true)}
              className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        {allStories.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {allStories.map((story, i) => (
              <StoryCard
                key={i}
                story={story}
                index={i}
                onTap={() => setViewerIndex(i)}
                onDelete={() => removeStory(i)}
              />
            ))}
            {!demoWalkActive && (
              <motion.button
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: allStories.length * 0.04 + 0.05 }}
                onClick={() => setShowAddStory(true)}
                className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-300 hover:text-green-400"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Add</span>
              </motion.button>
            )}
          </div>
        ) : (
          /* Empty state */
          <button
            onClick={() => {
              if (!demoWalkActive) setShowAddStory(true);
            }}
            disabled={demoWalkActive}
            className="w-full py-14 flex flex-col items-center justify-center gap-3 text-gray-300 border-4 border-dashed border-gray-100 rounded-[2rem] hover:border-green-200 hover:text-green-400 transition-colors group disabled:pointer-events-none disabled:opacity-60"
          >
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-800 opacity-60 group-hover:opacity-80 transition-opacity" />
            </div>
            <p className="font-black uppercase tracking-widest text-xs">Add photos &amp; notes</p>
            <p className="text-[10px]">Photos, videos, text cards</p>
          </button>
        )}
      </motion.div>

      {/* ===== Share Button ===== */}
      {onPlanTrip && demoWalkStepId === 'memoryPlanner' ? (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mx-auto w-full max-w-xl rounded-[1.75rem] border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 sm:p-5 shadow-[0_18px_50px_rgba(79,70,229,0.12)]"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-1">Next Up</p>
                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                  Ready for the AI Planner?
                </h3>
                <p className="mt-2 text-sm font-medium text-gray-600 leading-relaxed">
                  Tap the AI Planner button below and we’ll turn this memory into a fresh trip.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mx-auto flex w-full max-w-xl justify-center"
          >
            <button
              ref={plannerCtaRef}
              data-tour="memory-planner"
              onClick={onPlanTrip}
              className="w-full max-w-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Continue to AI Planner
            </button>
          </motion.div>
        </div>
      ) : onPlanTrip ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex justify-center"
        >
          <button
            ref={plannerCtaRef}
            data-tour="memory-planner"
            onClick={onPlanTrip}
            className="w-full max-w-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Continue to AI Planner
          </button>
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center"
      >
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-colors shadow-lg"
        >
          <Share2 className="w-4 h-4" />
          Share Memory
        </button>
      </motion.div>

      {/* ===== Add Moment Modal ===== */}
      <AnimatePresence>
        {showAddStory && log.id && (
          <AddStoryModal
            onClose={() => setShowAddStory(false)}
            onSave={addStory}
            tripId={log.id}
          />
        )}
      </AnimatePresence>

      {/* ===== Story Viewer ===== */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <StoryViewer
            stories={allStories}
            initialIndex={viewerIndex}
            onClose={() => {
              setViewerIndex(null);
              if (demoWalkStepId === 'memoryStoryOpen') {
                onDemoWalkAdvance?.('memoryPlanner');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ===== Delete Confirmation Modal ===== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-3xl border-4 border-red-100 shadow-2xl p-6 sm:p-8 max-w-sm w-full space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-2xl mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-800">Delete Memory?</h3>
              <p className="text-sm font-bold text-gray-400">
                This will permanently remove <span className="text-gray-600 font-black">{log.cityName}, {log.countryName} ({log.year})</span> from your travel log.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-3 rounded-2xl transition-all uppercase tracking-widest text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete?.(); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-2xl shadow-[0_4px_0_0_#b91c1c] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalView;
