/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { resolveAvatarUrl, getDefaultAvatar } from '../constants/avatars';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  seed?: string;
  size?: AvatarSize;
  className?: string;
  alt?: string;
  avatarIndex?: number;
  badge?: React.ReactNode;
  onClick?: () => void;
  ring?: boolean;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28 sm:w-32 sm:h-32'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'Food Lover',
  seed,
  size = 'md',
  className = '',
  alt,
  avatarIndex,
  badge,
  onClick,
  ring = true
}) => {
  const [hasError, setHasError] = useState(false);

  // Determine avatar image source
  const effectiveSrc = hasError || !src
    ? getDefaultAvatar(seed || name, avatarIndex).svgDataUri
    : resolveAvatarUrl(src, seed || name, avatarIndex);

  const sizeClass = SIZE_CLASSES[size];

  return (
    <div 
      className={`relative inline-block shrink-0 rounded-full select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      <img
        src={effectiveSrc}
        alt={alt || name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-full object-cover ${ring ? 'ring-2 ring-amber-500/20' : ''} shadow-2xs`}
      />
      {badge && (
        <div className="absolute -bottom-1 -right-1 z-10">
          {badge}
        </div>
      )}
    </div>
  );
};
