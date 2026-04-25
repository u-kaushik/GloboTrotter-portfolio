import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';

type StepTone = 'info' | 'action';
type InlineStyleSnapshot = Pick<CSSStyleDeclaration, 'position' | 'zIndex' | 'isolation'>;

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

const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({ isOpen, step, onSkip, onTargetClick }) => {
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number; radius: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const pad = 12;
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const isCentered = Boolean(step && (!step.targetDataTour || step.centered));
  const allowCenteredHighlight = step?.id === 'addTrip';
  const requiresNativeTargetClick = step?.id === 'globePortugal';
  const forceCircleHighlight = step?.id === 'globePortugal';
  const activeSpot = step?.targetDataTour && (!isCentered || allowCenteredHighlight) ? spot : null;

  useEffect(() => {
    setSpot(null);
  }, [step?.id]);

  useEffect(() => {
    if (!isOpen || !step?.targetDataTour || (isCentered && !allowCenteredHighlight)) { setSpot(null); return; }

    let raf: number | null = null;
    const update = () => {
      const el = document.querySelector(`[data-tour="${step.targetDataTour}"]`);
      if (!el) { setSpot(null); return; }
      const rect = (el as HTMLElement).getBoundingClientRect();
      const computed = window.getComputedStyle(el as HTMLElement);
      const radius = Number.parseFloat(computed.borderTopLeftRadius || '0') || 0;
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
      });
    };

    remember(targetEl);
    targetEl.dataset.demoTourFocus = 'true';
    targetEl.style.zIndex = '616';
    targetEl.style.isolation = 'isolate';
    if (window.getComputedStyle(targetEl).position === 'static') {
      targetEl.style.position = 'relative';
    }

    // Portfolio demo polish: the focused walkthrough element should feel like
    // part of the guide layer, so lift every modal/card wrapper that could
    // otherwise trap it behind the dimmed page overlay.
    let surfaceEl = targetEl.parentElement;
    while (surfaceEl) {
      if (surfaceEl instanceof HTMLElement && surfaceEl.hasAttribute('data-tour-surface')) {
        remember(surfaceEl);
        if (window.getComputedStyle(surfaceEl).position === 'static') {
          surfaceEl.style.position = 'relative';
        }
        surfaceEl.style.zIndex = '605';
        surfaceEl.style.isolation = 'isolate';
      }
      surfaceEl = surfaceEl.parentElement;
    }

    return () => {
      targetEl.removeAttribute('data-demo-tour-focus');
      snapshots.forEach((snapshot, el) => {
        el.style.position = snapshot.position;
        el.style.zIndex = snapshot.zIndex;
        el.style.isolation = snapshot.isolation;
      });
    };
  }, [isOpen, step?.targetDataTour]);

  const overlayMaskStyle = useMemo(() => {
    if (!activeSpot) return undefined;
    const holeX = Math.max(0, activeSpot.left - pad);
    const holeY = Math.max(0, activeSpot.top - pad);
    const holeW = Math.max(0, activeSpot.width + pad * 2);
    const holeH = Math.max(0, activeSpot.height + pad * 2);
    const vpW = Math.max(1, document.documentElement.clientWidth);
    const vpH = Math.max(1, document.documentElement.clientHeight);
    const holeRadius = forceCircleHighlight
      ? Math.min(holeW, holeH) / 2
      : activeSpot.height + pad * 2 < 90 && activeSpot.width + pad * 2 < 180
      ? Math.min(holeW, holeH) / 2
      : Math.min(activeSpot.radius + pad, Math.min(holeW, holeH) / 2);

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
  }, [activeSpot, pad, forceCircleHighlight]);

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
      const placeAbove = targetBottom > vpH - 220;
      const mobileTop = placeAbove
        ? Math.max(margin, spot.top - ttH - gap)
        : Math.min(vpH - ttH - margin, targetBottom + gap);
      setTooltipPos({
        top: mobileTop,
        left: margin,
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
      <div
        className="fixed inset-0 z-[600] bg-black/30 backdrop-blur-[3px] pointer-events-none"
        style={overlayMaskStyle}
      />

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
          className={`fixed z-[620] bg-white rounded-3xl shadow-2xl p-4 sm:p-6 w-[min(18rem,calc(100vw-1rem))] sm:w-[min(24rem,calc(100vw-2rem))] overflow-hidden ${isCentered ? 'text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
          style={!isCentered && tooltipPos ? tooltipPos : undefined}
          ref={tooltipRef}
        >
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black text-teal-600 uppercase tracking-widest">Demo</span>
            </div>
            <button onClick={onSkip} className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Skip demo walkthrough">
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
              onClick={onTargetClick}
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            >
              Continue
            </button>
          )}

          {!step.targetDataTour && (
            <button
              onClick={onTargetClick}
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
