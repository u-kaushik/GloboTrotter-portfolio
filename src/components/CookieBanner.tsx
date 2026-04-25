import React from 'react';
import { motion } from 'motion/react';
import { Cookie } from 'lucide-react';

interface CookieBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onDecline }) => (
  <motion.div
    initial={{ y: 120, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 120, opacity: 0 }}
    transition={{ type: 'spring', damping: 24, stiffness: 200 }}
    className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-[300] bg-white rounded-2xl shadow-2xl border border-gray-100 px-5 py-4"
  >
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <Cookie className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 mb-1">Cookies on board</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          We use essential cookies to keep you signed in, plus Google Analytics to understand how people use GloboTrotter — no ads, no selling your data.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onDecline}
            className="flex-1 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors whitespace-nowrap"
          >
            Essential Only
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-3 py-2 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors whitespace-nowrap"
          >
            Works for Me
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

export default CookieBanner;
