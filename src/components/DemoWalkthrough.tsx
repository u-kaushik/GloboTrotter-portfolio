import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type StepTone = 'info' | 'action';

export interface DemoWalkthroughStep {
  id: string;
  title: string;
  body: string;
  targetDataTour?: string;
  tone?: StepTone;
  centered?: boolean;
  dockCorner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

interface DemoWalkthroughProps {
  isOpen: boolean;
  step: DemoWalkthroughStep | null;
  onSkip: () => void;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  onTargetClick: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
type TooltipPosition = { top?: number; left?: number; right?: number; bottom?: number };

const getSpotlightElement = (targetEl: Element, stepId?: string): HTMLElement => {
  if (stepId === 'countryAck' || stepId === 'cityAck' || stepId === 'dateAck') {
    return (targetEl.parentElement as HTMLElement | null) ?? (targetEl as HTMLElement);
  }

  if (stepId === 'notesAck') {
    return targetEl as HTMLElement;
  }

  if (stepId === 'rewardsBadgeOpen') {
    return (targetEl.closest('[data-tour="rewards-badge-modal"]') as HTMLElement | null) ?? (targetEl as HTMLElement);
  }

  return targetEl as HTMLElement;
};

const getSpotlightRadius = (element: HTMLElement, stepId?: string): number => {
  if (stepId === 'addTrip' || stepId === 'globePortugal') {
    return Math.min(element.getBoundingClientRect().width, element.getBoundingClientRect().height) / 2;
  }

  const computed = window.getComputedStyle(element);
  const radius = Number.parseFloat(computed.borderTopLeftRadius || '0') || 0;
  if (radius > 0) return radius;

  if (stepId === 'countryAck' || stepId === 'cityAck' || stepId === 'dateAck' || stepId === 'notesAck') {
    return 20;
  }

  if (stepId === 'portugalMemory' || stepId === 'memoryEnjoy') {
    return 32;
  }

  if (stepId === 'rewardsBadgeOpen') {
    return 40;
  }

  return 18;
};

const isMemoryStep = (stepId?: string): boolean => Boolean(stepId?.startsWith('memory'));

const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({ isOpen, step, onSkip, onSignIn, onSignUp, onBack, canGoBack, onTargetClick }) => {
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number; radius: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const lockedScrollYRef = useRef(0);
  const pad = 12;
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const isCentered = Boolean(step && (!step.targetDataTour || step.centered));
  const allowCenteredHighlight = step?.id === 'addTrip';
  const requiresNativeTargetClick = step?.id === 'globePortugal';
  const forceCircleHighlight = step?.id === 'globePortugal';
  const isGlobePrompt = step?.id === 'globePortugal';
  const isBadgeClosePrompt = step?.id === 'rewardsBadgeOpen';
  const activeSpot = step?.targetDataTour && (!isCentered || allowCenteredHighlight) ? spot : null;
  const advanceViaTarget = () => {
    if (step?.id === 'globePortugal') {
      onTargetClick();
      return;
    }
    if (!step?.targetDataTour) {
      onTargetClick();
      return;
    }
    const targetEl = document.querySelector(`[data-tour="${step.targetDataTour}"]`) as HTMLElement | null;
    if (targetEl) {
      targetEl.click();
      return;
    }
    onTargetClick();
  };

  useEffect(() => {
    setSpot(null);
  }, [step?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    lockedScrollYRef.current = scrollY;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      window.scrollTo(0, lockedScrollYRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !step?.targetDataTour || (isCentered && !allowCenteredHighlight)) { setSpot(null); return; }

    let raf: number | null = null;
    let didScrollTarget = false;
    const update = () => {
      const el = document.querySelector(`[data-tour="${step.targetDataTour}"]`);
      if (!el) { setSpot(null); return; }
      const spotEl = getSpotlightElement(el, step.id);
      let rect = spotEl.getBoundingClientRect();
      const topLimit = 24;
      const bottomLimit = window.innerHeight - 24;
      if (!didScrollTarget && (rect.top < topLimit || rect.bottom > bottomLimit)) {
        didScrollTarget = true;
        const body = document.body;
        const wasFixed = body.style.position === 'fixed';
        if (wasFixed) {
          body.style.position = '';
          body.style.top = '';
          body.style.width = '';
          window.scrollTo(0, lockedScrollYRef.current);
        }
        spotEl.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        lockedScrollYRef.current = window.scrollY;
        if (wasFixed) {
          body.style.position = 'fixed';
          body.style.top = `-${lockedScrollYRef.current}px`;
          body.style.width = '100%';
        }
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
        return;
      }

      rect = spotEl.getBoundingClientRect();
      const radius = getSpotlightRadius(spotEl, step.id);
      if (step.id === 'globePortugal') {
        const diameter = Math.min(rect.width, rect.height) * 0.8;
        setSpot({
          top: rect.top + (rect.height - diameter) / 2,
          left: rect.left + (rect.width - diameter) / 2,
          width: diameter,
          height: diameter,
          radius: diameter / 2,
        });
        return;
      }
      setSpot({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, radius });
    };

    const onScrollOrResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    const t = window.setInterval(update, 400);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearInterval(t);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen, step?.targetDataTour, step?.id, isCentered, allowCenteredHighlight]);

  useEffect(() => {
    if (!isOpen) return;
    if (!step?.targetDataTour) return;
    if (requiresNativeTargetClick) return;

    const handler = (e: MouseEvent) => {
      const el = document.querySelector(`[data-tour="${step.targetDataTour}"]`);
      if (!el) return;
      if (el.contains(e.target as Node)) {
        onTargetClick();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isOpen, step?.targetDataTour, onTargetClick, requiresNativeTargetClick]);

  useEffect(() => {
    if (!isOpen) return;

    const lockEvent = (event: MouseEvent | PointerEvent | TouchEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;

      const tooltipEl = tooltipRef.current;
      const targetEl = step?.targetDataTour
        ? document.querySelector(`[data-tour="${step.targetDataTour}"]`)
        : null;

      const insideTooltip = Boolean(tooltipEl?.contains(targetNode));
      const insideTarget = Boolean(targetEl && targetEl.contains(targetNode));
      const insideSpotlight = Boolean(
        targetNode instanceof Element && targetNode.closest('[data-demo-spotlight-frame]')
      );

      if (insideTooltip || insideTarget || insideSpotlight) return;

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
  }, [isOpen, step?.targetDataTour]);

  useEffect(() => {
    if (!isOpen || !step?.targetDataTour) return;
    const targetEl = document.querySelector(`[data-tour="${step.targetDataTour}"]`) as HTMLElement | null;
    if (!targetEl) return;
    const spotlightEl = getSpotlightElement(targetEl, step.id);
    spotlightEl.classList.add('demo-spotlight-active');
    if (targetEl !== spotlightEl) {
      targetEl.classList.add('demo-spotlight-active');
    }

    return () => {
      if (targetEl) {
        targetEl.classList.remove('demo-spotlight-active');
      }
      if (spotlightEl !== targetEl) {
        spotlightEl.classList.remove('demo-spotlight-active');
      }
    };
  }, [isOpen, step?.targetDataTour, step?.id]);

  useEffect(() => {
    if (!isOpen || !step) return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const margin = 16;
    const gap = 12;

    const ttRect = tooltipEl.getBoundingClientRect();
    const ttW = ttRect.width || 360;
    const ttH = ttRect.height || 220;

    if (isCentered) {
      setTooltipPos({
        top: vpH / 2,
        left: vpW / 2,
      });
      return;
    }

    if (!isMobile) {
      setTooltipPos({
        right: 24,
        bottom: 24,
      });
      return;
    }

    if (step?.dockCorner && !isMobile) {
      const dockMarginX = isMobile ? 10 : 16;
      const dockMarginY = isMobile && step.dockCorner.includes('bottom') ? 88 : 16;
      const position: TooltipPosition = {};

      if (step.dockCorner.includes('top')) {
        position.top = dockMarginY;
      } else {
        position.bottom = dockMarginY;
      }

      if (step.dockCorner.includes('left')) {
        position.left = dockMarginX;
      } else {
        position.right = dockMarginX;
      }

      setTooltipPos(position);
      return;
    }

    if (!spot) {
      setTooltipPos({
        top: Math.max(margin, vpH / 2 - ttH / 2),
        left: clamp(vpW / 2 - ttW / 2, margin, vpW - ttW - margin),
      });
      return;
    }

    if (isMobile) {
      if (isMemoryStep(step.id)) {
        if (step.id === 'memoryPlanner' && spot) {
          setTooltipPos({
            right: 10,
            bottom: 80,
          });
          return;
        }

        setTooltipPos({
          right: 10,
          bottom: 16,
        });
        return;
      }

      if (step.id === 'globePortugal') {
        setTooltipPos({
          left: clamp(vpW / 2 - ttW / 2, margin, vpW - ttW - margin),
          bottom: 20,
        });
        return;
      }

      if (step.id === 'rewardsBadgeOpen') {
        setTooltipPos({
          right: 10,
          bottom: 16,
        });
        return;
      }

      const target = {
        left: spot.left - pad,
        top: spot.top - pad,
        right: spot.left + spot.width + pad,
        bottom: spot.top + spot.height + pad,
      };
      const mobileGap = step.id === 'saveTrip' ? 4 : gap;
      const availableAbove = target.top - margin - mobileGap;
      const availableBelow = vpH - target.bottom - margin - mobileGap;
      const aboveTop = Math.max(margin, target.top - ttH - mobileGap);
      const belowTop = Math.min(vpH - ttH - margin, target.bottom + mobileGap);
      const overlapHeight = (top: number) =>
        Math.max(0, Math.min(top + ttH, target.bottom) - Math.max(top, target.top));
      const hasUsableAbove = availableAbove >= Math.min(ttH, 180);
      const hasUsableBelow = availableBelow >= Math.min(ttH, 180);
      const mobileTop = hasUsableAbove || hasUsableBelow
        ? (hasUsableAbove && (!hasUsableBelow || availableAbove > availableBelow) ? aboveTop : belowTop)
        : (overlapHeight(aboveTop) <= overlapHeight(belowTop) ? aboveTop : belowTop);
      setTooltipPos({
        top: mobileTop,
        left: clamp(vpW / 2 - ttW / 2, margin, vpW - ttW - margin),
      });
      return;
    }

    const target = {
      left: spot.left - pad,
      top: spot.top - pad,
      right: spot.left + spot.width + pad,
      bottom: spot.top + spot.height + pad,
    };

    const candidates = [
      // right
      {
        left: spot.left + spot.width + gap,
        top: spot.top + spot.height / 2 - ttH / 2,
      },
      // left
      {
        left: spot.left - ttW - gap,
        top: spot.top + spot.height / 2 - ttH / 2,
      },
      // bottom
      {
        left: spot.left + spot.width / 2 - ttW / 2,
        top: spot.top + spot.height + gap,
      },
      // top
      {
        left: spot.left + spot.width / 2 - ttW / 2,
        top: spot.top - ttH - gap,
      },
    ].map((p) => ({
      left: clamp(p.left, margin, vpW - ttW - margin),
      top: clamp(p.top, margin, vpH - ttH - margin),
    }));

    const overlapArea = (a: { left: number; top: number; width: number; height: number }) => {
      const ax2 = a.left + a.width;
      const ay2 = a.top + a.height;
      const bx1 = target.left;
      const by1 = target.top;
      const bx2 = target.right;
      const by2 = target.bottom;
      const xOverlap = Math.max(0, Math.min(ax2, bx2) - Math.max(a.left, bx1));
      const yOverlap = Math.max(0, Math.min(ay2, by2) - Math.max(a.top, by1));
      return xOverlap * yOverlap;
    };

    const ranked = candidates
      .map((p) => ({
        ...p,
        overlap: overlapArea({ left: p.left, top: p.top, width: ttW, height: ttH }),
      }))
      .sort((a, b) => a.overlap - b.overlap);

    setTooltipPos({ top: ranked[0]!.top, left: ranked[0]!.left });
  }, [isOpen, step, spot, isMobile]);

  if (!isOpen || !step) return null;

  return (
    <>
      {!activeSpot && (
        <div className="fixed inset-0 z-[600] bg-slate-950/55 pointer-events-none" />
      )}

      {activeSpot && (
        <React.Fragment key={`highlight-${step.id}`}>
        <div
          data-demo-spotlight-frame
          className="fixed z-[610] cursor-pointer"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            advanceViaTarget();
          }}
          style={{
            top: activeSpot.top - pad,
            left: activeSpot.left - pad,
            width: activeSpot.width + pad * 2,
            height: activeSpot.height + pad * 2,
            borderRadius:
              forceCircleHighlight
                ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                : activeSpot.height + pad * 2 < 90 && activeSpot.width + pad * 2 < 180
                  ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                  : Math.min(activeSpot.radius + pad, Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2),
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.98, 1.04, 0.98] }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 border-4 border-emerald-400 shadow-2xl shadow-emerald-500/45"
            style={{
              borderRadius:
                forceCircleHighlight
                  ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                  : activeSpot.height + pad * 2 < 90 && activeSpot.width + pad * 2 < 180
                    ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                    : Math.min(activeSpot.radius + pad, Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2),
            }}
          />
          <div
            className="absolute inset-0 border-4 border-emerald-400"
            style={{
              borderRadius:
                forceCircleHighlight
                  ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                  : activeSpot.height + pad * 2 < 90 && activeSpot.width + pad * 2 < 180
                    ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                    : Math.min(activeSpot.radius + pad, Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2),
            }}
          />
        </div>
        </React.Fragment>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${step.id}-tooltip`}
          initial={isCentered ? { opacity: 0, scale: 0.96 } : { opacity: 0, y: 16 }}
          animate={isCentered ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
          exit={isCentered ? { opacity: 0, scale: 0.96 } : { opacity: 0, y: 16 }}
          className={`fixed z-[620] ${isCentered ? 'bg-slate-900/92 backdrop-blur-xl text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_28px_90px_rgba(15,23,42,0.58)] p-4 sm:p-6' : 'bg-slate-900 shadow-2xl shadow-slate-950/45 p-3.5 sm:p-5'} text-white rounded-3xl border-2 border-green-400 ${isGlobePrompt ? 'w-[min(17rem,calc(100vw-2rem))] sm:w-[min(20rem,calc(100vw-2rem))]' : isBadgeClosePrompt ? 'w-[min(18rem,calc(100vw-1rem))] sm:w-[min(20rem,calc(100vw-2rem))]' : 'w-[min(18rem,calc(100vw-1rem))] sm:w-[min(24rem,calc(100vw-2rem))]'} overflow-hidden`}
          style={!isCentered && tooltipPos ? tooltipPos : undefined}
          ref={tooltipRef}
          onClick={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-demo-control]')) return;
            advanceViaTarget();
          }}
        >
          <div className={`flex items-center justify-between gap-3 ${isCentered ? 'mb-4' : 'mb-3'}`}>
            <div className="flex items-center gap-1">
              <button
                data-demo-control
                type="button"
                onClick={onBack}
                disabled={!canGoBack}
                className="p-1.5 rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Previous demo step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                data-demo-control
                type="button"
                onClick={advanceViaTarget}
                className="p-1.5 rounded-lg text-slate-200 hover:bg-white/10"
                aria-label="Next demo step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button data-demo-control onClick={onSkip} className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="End demo walkthrough">
              <X className="w-4 h-4 text-slate-200" />
            </button>
          </div>

          <h3 className={`font-black text-white mb-2 ${isCentered ? 'text-lg text-center' : 'text-base'}`}>{step.title}</h3>
          <p className={`${isCentered ? 'text-sm' : 'text-[13px]'} text-slate-100 font-semibold leading-relaxed ${isCentered ? 'text-center' : ''}`}>
            {step.body}
            {activeSpot && (
              <span className={`block mt-2 font-black text-green-300 uppercase tracking-widest ${isCentered ? 'text-xs' : 'text-[11px]'}`}>
                Tap the highlighted thing
              </span>
            )}
          </p>

          {step.targetDataTour && !spot && (
            <button
              data-demo-control
              onClick={onTargetClick}
              className={`${isCentered ? 'mt-5 py-3 text-sm' : 'mt-4 py-2.5 text-xs'} gt-green-button w-full flex items-center justify-center gap-2 px-4 font-black rounded-xl active:scale-[0.98]`}
            >
              Continue
            </button>
          )}

          {!step.targetDataTour && (
            <button
              data-demo-control
              onClick={onTargetClick}
              className={`${isCentered ? 'mt-5 py-3 text-sm' : 'mt-4 py-2.5 text-xs'} gt-green-button w-full flex items-center justify-center gap-2 px-4 font-black rounded-xl active:scale-[0.98]`}
            >
              Ready to Begin
            </button>
          )}

          {(onSignUp || onSignIn) && (
            <div className={`${isCentered ? 'mt-4 pt-3' : 'mt-3 pt-2.5'} border-t border-slate-700`}>
              {onSignUp && (
                <button
                  data-demo-control
                  onClick={onSignUp}
                  className={`w-full px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-wide ${isCentered ? 'py-3 text-xs' : 'py-2.5 text-[11px]'}`}
                >
                  Skip to sign up
                </button>
              )}
              {onSignIn && (
                <button
                  data-demo-control
                  onClick={onSignIn}
                  className={`mt-1 w-full px-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-black ${isCentered ? 'py-2 text-xs' : 'py-1.5 text-[11px]'}`}
                >
                  I already have an account
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default DemoWalkthrough;
