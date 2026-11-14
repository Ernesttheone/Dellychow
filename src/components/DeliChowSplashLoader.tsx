import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface DeliChowSplashLoaderProps {
  isLoading: boolean;
}

export const DeliChowSplashLoader: React.FC<DeliChowSplashLoaderProps> = ({ isLoading }) => {
  const [minSequenceDone, setMinSequenceDone] = useState(false);
  const [phase, setPhase] = useState<'reveal' | 'loading'>('reveal');
  const [fadingOut, setFadingOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Respect prefers-reduced-motion for snappy dismissal
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setMinSequenceDone(true);
      setPhase('loading');
      return;
    }

    // Switch from initial stroke-draw reveal to seamless utensils recoil-and-join loop
    const loopTimer = window.setTimeout(() => {
      setPhase('loading');
    }, 1350);

    // Minimum polish window so the brand animation plays cleanly on initial visit
    const minTimer = window.setTimeout(() => {
      setMinSequenceDone(true);
    }, 1500);

    // Hard failsafe so the splash screen can never block the homepage
    const failsafeTimer = window.setTimeout(() => {
      setMinSequenceDone(true);
      setFadingOut(true);
    }, 2800);

    return () => {
      window.clearTimeout(loopTimer);
      window.clearTimeout(minTimer);
      window.clearTimeout(failsafeTimer);
    };
  }, []);

  // Once both the brand sequence and initial data load complete, fade out smoothly
  useEffect(() => {
    if (minSequenceDone && !isLoading) {
      setFadingOut(true);
    }
  }, [minSequenceDone, isLoading]);

  useEffect(() => {
    if (!fadingOut) return;
    const unmountTimer = window.setTimeout(() => {
      setDismissed(true);
    }, 360);
    return () => window.clearTimeout(unmountTimer);
  }, [fadingOut]);

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Deli Chow"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAF7F2] dark:bg-[#0f0e0d] transition-opacity duration-350 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center justify-center px-6">
        {/* Subtle warm golden-orange ambient glow behind the official logo */}
        <div
          aria-hidden="true"
          className="absolute -top-6 w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-amber-500/20 blur-2xl animate-delichow-subtle-glow pointer-events-none"
        />

        {/* Official Deli Chow Logo: scales in, draws utensils, sweeps light, bounces, then runs recoil-and-join loop while loading */}
        <BrandLogo size="xl" variant={phase} />

        {/* Modern Brand Typography */}
        <div className="mt-6 text-center animate-delichow-wordmark-reveal">
          <span className="font-serif-display text-2xl sm:text-3xl font-bold tracking-[0.18em] text-stone-900 dark:text-stone-100 uppercase block">
            DELI CHOW
          </span>
          <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700 dark:text-amber-400 block">
            Artisanal Kitchen
          </span>
        </div>
      </div>
    </div>
  );
};
