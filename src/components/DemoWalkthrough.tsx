import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';

type StepTone = 'info' | 'action';
type InlineStyleSnapshot = Pick<CSSStyleDeclaration, 'position' | 'zIndex' | 'isolation'> & {
  demoTourSurfaceFocus?: string;
};

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
  onTargetClick: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
type TooltipPosition = { top?: number; left?: number; right?: number; bottom?: number };
const NO_LOCAL_VEIL_STEPS = ['memoryStoryOpen', 'portugalMemory', 'plannerCards', 'plannerDay1', 'plannerDay2', 'plannerDay3', 'rewardsBadgeOpen'];

const createsStackingContext = (style: CSSStyleDeclaration) => (
  style.transform !== 'none' ||
  style.filter !== 'none' ||
  style.backdropFilter !== 'none' ||
  style.perspective !== 'none' ||
  style.contain.includes('paint') ||
  style.contain.includes('layout') ||
  style.isolation === 'isolate' ||
  Number.parseFloat(style.opacity || '1') < 1 ||
  style.willChange.includes('transform') ||
  style.willChange.includes('opacity') ||
  style.willChange.includes('filter')
);

const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({ isOpen, step, onSkip, onTargetClick }) => {
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number; radius: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));
  const pad = 12;
  const isMobile = viewport.width < 768;
  const isCentered = Boolean(step && (!step.targetDataTour || step.centered));
  const allowCenteredHighlight = step?.id === 'addTrip';
  const requiresNativeTargetClick = step?.id === 'globePortugal';
  const forceCircleHighlight = step?.id === 'globePortugal';
  const activeSpot = step?.targetDataTour && (!isCentered || allowCenteredHighlight) ? spot : null;

  const triggerTargetOrAdvance = () => {
    if (!step?.targetDataTour || requiresNativeTargetClick) {
      onTargetClick();
      return;
    }

    const targetEl = document.querySelector(`[data-tour="${step.targetDataTour}"]`) as HTMLElement | null;
    if (!targetEl) {
      onTargetClick();
      return;
    }

    targetEl.click();
  };

  useEffect(() => {
    setSpot(null);
  }, [step?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !step?.targetDataTour || (isCentered && !allowCenteredHighlight)) { setSpot(null); return; }

    let raf: number | null = null;
    let didInitialScroll = false;
    const update = () => {
      const el = document.querySelector(`[data-tour="${step.targetDataTour}"]`) as HTMLElement | null;
      if (!el) { setSpot(null); return; }

      if (!didInitialScroll && step.id !== 'globePortugal') {
        didInitialScroll = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        raf = requestAnimationFrame(update);
        return;
      }

      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const radius = Number.parseFloat(computed.borderTopLeftRadius || '0') || 0;
      if (step.id === 'globePortugal') {
        const diameter = Math.min(rect.width, rect.height) * 0.96;
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
  }, [isOpen, step?.targetDataTour, isCentered, allowCenteredHighlight]);

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
  }, [isOpen, step?.targetDataTour]);

  useEffect(() => {
    if (!isOpen || !step?.targetDataTour) return;
    const targetEl = document.querySelector(`[data-tour="${step.targetDataTour}"]`) as HTMLElement | null;
    if (!targetEl) return;

    const snapshots = new Map<HTMLElement, InlineStyleSnapshot>();
    const remember = (el: HTMLElement) => {
      if (snapshots.has(el)) return;
      snapshots.set(el, {
        position: el.style.position,
        zIndex: el.style.zIndex,
        isolation: el.style.isolation,
        demoTourSurfaceFocus: el.dataset.demoTourSurfaceFocus,
      });
    };

    remember(targetEl);
    targetEl.dataset.demoTourFocus = step.id;
    targetEl.style.zIndex = '616';
    targetEl.style.isolation = 'isolate';
    if (window.getComputedStyle(targetEl).position === 'static') {
      targetEl.style.position = 'relative';
    }

    // Portfolio demo polish: the focused walkthrough element should feel like
    // part of the guide layer, so lift every modal/card wrapper that could
    // otherwise trap it behind the dimmed page overlay.
    let surfaceEl: HTMLElement | null = targetEl.parentElement;
    let localVeilApplied = false;
    while (surfaceEl) {
      const style = window.getComputedStyle(surfaceEl);
      const isTourSurface = surfaceEl.hasAttribute('data-tour-surface');
      const shouldLift =
        isTourSurface ||
        style.position === 'fixed' ||
        createsStackingContext(style);

      if (shouldLift) {
        remember(surfaceEl);
        if (style.position === 'static') {
          surfaceEl.style.position = 'relative';
        }
        surfaceEl.style.zIndex = '605';
        surfaceEl.style.isolation = 'isolate';
        if (!NO_LOCAL_VEIL_STEPS.includes(step.id) && !localVeilApplied && (isTourSurface || style.position === 'fixed')) {
          surfaceEl.dataset.demoTourSurfaceFocus = 'true';
          localVeilApplied = true;
        }
      }

      if (surfaceEl === document.body) break;
      surfaceEl = surfaceEl.parentElement;
    }

    return () => {
      targetEl.removeAttribute('data-demo-tour-focus');
      snapshots.forEach((snapshot, el) => {
        el.style.position = snapshot.position;
        el.style.zIndex = snapshot.zIndex;
        el.style.isolation = snapshot.isolation;
        if (snapshot.demoTourSurfaceFocus === undefined) {
          el.removeAttribute('data-demo-tour-surface-focus');
        } else {
          el.dataset.demoTourSurfaceFocus = snapshot.demoTourSurfaceFocus;
        }
      });
    };
  }, [isOpen, step?.targetDataTour]);

  useEffect(() => {
    if (!isOpen || !step) return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const vpW = viewport.width;
    const vpH = viewport.height;
    const margin = isMobile ? 12 : 16;
    const gap = isMobile ? 10 : 12;

    const ttRect = tooltipEl.getBoundingClientRect();
    const ttW = ttRect.width || 360;
    const ttH = Math.min(ttRect.height || 220, vpH - margin * 2);

    if (isCentered) {
      setTooltipPos({
        top: vpH / 2,
        left: vpW / 2,
      });
      return;
    }

    if (step?.dockCorner) {
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
      const targetBottom = spot.top + spot.height + pad;
      const placeAbove = targetBottom > vpH - Math.min(220, ttH + margin);
      const mobileTop = placeAbove
        ? Math.max(margin, spot.top - ttH - gap)
        : Math.min(vpH - ttH - margin, targetBottom + gap);
      setTooltipPos({
        top: mobileTop,
        left: clamp(margin, 8, Math.max(8, vpW - ttW - margin)),
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
  }, [isOpen, step, spot, isMobile, viewport]);

  if (!isOpen || !step) return null;

  const overlayClassName = ['memoryStoryOpen', 'rewardsBadgeOpen'].includes(step.id)
    ? "fixed z-[600] bg-black/[0.08] pointer-events-none"
    : step.id === 'globePortugal'
      ? "fixed z-[600] bg-black/[0.10] backdrop-blur-[0.5px] pointer-events-none"
      : "fixed z-[600] bg-black/[0.18] backdrop-blur-[1.5px] pointer-events-none";

  return (
    <>
      <div className={`${overlayClassName} inset-0`} />

      {activeSpot && (
        <React.Fragment key={`highlight-${step.id}`}>
        <div
          className="fixed z-[610] pointer-events-none"
          style={{
            top: activeSpot.top - pad,
            left: activeSpot.left - pad,
            width: activeSpot.width + pad * 2,
            height: activeSpot.height + pad * 2,
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
                forceCircleHighlight
                  ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                  : activeSpot.height + pad * 2 < 90 && activeSpot.width + pad * 2 < 180
                    ? Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2
                    : Math.min(activeSpot.radius + pad, Math.min(activeSpot.width + pad * 2, activeSpot.height + pad * 2) / 2),
            }}
          />
          <div
            className="absolute inset-0 border-4 border-teal-400"
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
          className={`fixed z-[620] ${step.tone === 'action' ? 'bg-emerald-50 border-2 border-white/80 ring-1 ring-teal-200/80' : 'bg-white'} rounded-3xl shadow-2xl p-4 sm:p-6 w-[min(18rem,calc(100vw-1.5rem))] sm:w-[min(24rem,calc(100vw-2rem))] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain ${step.targetDataTour ? 'cursor-pointer' : ''} ${isCentered ? 'text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
          style={!isCentered && tooltipPos ? tooltipPos : undefined}
          ref={tooltipRef}
          role={step.targetDataTour ? 'button' : undefined}
          tabIndex={step.targetDataTour ? 0 : undefined}
          onClick={() => {
            if (step.targetDataTour) triggerTargetOrAdvance();
          }}
          onKeyDown={(event) => {
            if (!step.targetDataTour) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              triggerTargetOrAdvance();
            }
          }}
        >
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black text-teal-600 uppercase tracking-widest">Demo</span>
            </div>
            <button onClick={(event) => { event.stopPropagation(); onSkip(); }} className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Skip demo walkthrough">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <h3 className={`font-black text-gray-800 text-lg mb-2 ${isCentered ? 'text-center' : ''}`}>{step.title}</h3>
          <p className={`text-sm text-gray-500 font-medium leading-relaxed ${isCentered ? 'text-center' : ''}`}>
            {step.body}
            {activeSpot && (
              <span className="block mt-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                Tap the highlighted thing
              </span>
            )}
          </p>

          {step.targetDataTour && !spot && (
            <button
              onClick={(event) => { event.stopPropagation(); triggerTargetOrAdvance(); }}
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            >
              Continue
            </button>
          )}

          {!step.targetDataTour && (
            <button
              onClick={(event) => { event.stopPropagation(); onTargetClick(); }}
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            >
              Ready to Begin
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default DemoWalkthrough;
