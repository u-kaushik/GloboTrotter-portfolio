import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe as GlobeIcon, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { trackEvent } from '../services/analytics';

interface LoginPageProps {
  onLogin: (provider?: 'google' | 'apple') => void;
  onEmailAuth: (email: string, password: string, mode: 'sign_in' | 'sign_up') => Promise<void>;
  onBack: () => void;
  loginError?: string | null;
  startInSignUp?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onEmailAuth, onBack, loginError, startInSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(!!startInSignUp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (startInSignUp) setIsSignUp(true);
  }, [startInSignUp]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('Email Login Attempted', { mode: isSignUp ? 'sign_up' : 'sign_in' });
    if (!email || !password) {
      setError('Please fill in all fields');
      trackEvent('Email Login Validation Failed', {
        mode: isSignUp ? 'sign_up' : 'sign_in',
        reason: 'missing_fields',
      });
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onEmailAuth(email.trim(), password, isSignUp ? 'sign_up' : 'sign_in');
    } catch (err: any) {
      const code = err?.code as string | undefined;
      let message = 'Failed to sign in. Please try again.';

      if (code === 'auth/email-already-in-use') {
        message = 'That email already has an account. Try signing in instead.';
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        message = 'That email/password combination did not work.';
      } else if (code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please wait a moment and try again.';
      } else if (err?.message) {
        message = err.message;
      }

      setError(message);
      trackEvent('Email Login Failed', {
        mode: isSignUp ? 'sign_up' : 'sign_in',
        errorCode: code || 'unknown',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
              <GlobeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              Globo<span className="text-green-500">Trotter</span>
            </span>
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                {isSignUp ? 'Ready to give it a try?' : 'Welcome back'}
              </h1>
              <p className="text-gray-400 font-medium text-sm">
                {isSignUp ? 'Let’s get your travel world set up.' : 'Sign in to continue your journey'}
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Email address"
                  className="w-full pl-12 pr-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-gray-500 font-medium outline-none focus:border-green-500/50 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-gray-500 font-medium outline-none focus:border-green-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-xs font-bold text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-600/50 text-white font-black py-3 rounded-xl uppercase tracking-widest text-sm transition-colors shadow-lg shadow-green-500/20 whitespace-nowrap"
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create my account' : 'Sign in with email'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onLogin('apple')}
                className="w-full bg-black hover:bg-neutral-900 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md flex items-center justify-center gap-3 whitespace-nowrap"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M16.365 1.43c0 1.14-.414 2.224-1.154 3.004-.817.86-2.15 1.524-3.307 1.431-.146-1.103.402-2.286 1.13-3.043.8-.84 2.17-1.468 3.331-1.392zM20.46 17.126c-.58 1.288-.857 1.861-1.603 3.01-1.04 1.603-2.507 3.6-4.328 3.615-1.617.015-2.034-1.031-4.23-1.018-2.196.013-2.654 1.037-4.273 1.022-1.82-.015-3.21-1.819-4.25-3.42-2.908-4.476-3.215-9.729-1.418-12.492 1.277-1.962 3.293-3.11 5.188-3.11 1.93 0 3.146 1.06 4.74 1.06 1.545 0 2.486-1.062 4.724-1.062 1.688 0 3.475.918 4.748 2.5-4.18 2.292-3.502 8.264.702 9.895z"/>
                </svg>
                Continue with Apple
              </button>
              <button
                onClick={() => onLogin('google')}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors shadow-md flex items-center justify-center gap-3 group whitespace-nowrap"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Toggle Sign In/Sign Up */}
            <p className="text-center text-gray-400 text-sm mt-6">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  trackEvent('Auth Mode Toggled', { mode: isSignUp ? 'sign_in' : 'sign_up' });
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-green-500 hover:text-green-400 font-bold transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            {loginError && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl text-center">
                {loginError}
              </div>
            )}
          </div>

          {/* Terms */}
          <p className="text-center text-gray-500 text-xs mt-6">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-400 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-gray-400 transition-colors">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
