import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles, MapPin, Globe, LayoutDashboard, Trophy, Camera, Calendar, Star } from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  centered?: boolean;
}

interface GuidedTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'dashboard',
    title: 'Welcome to Your Dashboard',
    content: 'Your home base — trips, stats, badges, and the good stuff at a glance.',
    position: 'right',
    centered: true,
  },
  {
    target: 'globe-tab',
    title: 'Your World Awaits',
    content: 'The globe is your map of memories. Tap around and watch countries light up.',
    position: 'right',
    centered: true,
  },
  {
    target: 'planner-tab',
    title: 'Plan Your Next Adventure',
    content: 'Tell the planner the vibe and it sketches the trip like magic.',
    position: 'right',
    centered: true,
  },
  {
    target: 'rewards-tab',
    title: 'Level Up & Earn Rewards',
    content: 'Every trip gives you XP, badges, and a bit of bragging rights.',
    position: 'right',
    centered: true,
  },
  {
    target: 'add-trip',
    title: 'Log a Trip',
    content: 'Drop a new memory here — the + button starts the fun.',
    position: 'left',
    centered: true,
  },
  {
    target: 'settings-tab',
    title: 'Customize Your Profile',
    content: 'A few details help the app feel like it knows you.',
    position: 'left',
    centered: true,
  },
];

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onComplete, onSkip, currentStep, onNext, onPrev }) => {
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number; radius: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const step = TOUR_STEPS[currentStep] ?? TOUR_STEPS[0]!;
  const spotlightPad = 12;

  useEffect(() => {
    if (!isOpen) return;

    let rafId: number | null = null;

    const updatePosition = () => {
      const step = TOUR_STEPS[currentStep];
      const targetElement = document.querySelector(`[data-tour="${step?.target}"]`);

      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const computed = window.getComputedStyle(targetElement as Element);
        const radius = Number.parseFloat(computed.borderTopLeftRadius || '0') || 0;
        setHighlightPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          radius,
        });
        
        if (rect.top < 100 || rect.bottom > window.innerHeight - 200) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(updatePosition);
        }
      } else {
        setHighlightPosition(null);
      }
    };

    const timeout1 = window.setTimeout(updatePosition, 0);
    const timeout2 = window.setTimeout(updatePosition, 200);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, isOpen]);

  const overlayMaskStyle = useMemo(() => {
    if (!highlightPosition || step.centered) return undefined;
    const holeX = Math.max(0, highlightPosition.left - spotlightPad);
    const holeY = Math.max(0, highlightPosition.top - spotlightPad);
    const holeW = Math.max(0, highlightPosition.width + spotlightPad * 2);
    const holeH = Math.max(0, highlightPosition.height + spotlightPad * 2);
    const vpW = Math.max(1, document.documentElement.clientWidth);
    const vpH = Math.max(1, document.documentElement.clientHeight);
    const holeRadius = highlightPosition.height + spotlightPad * 2 < 90 && highlightPosition.width + spotlightPad * 2 < 180
      ? Math.min(holeW, holeH) / 2
      : Math.min(highlightPosition.radius + spotlightPad, Math.min(holeW, holeH) / 2);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vpW} ${vpH}"><rect width="${vpW}" height="${vpH}" fill="white"/><rect x="${holeX}" y="${holeY}" width="${holeW}" height="${holeH}" rx="${holeRadius}" ry="${holeRadius}" fill="black"/></svg>`;
    const encoded = encodeURIComponent(svg).replace(/%0A/g, '');
    const url = `url("data:image/svg+xml,${encoded}")`;

    return {
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: '100% 100%',
      maskSize: '100% 100%',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    } as React.CSSProperties;
  }, [highlightPosition, step.centered, spotlightPad]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const margin = 16;
    const gap = 12;

    const ttRect = tooltipEl.getBoundingClientRect();
    const ttW = ttRect.width || 360;
    const ttH = ttRect.height || 220;

    const target = step.centered ? null : highlightPosition;
    if (!target) {
      setTooltipPos({ top: vpH - ttH - margin, left: vpW - ttW - margin });
      return;
    }

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    let top = target.top + target.height / 2 - ttH / 2;
    let left = target.left + target.width + gap;

    switch (step.position) {
      case 'left':
        left = target.left - ttW - gap;
        break;
      case 'right':
        left = target.left + target.width + gap;
        break;
      case 'top':
        top = target.top - ttH - gap;
        left = target.left + target.width / 2 - ttW / 2;
        break;
      case 'bottom':
        top = target.top + target.height + gap;
        left = target.left + target.width / 2 - ttW / 2;
        break;
    }

    top = clamp(top, margin, vpH - ttH - margin);
    left = clamp(left, margin, vpW - ttW - margin);
    setTooltipPos({ top, left });
  }, [highlightPosition, isOpen, currentStep, step.position]);

  useEffect(() => {
    if (!isOpen) return;

    const lockEvent = (event: MouseEvent | PointerEvent | TouchEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;

      const tooltipEl = tooltipRef.current;
      const targetEl = document.querySelector(`[data-tour="${step.target}"]`);

      const insideTooltip = Boolean(tooltipEl?.contains(targetNode));
      const insideTarget = Boolean(targetEl && targetEl.contains(targetNode));

      if (insideTooltip || insideTarget) return;

      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) {
        event.stopImmediatePropagation();
      }
    };

    document.addEventListener('pointerdown', lockEvent, true);
    document.addEventListener('click', lockEvent, true);
    return () => {
      document.removeEventListener('pointerdown', lockEvent, true);
      document.removeEventListener('click', lockEvent, true);
    };
  }, [isOpen, step.target]);

  if (!isOpen) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Visual overlay (masked spotlight). Pointer-events disabled so the highlighted UI remains clickable. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/20 pointer-events-none"
            style={overlayMaskStyle}
          />

          {highlightPosition && !step.centered && (
            <div
              className="fixed z-[510] pointer-events-none"
              style={{
                top: highlightPosition.top - spotlightPad,
                left: highlightPosition.left - spotlightPad,
                width: highlightPosition.width + spotlightPad * 2,
                height: highlightPosition.height + spotlightPad * 2,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.98, 1.04, 0.98] }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 border-4 border-teal-400 shadow-2xl shadow-teal-400/40"
                style={{
                  borderRadius:
                    highlightPosition.height + spotlightPad * 2 < 90 && highlightPosition.width + spotlightPad * 2 < 180
                      ? Math.min(highlightPosition.width + spotlightPad * 2, highlightPosition.height + spotlightPad * 2) / 2
                      : Math.min(highlightPosition.radius + spotlightPad, Math.min(highlightPosition.width + spotlightPad * 2, highlightPosition.height + spotlightPad * 2) / 2),
                }}
              />
              <div
                className="absolute inset-0 border-4 border-teal-400"
                style={{
                  borderRadius:
                    highlightPosition.height + spotlightPad * 2 < 90 && highlightPosition.width + spotlightPad * 2 < 180
                      ? Math.min(highlightPosition.width + spotlightPad * 2, highlightPosition.height + spotlightPad * 2) / 2
                      : Math.min(highlightPosition.radius + spotlightPad, Math.min(highlightPosition.width + spotlightPad * 2, highlightPosition.height + spotlightPad * 2) / 2),
                }}
              />
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed z-[520] bg-white rounded-3xl shadow-2xl p-4 sm:p-6 w-[min(22rem,calc(100vw-1rem))] sm:w-[min(24rem,calc(100vw-2rem))] overflow-hidden ${step.centered ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center' : ''}`}
            style={!step.centered && tooltipPos ? { top: tooltipPos.top, left: tooltipPos.left } : undefined}
            ref={tooltipRef}
          >
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-black text-teal-600 uppercase tracking-widest">Tour</span>
              </div>
              <button
                onClick={onSkip}
                className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <h3 className={`font-black text-gray-800 text-lg mb-2 ${step.centered ? 'text-center' : ''}`}>{step.title}</h3>
            <p className={`text-sm text-gray-500 font-medium leading-relaxed mb-6 ${step.centered ? 'text-center' : ''}`}>{step.content}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep ? 'bg-teal-500 w-4' : i < currentStep ? 'bg-teal-200' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={onPrev}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={isLastStep ? onComplete : onNext}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  {isLastStep ? 'Finish Tour' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GuidedTour;
