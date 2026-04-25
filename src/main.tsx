import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
