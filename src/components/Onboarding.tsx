import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Target,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Globe,
  Plane,
  MessageCircle,
  User,
  Search,
  ChevronDown,
  X
} from 'lucide-react';
import { INTERESTS, TRAVEL_GOALS, COUNTRIES } from '../constants/onboarding';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface OnboardingProps {
  onComplete: (data: Partial<UserProfile>) => void;
  userEmail: string;
  initialName?: string;
  savedStep?: number;
  onSaveProgress?: (step: number) => void;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome!', icon: Sparkles },
  { id: 'name', title: 'Your Name', icon: User },
  { id: 'home', title: 'Home Base', icon: Globe },
  { id: 'interests', title: 'Your Interests', icon: Heart },
  { id: 'goals', title: 'Travel Goals', icon: Target },
  { id: 'success', title: 'Ready to Fly!', icon: Plane },
];


const WhyBox: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0, y: 10 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    whileHover={{ rotate: [0, -1, 1, 0], transition: { duration: 0.2 } }}
    className={cn(
      "relative p-4 rounded-2xl border-2 mt-4 mx-auto max-w-[75%]",
      color === 'pink' && "bg-pink-50 border-pink-100 text-pink-700",
      color === 'green' && "bg-green-50 border-green-100 text-green-700",
      color === 'red' && "bg-red-50 border-red-100 text-red-700",
      color === 'purple' && "bg-purple-50 border-purple-100 text-purple-700",
      color === 'blue' && "bg-blue-50 border-blue-100 text-blue-700"
    )}
  >
    <div className={cn(
      "absolute -top-2 left-6 w-4 h-4 rotate-45 border-l-2 border-t-2",
      color === 'pink' && "bg-pink-50 border-pink-100",
      color === 'green' && "bg-green-50 border-green-100",
      color === 'red' && "bg-red-50 border-red-100",
      color === 'purple' && "bg-purple-50 border-purple-100",
      color === 'blue' && "bg-blue-50 border-blue-100"
    )} />

    <div className="flex gap-3 items-start relative z-10">
      <div className={cn(
        "p-1.5 rounded-lg shrink-0 shadow-sm",
        color === 'pink' && "bg-pink-100",
        color === 'green' && "bg-green-100",
        color === 'red' && "bg-red-100",
        color === 'purple' && "bg-purple-100",
        color === 'blue' && "bg-blue-100"
      )}>
        <MessageCircle className="w-3.5 h-3.5" />
      </div>
      <p className="text-[10px] font-bold leading-relaxed tracking-normal">
        {children}
      </p>
    </div>
  </motion.div>
);

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userEmail, initialName, savedStep, onSaveProgress }) => {
  const [currentStep, setCurrentStep] = useState(savedStep || 0);
  const [formData, setFormData] = useState<Partial<UserProfile> & { displayName?: string }>({
    displayName: initialName || '',
    homeCountry: '',
    interests: [],
    travelGoals: [],
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  // Country dropdown state
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);

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

  const selectedCountryAlpha2 = COUNTRIES.find(c => c.name === formData.homeCountry)?.alpha2;

  const launchConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];
    const particles: { x: number; y: number; vx: number; vy: number; color: string; w: number; h: number; rotation: number; rotationSpeed: number; life: number }[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.vy += 0.25;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= 0.008;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 300) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  const handleComplete = () => {
    launchConfetti();
    setShowCelebration(true);
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onComplete({ ...formData, onboarded: true });
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1 && (!formData.displayName || formData.displayName.trim().length < 2)) {
      setError('Please enter a valid name (at least 2 characters)');
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (currentStep === 2 && !formData.homeCountry) {
      setError('Please select your home country');
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (currentStep === 4 && (!formData.interests || formData.interests.length === 0)) {
      setError('Please select at least one interest');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onSaveProgress?.(next);
    } else {
      onComplete({ ...formData, onboarded: true });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleSelection = (field: 'interests' | 'travelGoals', id: string) => {
    setFormData(prev => {
      const current = (prev[field] as string[]) || [];
      const updated = current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id];
      return { ...prev, [field]: updated };
    });
  };

  const selectStyles = "bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-gray-100 font-bold text-gray-700 focus:border-green-400 outline-none transition-all appearance-none cursor-pointer";

  const renderStep = () => {
    const step = STEPS[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="space-y-6 text-center">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6"
            >
              <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-800 uppercase tracking-tight">Welcome to GloboTrotter</h2>
            <p className="text-gray-500 font-bold leading-relaxed max-w-sm sm:max-w-md mx-auto text-base sm:text-lg">
              Let's personalize your journey. We'll use this info to gamify your travel history and find the perfect trips for you.
            </p>
          </div>
        );

      case 'name':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-800 uppercase">What should we call you?</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your explorer name</p>
              </div>
            </div>
            <input
              type="text"
              placeholder="Enter your name"
              autoComplete="name"
              data-1p-ignore
              maxLength={50}
              value={formData.displayName}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 50);
                setFormData({ ...formData, displayName: sanitized });
              }}
              className="w-full p-4 sm:p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 text-lg focus:border-blue-500 outline-none transition-all"
            />
            <WhyBox color="blue">
              This is how we'll greet you across the app. You can always change it later in Settings.
            </WhyBox>
          </div>
        );

      case 'home':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-800 uppercase">Where is home?</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Personalize your time capsule</p>
              </div>
            </div>

            {/* Country dropdown */}
            <div ref={countryRef} className="relative">
              <button
                type="button"
                onClick={() => setCountryOpen(!countryOpen)}
                className="w-full p-4 sm:p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 text-left flex items-center gap-3 hover:border-green-200 focus:border-green-500 outline-none transition-all"
              >
                {formData.homeCountry ? (
                  <>
                    <img
                      key={selectedCountryAlpha2}
                      src={`https://flagcdn.com/w40/${selectedCountryAlpha2}.png?v=2`}
                      alt=""
                      className="w-8 h-6 object-cover rounded-sm shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://flagcdn.com/w40/${selectedCountryAlpha2}.png?t=${Date.now()}`;
                      }}
                    />
                    <span className="flex-1 text-lg">{formData.homeCountry}</span>
                  </>
                ) : (
                  <span className="flex-1 text-gray-400">Select your country</span>
                )}
                <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", countryOpen && "rotate-180")} />
              </button>

              {countryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 top-full mt-2 w-full bg-white border-2 border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
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
                  <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.alpha2}
                        onClick={() => {
                          setFormData({ ...formData, homeCountry: country.name });
                          setCountryOpen(false);
                          setCountrySearch('');
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors",
                          formData.homeCountry === country.name && "bg-green-50"
                        )}
                      >
                        <img
                          src={`https://flagcdn.com/w40/${country.alpha2}.png`}
                          alt=""
                          className="w-7 h-5 object-cover rounded-sm shadow-sm"
                        />
                        <span className="font-bold text-sm text-gray-700">{country.name}</span>
                        {formData.homeCountry === country.name && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="px-4 py-6 text-center text-gray-400 font-bold text-sm">No countries found</div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            <WhyBox color="green">
              Knowing your home country helps us pull relevant historical data for your past trips — like what was the number one song or sports team in your country at that time.
            </WhyBox>
          </div>
        );

      case 'interests':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-800 uppercase">What do you love?</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Get tailored travel nudges</p>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {INTERESTS.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleSelection('interests', interest.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center",
                    formData.interests?.includes(interest.id)
                      ? "bg-red-50 border-red-500 text-red-700 shadow-[0_3px_0_0_#ef4444]"
                      : "bg-white border-gray-100 text-gray-500 hover:border-red-200 shadow-[0_3px_0_0_#f3f4f6]"
                  )}
                >
                  <span className="text-2xl sm:text-3xl">{interest.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-tight">{interest.label}</span>
                </button>
              ))}
            </div>
            <WhyBox color="red">
              We'll nudge you about upcoming festivals, sports events, or food seasons that match your interests.
            </WhyBox>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-800 uppercase">Your Travel Goals</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Set your north star</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {TRAVEL_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleSelection('travelGoals', goal.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left",
                    formData.travelGoals?.includes(goal.id)
                      ? "bg-purple-50 border-purple-500 text-purple-700 shadow-[0_3px_0_0_#a855f7]"
                      : "bg-white border-gray-100 text-gray-500 hover:border-purple-200 shadow-[0_3px_0_0_#f3f4f6]"
                  )}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <span className="text-xs font-black uppercase tracking-tight">{goal.label}</span>
                  {formData.travelGoals?.includes(goal.id) && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
            <WhyBox color="purple">
              Setting goals helps us track your progress and celebrate big milestones like visiting every continent.
            </WhyBox>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-8 text-center relative py-12">
            {/* Plane swoops from behind the card in a smooth arc to the right */}
            <motion.div
              initial={{ x: 0, y: 0, scale: 0.15, rotate: 20, opacity: 0 }}
              animate={{
                x: 500,
                y: -120,
                scale: 0.4,
                rotate: -10,
                opacity: 0
              }}
              transition={{
                duration: 4,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.8
              }}
              className="absolute bottom-24 left-[35%] text-green-500 z-0"
            >
              <Plane className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
            </motion.div>

            <div className="relative z-10">
              {/* Rotating globe */}
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Globe className="w-12 h-12 text-white" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black text-gray-800 uppercase tracking-tight">You're all set!</h2>
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Your passport is stamped & ready</p>
              </div>

              <div className="mt-8 bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 max-w-sm sm:max-w-md mx-auto">
                <p className="text-sm sm:text-base font-bold text-gray-500 leading-relaxed">
                  We've personalized your dashboard based on your interests. Start logging your past adventures to unlock your first badges!
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div data-onboarding className="fixed inset-0 z-[100] bg-white flex flex-col h-[100dvh] overflow-hidden overscroll-none" style={{ overflowX: 'clip' }}>
      {/* Header / Progress */}
      <div className="p-3 sm:p-4 flex-shrink-0 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                i <= currentStep ? "w-6 sm:w-10 bg-green-500" : "w-4 sm:w-5 bg-gray-100"
              )}
            />
          ))}
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="px-4 py-2 bg-red-500 text-white text-xs font-bold text-center">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 p-3 sm:p-5 flex flex-col justify-center max-w-lg sm:max-w-xl mx-auto w-full overflow-visible">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer / Navigation */}
      <div className={cn(
        "p-3 sm:p-4 flex-shrink-0 max-w-3xl mx-auto w-full",
        currentStep === 0 ? "flex justify-center" : "flex items-center justify-center gap-4"
      )}>
        {currentStep > 0 && (
          <button
            onClick={prevStep}
            className="p-3 sm:p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <button
          onClick={currentStep === STEPS.length - 1 ? handleComplete : nextStep}
          className="bg-green-500 text-white px-5 sm:px-8 py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2 hover:bg-green-600 transition-all shadow-[0_3px_0_0_#16a34a] sm:shadow-[0_5px_0_0_#16a34a] active:shadow-none active:translate-y-0.5"
        >
          {currentStep === STEPS.length - 1 ? 'Start Exploring' : 'Next'}
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Confetti Canvas */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 z-[300] pointer-events-none"
      />

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
              className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 max-w-md w-full shadow-2xl border-4 border-gray-50"
            >
              <div className="absolute top-0 left-0 right-0 h-32 -z-10 opacity-10 bg-blue-500 rounded-t-[2rem] sm:rounded-t-[2.5rem]" />

              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <button
                  onClick={handleCelebrationClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </button>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.6, delay: 0.4 }}
                  className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl rotate-3 bg-blue-500"
                >
                  <Globe className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                </motion.div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl sm:text-3xl font-black text-gray-800 uppercase tracking-tight">New Explorer</h2>
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  </div>
                  <p className="text-sm sm:text-base text-gray-500 font-bold leading-relaxed">Took the first step into the unknown.</p>
                </div>

                <div className="w-full space-y-3 sm:space-y-4">
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Requirement</div>
                    <div className="text-xs sm:text-sm font-black text-gray-700">Join GloboTrotter</div>
                  </div>

                  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-100">
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</div>
                      <div className="text-[10px] font-black text-green-600 uppercase tracking-widest">1 / 1</div>
                    </div>
                    <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="h-full bg-green-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCelebrationClose}
                  className="w-full bg-gray-800 text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-gray-900 transition-all uppercase tracking-widest shadow-lg text-sm sm:text-base"
                >
                  Let's Go!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
