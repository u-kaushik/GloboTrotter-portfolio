import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { resetUser } from './services/analytics';

// Portfolio demo note: placeholder Firebase config keeps the UI modules
// compile-compatible while the public demo runs entirely with local dummy data.
const firebaseConfig = {
  apiKey: 'demo-only',
  authDomain: 'globotrotter-portfolio-demo.firebaseapp.com',
  projectId: 'globotrotter-portfolio-demo',
  storageBucket: 'globotrotter-portfolio-demo.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

googleProvider.setCustomParameters({ prompt: 'select_account' });
appleProvider.addScope('email');
appleProvider.addScope('name');

const prefersRedirectAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const hasCapacitor = typeof (window as Window & { Capacitor?: unknown }).Capacitor !== 'undefined';
  return coarsePointer || standalone || hasCapacitor;
};

const signInWithProvider = (provider: GoogleAuthProvider | OAuthProvider) => {
  if (prefersRedirectAuth()) {
    return signInWithRedirect(auth, provider);
  }
  return signInWithPopup(auth, provider);
};

export const signInWithGoogle = () => signInWithProvider(googleProvider);
export const signInWithApple = () => signInWithProvider(appleProvider);
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const getAuthProviderLabel = (providerId?: string): string => {
  switch (providerId) {
    case 'apple.com':
      return 'Apple';
    case 'google.com':
      return 'Google';
    default:
      return 'Email';
  }
};

export const logout = () => {
  resetUser();
  return signOut(auth);
};
