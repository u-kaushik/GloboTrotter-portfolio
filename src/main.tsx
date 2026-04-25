import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Portfolio demo note: this public repo intentionally boots into a static,
// recruiter-friendly walkthrough with local dummy data. The production app
// uses real auth, persistence, AI, and payment services outside this sample.
localStorage.setItem('gt_demo_mode', 'true');
localStorage.setItem('gt_tour_completed', 'true');
if (!localStorage.getItem('gt_demo_onboarding_done')) {
  localStorage.setItem('gt_demo_onboarding_active', 'true');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
