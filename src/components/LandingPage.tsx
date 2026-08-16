import React from 'react';
import { motion } from 'motion/react';
import { Globe as GlobeIcon, Map, Sparkles, Plane, Trophy, Camera, MapPin, ChevronRight, Zap, Star, Shield, DollarSign, Check, Play, Cookie } from 'lucide-react';
import { trackEvent } from '../services/analytics';

interface LandingPageProps {
  onLogin: () => void;
  onGoToLogin: (mode?: 'sign_in' | 'sign_up') => void;
  loginError?: string | null;
  demoEnabled?: boolean;
  onEnterDemo?: () => void;
  onOpenCookieSettings?: () => void;
}

const features = [
  {
    icon: Map,
    title: 'AI Trip Planner',
    desc: 'Tell us your vibe — surprise me, budget-friendly, or bucket list — and get a full day-by-day itinerary in seconds.',
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
  },
  {
    icon: GlobeIcon,
    title: 'Interactive Globe',
    desc: 'Watch your personal world map light up as you log trips. Paint countries, track continents, see your reach.',
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-50',
  },
  {
    icon: Camera,
    title: 'Travel Journal',
    desc: 'Log every trip with photos, dates, and stories. Build a beautiful timeline of your adventures.',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Trophy,
    title: 'Gamified Rewards',
    desc: 'Earn XP, unlock badges, level up from Backpacker to World Legend. Every trip counts.',
    gradient: 'from-purple-500 to-fuchsia-500',
    bg: 'bg-purple-50',
  },
];

