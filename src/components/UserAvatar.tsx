/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { resolveAvatarUrl, getDefaultAvatar } from '../constants/avatars';
import { useAuth } from '../context/AuthContext';

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
  showFollowButton?: boolean;
  creatorId?: string;
  creatorName?: string;
  creatorPhoto?: string;
  creatorSpecialty?: string;
  onRequireAuth?: () => void;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28 sm:w-32 sm:h-32'
};

const FOLLOW_BTN_SIZES: Record<AvatarSize, { btn: string; icon: string }> = {
  xs: { btn: 'w-4 h-4 -top-1 -right-1', icon: 'w-2.5 h-2.5' },
  sm: { btn: 'w-4 h-4 -top-1 -right-1', icon: 'w-2.5 h-2.5' },
  md: { btn: 'w-5 h-5 -top-1 -right-1', icon: 'w-3 h-3' },
  lg: { btn: 'w-6 h-6 -top-1 -right-1', icon: 'w-3.5 h-3.5' },
  xl: { btn: 'w-7 h-7 -top-0.5 -right-0.5', icon: 'w-4 h-4' },
  '2xl': { btn: 'w-8 h-8 top-0 right-0', icon: 'w-4 h-4' }
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
  ring = true,
  showFollowButton = false,
  creatorId,
  creatorName,
  creatorPhoto,
  creatorSpecialty,
  onRequireAuth
}) => {
  const [hasError, setHasError] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { currentUser, isFollowingChef, toggleFollowChef, setPendingAction } = useAuth();

  // Determine avatar image source
  const effectiveSrc = hasError || !src
    ? getDefaultAvatar(seed || name, avatarIndex).svgDataUri
    : resolveAvatarUrl(src, seed || name, avatarIndex);

  const sizeClass = SIZE_CLASSES[size];
  const resolvedCreatorId = creatorId || seed;
  const shouldShowFollow = Boolean(
    showFollowButton &&
    resolvedCreatorId &&
    resolvedCreatorId !== currentUser?.uid
  );
  const isFollowing = shouldShowFollow && resolvedCreatorId ? isFollowingChef(resolvedCreatorId) : false;
  const followDimensions = FOLLOW_BTN_SIZES[size];

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resolvedCreatorId || toggling) return;

    const targetName = creatorName || name || 'Creator';
    if (!currentUser) {
      setPendingAction({
        type: 'follow_chef',
        chefId: resolvedCreatorId,
        chefName: targetName
      });
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setToggling(true);
    try {
      await toggleFollowChef(resolvedCreatorId, {
        name: targetName,
        photo: creatorPhoto || src || '',
        specialty: creatorSpecialty
      });
    } catch {
      // Silently recover
    } finally {
      setToggling(false);
    }
  };

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

      {shouldShowFollow && (
        <button
          type="button"
          onClick={handleFollowClick}
          disabled={toggling}
          aria-label={isFollowing ? `Following ${creatorName || name}` : `Follow ${creatorName || name}`}
          title={isFollowing ? `Following ${creatorName || name}` : `Follow ${creatorName || name}`}
          className={`absolute ${followDimensions.btn} z-20 rounded-full flex items-center justify-center border-2 border-[#12100E] dark:border-stone-950 transition-all cursor-pointer after:content-[''] after:absolute after:-inset-2 ${
            isFollowing
              ? 'bg-emerald-600 text-white delly-follow-check-glow hover:bg-emerald-500'
              : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 delly-follow-plus-glow'
          } ${toggling ? 'opacity-70' : ''}`}
        >
          {isFollowing ? (
            <Check className={`${followDimensions.icon} stroke-[3]`} />
          ) : (
            <Plus className={`${followDimensions.icon} stroke-[3.2]`} />
          )}
        </button>
      )}

      {badge && (
        <div className="absolute -bottom-1 -right-1 z-10">
          {badge}
        </div>
      )}
    </div>
  );
};

