import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'static' | 'reveal' | 'loading';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, { box: string; icon: string }> = {
  sm: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4' },
  md: { box: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl', icon: 'w-4 h-4 sm:w-5 sm:h-5' },
  lg: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8' },
  xl: { box: 'w-24 h-24 sm:w-28 sm:h-28 rounded-[1.75rem]', icon: 'w-12 h-12 sm:w-14 sm:h-14' },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'static',
  className = '',
}) => {
  const { box, icon } = SIZE_CLASSES[size];

  const isReveal = variant === 'reveal';
  const isLoading = variant === 'loading';

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shrink-0 select-none ${box} ${
        isReveal ? 'animate-delichow-square-reveal shadow-xl shadow-amber-600/25' : ''
      } ${isLoading ? 'animate-delichow-orange-pulse' : ''} ${className}`}
    >
      {/* Subtle golden-orange diagonal light sweep during reveal */}
      {isReveal && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-amber-200/55 to-transparent animate-delichow-light-sweep"
        />
      )}

      {/* Exact Lucide UtensilsCrossed SVG geometry preserving original logo proportions */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`relative z-10 ${icon} overflow-visible`}
        aria-hidden="true"
      >
        {/* Fork Group (Prongs + Spine + Handle) */}
        <g className={isLoading ? 'animate-delichow-fork-join' : ''}>
          <path
            d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"
            className={isReveal ? 'animate-delichow-stroke-draw' : ''}
          />
          <path
            d="m19 5-7 7"
            className={isReveal ? 'animate-delichow-stroke-draw' : ''}
          />
          <path
            d="m2.1 21.8 6.4-6.3"
            className={isReveal ? 'animate-delichow-stroke-draw' : ''}
          />
        </g>

        {/* Knife Group (Blade + Handle) */}
        <g className={isLoading ? 'animate-delichow-knife-join' : ''}>
          <path
            d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"
            className={isReveal ? 'animate-delichow-stroke-draw' : ''}
          />
        </g>
      </svg>
    </div>
  );
};