const steps = [
  { num: '1', title: 'Sign up free', desc: 'One-tap Apple or Google sign-in. No forms, no friction.' },
  { num: '2', title: 'Log your trips', desc: 'Add past and future travels. Your globe lights up instantly.' },
  { num: '3', title: 'Let AI plan', desc: 'Pick a vibe, get a full itinerary. Save it, share it, go.' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onGoToLogin, loginError, demoEnabled, onEnterDemo, onOpenCookieSettings }) => {
  const handleStartClick = (location: 'nav' | 'hero' | 'pricing') => {
    trackEvent('Landing CTA Clicked', { location });
    onGoToLogin('sign_up');
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
              <GlobeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
              Globo<span className="text-green-500">Trotter</span>
            </span>
          </div>
          <button
            onClick={() => {
              if (demoEnabled && onEnterDemo) return onEnterDemo();
              handleStartClick('nav');
            }}
            className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-sm transition-colors shadow-md whitespace-nowrap"
          >
            {demoEnabled ? 'Enter Demo' : 'Get started'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 text-center relative">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-green-100 rounded-full blur-3xl opacity-60 -z-10" />
        <div className="absolute top-40 right-10 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-60 -z-10" />

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-6 sm:mb-8">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">
              {demoEnabled ? 'Glenmont Circle commissioned work · Portfolio edition' : 'AI-powered travel planning'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
            Map your memories.{' '}
            <span className="text-green-500">Plan your next adventure.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 font-medium max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Log every trip, watch your world map light up, and let AI plan your next adventure based on where you've been.
          </p>

          {demoEnabled && (
            <p className="text-sm text-gray-500 font-semibold max-w-xl mx-auto -mt-5 mb-8">
              End-to-end product design and engineering delivered for Glenmont Circle, from brief and brand through the public web and iOS experiences.
            </p>
          )}

          <div className="flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => {
                handleStartClick('hero');
              }}
              className="w-full max-w-sm bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-black py-4 px-8 rounded-2xl shadow-[0_6px_0_0_#16a34a] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-widest text-base flex items-center justify-center gap-3 group"
            >
              Get started
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                if (onEnterDemo) return onEnterDemo();
                handleStartClick('hero');
              }}
              className="w-full max-w-sm bg-white border-2 border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 font-black py-3 px-8 rounded-2xl shadow-sm active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Demo Walkthrough
            </button>
            <span className="block text-sm text-gray-400 font-bold mt-2">No credit card required</span>
            <span className="block text-xs text-gray-400 mt-1">
              By signing up, you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-600 transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="underline hover:text-gray-600 transition-colors">Privacy Policy</a>
            </span>
          </div>

          {loginError && (
            <div className="mt-6 mx-auto max-w-md bg-red-50 border-2 border-red-100 text-red-600 text-xs font-bold p-3 rounded-xl text-center">
              {loginError}
            </div>
          )}
        </motion.div>

        {/* Hero visual — globe icon cluster */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 sm:mt-16 max-w-2xl mx-auto"
        >
          <div className="relative bg-gradient-to-br from-green-50 via-white to-blue-50 rounded-[2rem] border-2 border-gray-100 shadow-xl p-8 sm:p-12">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <GlobeIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6">
                <Map className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <p className="mt-6 text-gray-400 font-bold text-sm">Globe + Planner + Journal + Rewards — all in one</p>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Everything you need to explore the world
            </h2>
            <p className="text-gray-500 font-medium text-lg max-w-xl mx-auto">
              From logging your first trip to planning your dream adventure — we've got you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`${f.bg} border-2 border-white rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group hover:shadow-lg transition-shadow`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg mb-4`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Up and running in 60 seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white font-black text-xl">
                  {s.num}
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-500 font-medium">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Simple pricing
            </h2>
            <p className="text-gray-500 font-medium text-lg">Start free. Upgrade when you're hooked.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Free tier */}
            <div className="bg-white border-2 border-gray-200 rounded-[2rem] p-6 sm:p-8 flex flex-col">
              <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Free</div>
              <div className="text-4xl font-black text-gray-900 mb-1">$0</div>
              <div className="text-sm text-gray-400 font-medium mb-6">forever</div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Interactive globe', 'Travel journal & photos', 'Gamified XP & badges', 'Free fuel for AI trip planning', 'Referral rewards'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-600 font-medium">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleStartClick('pricing')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition-colors"
              >
                Get started
              </button>
            </div>

            {/* Pro tier */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col">
              <div className="absolute top-4 right-4 bg-white/20 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Popular
              </div>
              <div className="text-sm font-bold text-green-100 uppercase tracking-widest mb-2">Pro</div>
              <div className="text-4xl font-black mb-1">$9.99</div>
              <div className="text-sm text-green-100 font-medium mb-6">one-time</div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Everything in Free', '100 fuel for AI trip planning', 'Unlimited saved plans', 'Early access to new features'].map((item) => (
                  <li key={item} className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-green-200 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGoToLogin}
                className="w-full bg-white hover:bg-green-50 text-green-700 font-bold py-3 rounded-xl transition-colors shadow-lg"
              >
                Get Pro
              </button>
            </div>
          </div>

          {/* Removed: Need more fuel? Top up 50 anytime for $1.99 */}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Your next adventure starts here
            </h2>
            <p className="text-gray-500 font-medium text-lg mb-8">
              Join thousands of travelers mapping their world.
            </p>
            <button
              onClick={onGoToLogin}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-black py-4 px-10 rounded-2xl shadow-[0_6px_0_0_#16a34a] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-widest text-base whitespace-nowrap"
            >
              Start exploring free
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <GlobeIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black text-gray-800">
              Globo<span className="text-green-500">Trotter</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">
            <a href="/privacy" className="shrink-0 hover:text-gray-800 transition-colors">Privacy Policy</a>
            <a href="/terms" className="shrink-0 hover:text-gray-800 transition-colors">Terms of Service</a>
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="shrink-0 inline-flex items-center gap-1.5 hover:text-gray-800 transition-colors"
            >
              <Cookie className="w-4 h-4" />
              Cookie settings
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-300 font-bold max-w-full">
            &copy; {new Date().getFullYear()} GloboTrotter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
