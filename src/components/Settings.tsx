import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { User, Calendar, Save, CheckCircle, LogOut, Sparkles, CreditCard, Trophy, Plus, MapPin, Heart, Target, Mail, Shield, Users, Copy, Share2, Pencil, X, Loader2, Cake, ChevronDown, Search, Globe, Zap, MessageSquare, Wrench, Camera } from 'lucide-react';
import { LEVELS, LevelDefinition } from '../constants/gamification';
import { INTERESTS, TRAVEL_GOALS, COUNTRIES } from '../constants/onboarding';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { auth, db, getAuthProviderLabel, storage } from '../firebase';
import { getAvatarUrl } from '../lib/utils';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { isDemoMode } from '../lib/demoMode';

interface SettingsProps {
  profile: UserProfile;
  isPro: boolean;
  useNativeUpgrade?: boolean;
  onUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
  onCheckReferralCode: (code: string) => Promise<boolean>;
  onGlobePaint?: () => void;
  onUpgradeToPro?: () => Promise<void>;
  onRestorePurchases?: () => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({
  profile,
  isPro,
  useNativeUpgrade = false,
  onUpdate,
  onLogout,
  onCheckReferralCode,
  onGlobePaint,
  onUpgradeToPro,
  onRestorePurchases,
}) => {
  const isDemo = isDemoMode();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [birthDate, setBirthDate] = useState(profile.birthDate || '1988-11-01');
  const [homeCountry, setHomeCountry] = useState(profile.homeCountry || '');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [travelGoals, setTravelGoals] = useState<string[]>(profile.travelGoals || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [isRefillLoading, setIsRefillLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAge, setShowAge] = useState(profile.showAge !== false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCode, setEditedCode] = useState(profile.referralCode || '');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [codeSaving, setCodeSaving] = useState(false);
  const codeCheckRef = useRef<ReturnType<typeof setTimeout>>();

  // Bug report form state
  const [bugDescription, setBugDescription] = useState('');
  const [bugCategory, setBugCategory] = useState<'bug' | 'feature' | 'other'>('bug');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugToast, setBugToast] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleBugSubmit = async () => {
    if (!bugDescription.trim()) return;
    setBugSubmitting(true);
    console.log('[BugReport] Submitting:', { uid: profile.uid, email: profile.email, description: bugDescription.trim().substring(0, 50) });
    try {
      const docRef = await addDoc(collection(db, 'bugReports'), {
        userId: profile.uid,
        email: profile.email,
        description: bugDescription.trim(),
        category: bugCategory,
        deviceInfo: navigator.userAgent,
        appVersion: '1.0.0',
        timestamp: serverTimestamp(),
        status: 'new',
      });
      console.log('[BugReport] Success! Doc ID:', docRef.id);
      // Fire-and-forget Telegram notification
      fetch('/.netlify/functions/bug-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: bugDescription.trim(),
          category: bugCategory,
          email: profile.email,
          deviceInfo: navigator.userAgent,
        }),
      }).catch(() => { /* non-critical */ });
      setBugDescription('');
      setBugCategory('bug');
      setBugToast(true);
      setTimeout(() => setBugToast(false), 4000);
    } catch (error) {
      console.error('[BugReport] Failed to submit bug report:', error);
      // Show error toast instead of silently failing
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setBugSubmitting(false);
    }
  };

  // Tier color helpers
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return 'text-orange-600';
      case 'Silver': return 'text-slate-500';
      case 'Gold': return 'text-yellow-600';
      case 'Platinum': return 'text-cyan-500';
      case 'Diamond': return 'text-indigo-600';
      default: return 'text-gray-400';
    }
  };

  const getTierBg = (tier: string) => {
    switch (tier) {
      case 'Bronze': return 'bg-gradient-to-br from-orange-400 to-orange-600';
      case 'Silver': return 'bg-gradient-to-br from-slate-300 to-slate-500';
      case 'Gold': return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
      case 'Platinum': return 'bg-gradient-to-br from-cyan-400 to-cyan-600';
      case 'Diamond': return 'bg-gradient-to-br from-indigo-500 to-indigo-700';
      default: return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
    }
  };

  const currentTier = LEVELS.find(l => l.level === profile.level)?.tier || 'Bronze';

  // Country dropdown state
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryRef = useRef<HTMLDivElement>(null);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const selectedCountryAlpha2 = COUNTRIES.find(c => c.name === homeCountry)?.alpha2;

  // Debounced availability check as user types
  useEffect(() => {
    if (!isEditingCode) return;
    if (!editedCode || editedCode.length < 2) {
      setCodeStatus(editedCode.length > 0 ? 'invalid' : 'idle');
      return;
    }
    // Same as current code — no need to check
    if (editedCode === profile.referralCode) {
      setCodeStatus('available');
      return;
    }
    setCodeStatus('checking');
    if (codeCheckRef.current) clearTimeout(codeCheckRef.current);
    codeCheckRef.current = setTimeout(async () => {
      try {
        const available = await onCheckReferralCode(editedCode);
        setCodeStatus(available ? 'available' : 'taken');
      } catch {
        setCodeStatus('idle');
      }
    }, 500);
    return () => { if (codeCheckRef.current) clearTimeout(codeCheckRef.current); };
  }, [editedCode, isEditingCode]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        displayName,
        birthDate,
        homeCountry,
        interests,
        travelGoals,
        showAge,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const link = `https://globotrottr.com?ref=${profile.referralCode}`;
    const firstName = profile.displayName.split(' ')[0];
    const text = `${firstName} invites you to GloboTrottr — track your travels, unlock memories. Join free: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GloboTrottr', text, url: link });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        setCopied(false);
      }
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image under 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `profile-photos/${profile.uid}/avatar-${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      await onUpdate({ photoURL });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Could not upload your profile image right now. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleGoPro = async () => {
    setIsCheckoutLoading(true);
    try {
      if (useNativeUpgrade && onUpgradeToPro) {
        await onUpgradeToPro();
        return;
      }
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: 'pro', uid: profile.uid, origin: window.location.origin }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong starting checkout. Please try again.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!onRestorePurchases) return;
    setIsRestoreLoading(true);
    try {
      await onRestorePurchases();
    } catch (error) {
      console.error('Restore purchases error:', error);
      alert('Could not restore purchases right now. Please try again.');
    } finally {
      setIsRestoreLoading(false);
    }
  };

  const avatarUrl = getAvatarUrl(profile.photoURL);

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 mb-2">Settings</h2>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 font-bold">Customize your travel profile</p>
      </div>

      {/* Go Pro Section - Only show if NOT Pro */}
      {!isDemo && !isPro && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-6 md:p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <Sparkles className="absolute -right-4 -top-4 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 opacity-20 rotate-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 md:mb-4">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-300" />
              </div>
              <h3 className="text-base sm:text-lg md:text-2xl font-black uppercase tracking-tight">GloboTrotter Pro</h3>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-purple-100 font-bold mb-3 md:mb-6 leading-relaxed">
              {useNativeUpgrade
                ? 'Unlock Pro with Apple in-app purchase and keep your premium access tied to the app.'
                : 'Unlock unlimited travel logs, exclusive badges, and custom map themes. Support the journey!'}
            </p>
            <button
              onClick={handleGoPro}
              disabled={isCheckoutLoading}
              className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-black py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl shadow-[0_4px_0_0_#e0e7ff] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base"
            >
              {isCheckoutLoading ? (
                <div className="w-5 h-5 md:w-6 md:h-6 border-4 border-indigo-200 border-t-indigo-700 rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                  {useNativeUpgrade ? 'Unlock in App for $9.99' : 'Upgrade for $9.99'}
                </>
              )}
            </button>
            {useNativeUpgrade && onRestorePurchases && (
              <button
                onClick={handleRestore}
                disabled={isRestoreLoading}
                className="mt-3 w-full border border-white/25 text-white/90 hover:bg-white/10 font-black py-3 rounded-xl sm:rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {isRestoreLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Restore Purchases'
                )}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Pro Achievement Card - Show when user IS Pro */}
      {!isDemo && isPro && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-6 md:p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <Sparkles className="absolute -right-4 -top-4 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 opacity-30 rotate-12" />
          <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 md:mb-4">
              <div className="bg-white/30 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg md:text-2xl font-black uppercase tracking-tight">Pro Traveler</h3>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-white/90 font-bold mb-3 md:mb-6 leading-relaxed">
              You're a founding member! Track unlimited trips, 100 bonus fuel, and exclusive perks forever.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                <Zap className="w-4 h-4 text-white" />
                <span className="text-xs sm:text-sm font-black whitespace-nowrap">+100 Fuel</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                <MapPin className="w-4 h-4 text-white" />
                <span className="text-xs sm:text-sm font-black whitespace-nowrap">Unlimited Trips</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-xs sm:text-sm font-black whitespace-nowrap">Early Access</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl sm:rounded-3xl md:rounded-[3rem] border-4 border-gray-100 p-4 sm:p-6 md:p-8 shadow-xl space-y-8 sm:space-y-10 md:space-y-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-bl-full -z-10 opacity-50" />
        
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 pb-4 sm:pb-6 md:pb-8 border-b-2 border-gray-50">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32 rounded-2xl md:rounded-[2.5rem] overflow-hidden border-4 border-green-100 shadow-lg bg-gray-50">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22c55e&color=fff&size=256`}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -left-1 -bottom-1 flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {isUploadingAvatar ? 'Uploading' : avatarUrl ? 'Change' : 'Upload'}
            </button>
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 ${getTierBg(currentTier)} rounded-md sm:rounded-lg rotate-12 flex items-center justify-center shadow-md border-2 border-white`}>
              <span className="text-[10px] sm:text-xs md:text-sm font-black text-white -rotate-12 leading-none">{profile.level}</span>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
          <div className="text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-gray-800">{displayName}</h3>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">
              {avatarUrl ? 'Profile photo' : 'Add a profile photo any time'}
            </p>
            <div className="mt-4 w-full">
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                <div className="relative shrink-0">
                  <div className={`w-14 h-14 ${getTierBg(currentTier)} rounded-2xl rotate-12 flex items-center justify-center shadow-md`}>
                    <span className="text-2xl font-black text-white -rotate-12">{profile.level}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-black text-gray-800">
                      {LEVELS.find(l => l.level === profile.level)?.title || 'Wanderer'}
                    </span>
                    <span className={`text-[9px] font-black ${getTierColor(currentTier)} uppercase`}>
                      • {currentTier}
                    </span>
                  </div>
                  {profile.level < 13 && (
                    <>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getTierBg(currentTier)} rounded-full`}
                          style={{ width: `${Math.min(((profile.xp - (LEVELS.find(l => l.level === profile.level)?.xpRequired || 0)) / ((LEVELS.find(l => l.level === profile.level + 1)?.xpRequired || profile.xp) - (LEVELS.find(l => l.level === profile.level)?.xpRequired || 0))) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] font-bold text-gray-400">
                        <span>{profile.xp} XP</span>
                        <span>{LEVELS.find(l => l.level === profile.level + 1)?.xpRequired || 'MAX'} XP</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <User className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Personal Info</h3>
          </div>

          {/* Birthday nudge */}
          {!birthDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-100 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
                <Cake className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-pink-700">Add your birthday to unlock age-based badges</p>
                <p className="text-xs text-pink-500 mt-0.5">Early Bird (trips before 10), Golden Voyager (70+), and Milestone Trip achievements.</p>
              </div>
            </motion.div>
          )}

          {/* Globe Paint reset - always show option to redo */}
          {onGlobePaint && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onGlobePaint}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 p-4 rounded-xl flex items-center gap-3 text-white"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Complete Your Travel DNA</p>
                <p className="text-xs text-white/70">Map your travel history for smarter plans</p>
              </div>
            </motion.button>
          )}

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 sm:w-4.5 h-4 sm:h-4.5 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  autoComplete="name"
                  onChange={(e) => setDisplayName(e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 50))}
                  maxLength={50}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl py-2.5 sm:py-3 md:py-4 pl-10 sm:pl-11 pr-4 font-bold text-gray-900 placeholder-gray-400 focus:border-green-400 outline-none transition-all"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">Birth Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 sm:w-4.5 h-4 sm:h-4.5 text-gray-400" />
                <input
                  type="date"
                  value={birthDate}
                  autoComplete="bday"
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl py-2.5 sm:py-3 md:py-4 pl-10 sm:pl-11 pr-4 font-bold text-gray-900 placeholder-gray-400 focus:border-green-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border-2 border-gray-100 rounded-xl py-3 sm:py-3.5 md:py-4 px-3 sm:px-4">
              <div>
                <div className="text-sm font-bold text-gray-700">Show age on travel cards</div>
                <div className="text-[10px] font-bold text-gray-400">Visible on your public profile and shared cards</div>
              </div>
              <button
                type="button"
                onClick={() => setShowAge(!showAge)}
                className={`w-12 h-7 rounded-full transition-all relative ${showAge ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all ${showAge ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

          </div>
        </div>

        {/* Account Section */}
        <div className="space-y-6 sm:space-y-8 pt-4 sm:pt-6 md:pt-14 border-t-2 border-gray-50">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Account</h3>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">Email</label>
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl py-2.5 sm:py-3 md:py-4 px-3 sm:px-4">
                <Mail className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-gray-400 shrink-0" />
                <span className="font-bold text-gray-600 text-xs sm:text-sm truncate">{profile.email}</span>
                <span className="ml-auto flex items-center gap-1.5 text-[7px] sm:text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  {profile.authProvider === 'apple.com' ? (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M16.365 1.43c0 1.14-.414 2.224-1.154 3.004-.817.86-2.15 1.524-3.307 1.431-.146-1.103.402-2.286 1.13-3.043.8-.84 2.17-1.468 3.331-1.392zM20.46 17.126c-.58 1.288-.857 1.861-1.603 3.01-1.04 1.603-2.507 3.6-4.328 3.615-1.617.015-2.034-1.031-4.23-1.018-2.196.013-2.654 1.037-4.273 1.022-1.82-.015-3.21-1.819-4.25-3.42-2.908-4.476-3.215-9.729-1.418-12.492 1.277-1.962 3.293-3.11 5.188-3.11 1.93 0 3.146 1.06 4.74 1.06 1.545 0 2.486-1.062 4.724-1.062 1.688 0 3.475.918 4.748 2.5-4.18 2.292-3.502 8.264.702 9.895z"/>
                    </svg>
                  ) : profile.authProvider === 'password' || profile.authProvider === 'email' ? (
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  )}
                  Signed in with {getAuthProviderLabel(profile.authProvider)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback / Bug Report */}
        {!isDemo && (
        <div className="pt-4 sm:pt-6 md:pt-14 border-t-2 border-gray-50">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-stone-500" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Send Feedback</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['bug', 'feature', 'other'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBugCategory(cat)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all',
                    bugCategory === cat
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-stone-300'
                  )}
                >
                  {cat === 'bug' ? 'Bug' : cat === 'feature' ? 'Feature' : 'Other'}
                </button>
              ))}
            </div>
            <textarea
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
              className="w-full p-3 sm:p-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-bold text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-stone-400 transition-all resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleBugSubmit}
                disabled={bugSubmitting || !bugDescription.trim()}
                className="flex-1 bg-stone-800 hover:bg-stone-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-3 rounded-xl shadow-[0_3px_0_0_#1c1917] active:shadow-none active:translate-y-0.5 transition-all uppercase tracking-widest flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {bugSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit'
                )}
              </button>
            </div>
            {bugToast && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="block text-xs font-black text-green-600 flex items-center gap-1 mt-3"
              >
                <CheckCircle className="w-4 h-4 inline" /> Thanks! We'll look into it.
              </motion.span>
            )}
          </div>
        </div>
        )}

        {/* Refer a Friend */}
        {!isDemo && (
        <div className="space-y-4 sm:space-y-5 pt-4 sm:pt-6 md:pt-14 border-t-2 border-gray-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-lime-100 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-lime-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Refer a Friend</h3>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">You both get +2 fuel when they join</p>
            </div>
          </div>

          {profile.referralCode && (
            <div className="bg-lime-50 border-2 border-lime-100 rounded-xl sm:rounded-2xl p-4 sm:p-5">
              <p className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-1">Your referral link</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <p className="flex-1 text-xs sm:text-sm font-bold text-gray-700 truncate">
                  globotrottr.com?ref={profile.referralCode}
                </p>
                <button
                  onClick={handleShare}
                  className="shrink-0 flex items-center gap-1.5 bg-lime-500 hover:bg-lime-600 text-white font-black text-xs px-3 py-2 rounded-lg shadow-[0_2px_0_0_#4ade80] active:shadow-none active:translate-y-0.5 transition-all uppercase tracking-wide"
                >
                  {copied ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Share2 className="w-3.5 h-3.5" /> Share</>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-lime-500 shrink-0" />
            <span className="text-sm font-black text-gray-700">{profile.referralCount || 0}</span>
            <span className="text-sm text-gray-500 font-medium">{(profile.referralCount || 0) === 1 ? 'friend invited' : 'friends invited'}</span>
          </div>

          {profile.referredBy && profile.referredByName && (
            <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
              <span>Invited by</span>
              <span className="font-black text-gray-500">{profile.referredByName}</span>
            </p>
          )}
        </div>
        )}

        {/* Travel Preferences (from Onboarding) */}
        <div className="space-y-6 sm:space-y-8 pt-4 sm:pt-6 md:pt-14 border-t-2 border-gray-50">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Travel Preferences</h3>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">Home Country</label>
              <div ref={countryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="w-full p-3 sm:p-4 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl font-bold text-gray-700 text-left flex items-center gap-3 hover:border-green-200 focus:border-green-500 outline-none transition-all"
                >
                  {homeCountry ? (
                    <>
                      <img
                        key={selectedCountryAlpha2}
                        src={`https://flagcdn.com/w40/${selectedCountryAlpha2}.png?v=2`}
                        alt=""
                        className="w-7 h-5 object-cover rounded-sm shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://flagcdn.com/w40/${selectedCountryAlpha2}.png?t=${Date.now()}`;
                        }}
                      />
                      <span className="flex-1">{homeCountry}</span>
                    </>
                  ) : (
                    <span className="flex-1 text-gray-400">Select your country</span>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", countryOpen && "rotate-180")} />
                </button>

                {countryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 top-full mt-2 w-full bg-white border-2 border-gray-100 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="bg-transparent outline-none font-bold text-sm text-gray-900 placeholder-gray-400 w-full"
                          autoFocus
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto overflow-x-hidden">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          onClick={() => {
                            setHomeCountry(country.name);
                            setCountryOpen(false);
                            setCountrySearch('');
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-green-50 transition-colors",
                            homeCountry === country.name && "bg-green-50"
                          )}
                        >
                          <img
                            src={`https://flagcdn.com/w40/${country.alpha2}.png`}
                            alt=""
                            className="w-6 h-4 object-cover rounded-sm shadow-sm"
                          />
                          <span className="font-bold text-sm text-gray-700">{country.name}</span>
                          {homeCountry === country.name && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <div className="px-4 py-4 text-center text-gray-400 font-bold text-sm">No countries found</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-red-400" /> Interests
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => setInterests(prev => prev.includes(interest.id) ? prev.filter(i => i !== interest.id) : [...prev, interest.id])}
                    className={`p-2.5 sm:p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 text-center ${
                      interests.includes(interest.id)
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-red-200'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{interest.icon}</span>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight leading-tight">{interest.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-purple-400" /> Travel Goals
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {TRAVEL_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setTravelGoals(prev => prev.includes(goal.id) ? prev.filter(g => g !== goal.id) : [...prev, goal.id])}
                    className={`p-2.5 sm:p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 text-center ${
                      travelGoals.includes(goal.id)
                        ? 'bg-purple-50 border-purple-400 text-purple-700'
                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-purple-200'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{goal.icon}</span>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight leading-tight">{goal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {!isDemo && (
        <div className="pt-6 md:pt-10 border-t-2 border-gray-50">
          <div className="grid grid-cols-1 gap-2 md:gap-4">
            <div className="bg-indigo-50 p-3 md:p-6 rounded-xl md:rounded-[2rem] border-2 border-indigo-100">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest">Travel Fuel</div>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-3xl md:text-4xl font-black text-indigo-600">{profile.credits}</div>
                <div className="text-xs md:text-sm font-bold text-indigo-400 mb-1">Gallons Remaining</div>
              </div>
              <div className="w-full bg-indigo-100 h-2.5 rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((profile.credits / 100) * 100, 100)}%` }}
                  className="bg-indigo-500 h-full"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 md:pt-8 flex flex-col gap-3 md:gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl shadow-[0_4px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>

          {profile.email === 'ukaushik37@gmail.com' && (
            <button
              onClick={() => { window.history.pushState({}, '', '/admin'); window.location.reload(); }}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold py-4 px-4 rounded-2xl border-2 border-stone-200 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Wrench className="w-4 h-4" />
              Admin Panel
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-500 font-black py-4 px-4 rounded-2xl border-2 border-red-100 transition-all uppercase tracking-widest flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
