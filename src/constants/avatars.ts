/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DefaultAvatar {
  id: string;
  name: string;
  title: string;
  description: string;
  themeColor: string;
  accentBg: string;
  borderColor: string;
  svgDataUri: string;
}

// 1. The Golden Toque (Artisan Chef / Amber & Gold)
const svgChefGold = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F3F4F6" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#bgGold)" />
  <circle cx="60" cy="60" r="54" fill="none" stroke="#FDE68A" stroke-width="2" stroke-opacity="0.4" />
  
  <!-- Chef Toque Icon -->
  <g filter="url(#shadow)">
    <!-- Hat Puffs -->
    <path d="M42 58 C36 54 36 44 44 40 C44 32 54 28 60 32 C66 28 76 32 76 40 C84 44 84 54 78 58 Z" fill="url(#hatGrad)" />
    <!-- Hat Base Band -->
    <rect x="42" y="58" width="36" height="18" rx="3" fill="#FFFFFF" />
    <!-- Band Fold Lines -->
    <line x1="48" y1="62" x2="48" y2="72" stroke="#E5E7EB" stroke-width="1.5" stroke-linecap="round" />
    <line x1="60" y1="62" x2="60" y2="72" stroke="#E5E7EB" stroke-width="1.5" stroke-linecap="round" />
    <line x1="72" y1="62" x2="72" y2="72" stroke="#E5E7EB" stroke-width="1.5" stroke-linecap="round" />
    <!-- Gold Trim Star -->
    <circle cx="60" cy="84" r="5" fill="#FDE68A" />
    <path d="M60 81 L61.2 83.5 L64 83.8 L62 85.7 L62.5 88.5 L60 87.2 L57.5 88.5 L58 85.7 L56 83.8 L58.8 83.5 Z" fill="#D97706" />
  </g>
</svg>`;

// 2. The Herb & Whisk (Botanical Gourmet / Emerald & Sage)
const svgHerbWhisk = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <linearGradient id="bgSage" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#065F46" />
    </linearGradient>
    <filter id="shadowSage" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#bgSage)" />
  <circle cx="60" cy="60" r="54" fill="none" stroke="#A7F3D0" stroke-width="2" stroke-opacity="0.4" />
  
  <g filter="url(#shadowSage)">
    <!-- Whisk Wires -->
    <ellipse cx="60" cy="46" rx="16" ry="20" fill="none" stroke="#FFFFFF" stroke-width="2.5" />
    <ellipse cx="60" cy="46" rx="9" ry="20" fill="none" stroke="#FFFFFF" stroke-width="2" />
    <line x1="60" y1="26" x2="60" y2="66" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
    <!-- Whisk Ring collar -->
    <rect x="54" y="66" width="12" height="4" rx="2" fill="#E5E7EB" />
    <!-- Whisk Handle -->
    <rect x="56" y="70" width="8" height="22" rx="3" fill="#FFFFFF" />
    <!-- Fresh Herb Leaves Sprig -->
    <path d="M60 48 Q74 42 78 30 Q70 38 60 48 Z" fill="#6EE7B7" />
    <path d="M60 48 Q46 42 42 30 Q50 38 60 48 Z" fill="#A7F3D0" />
  </g>
</svg>`;

// 3. The Sizzling Skillet (Passionate Epicurean / Terracotta & Coral)
const svgFlameSkillet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <linearGradient id="bgFlame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#BE123C" />
    </linearGradient>
    <filter id="shadowFlame" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#bgFlame)" />
  <circle cx="60" cy="60" r="54" fill="none" stroke="#FED7AA" stroke-width="2" stroke-opacity="0.4" />
  
  <g filter="url(#shadowFlame)">
    <!-- Culinary Flame Swirls -->
    <path d="M60 26 C64 34 72 38 68 48 C66 44 62 42 60 46 C58 42 54 44 52 48 C48 38 56 34 60 26 Z" fill="#FEF08A" />
    <path d="M60 36 C62 40 65 42 63 48 C60 47 57 48 60 36 Z" fill="#F97316" />
    
    <!-- Cast-Iron Skillet Pan -->
    <ellipse cx="60" cy="62" rx="24" ry="12" fill="#1F2937" stroke="#FFFFFF" stroke-width="2.5" />
    <!-- Pan Interior Reflection -->
    <ellipse cx="60" cy="62" rx="18" ry="7" fill="#374151" />
    <!-- Sizzling ingredient spark -->
    <circle cx="56" cy="61" r="2.5" fill="#FBBF24" />
    <circle cx="64" cy="63" r="2" fill="#F87171" />
    <!-- Pan Handle -->
    <path d="M82 64 L98 70 C99 70.5 99 72.5 97.5 73 L81 67 Z" fill="#1F2937" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round" />
  </g>
</svg>`;

export const DEFAULT_AVATARS: DefaultAvatar[] = [
  {
    id: 'avatar-chef-gold',
    name: 'The Golden Toque',
    title: 'Executive Chef',
    description: 'Artisan culinary master in warm golden honey tones.',
    themeColor: '#D97706',
    accentBg: 'bg-amber-100 text-amber-800 border-amber-300',
    borderColor: 'border-amber-500',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svgChefGold)}`
  },
  {
    id: 'avatar-herb-sage',
    name: 'The Herb & Whisk',
    title: 'Botanical Gourmet',
    description: 'Fresh organic gastronome in verdant emerald sage tones.',
    themeColor: '#059669',
    accentBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderColor: 'border-emerald-500',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svgHerbWhisk)}`
  },
  {
    id: 'avatar-flame-terracotta',
    name: 'The Sizzling Skillet',
    title: 'Passionate Epicurean',
    description: 'Fiery bistro cooking lover in warm terracotta coral tones.',
    themeColor: '#E11D48',
    accentBg: 'bg-orange-100 text-orange-800 border-orange-300',
    borderColor: 'border-orange-500',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svgFlameSkillet)}`
  }
];

/**
 * Deterministically get one of the 3 default avatars based on a seed (userId, email, or name)
 */
export function getDefaultAvatar(seed?: string, index?: number): DefaultAvatar {
  if (typeof index === 'number' && index >= 0 && index < DEFAULT_AVATARS.length) {
    return DEFAULT_AVATARS[index];
  }
  if (!seed) {
    return DEFAULT_AVATARS[0];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  return DEFAULT_AVATARS[positiveHash % DEFAULT_AVATARS.length];
}

/**
 * Returns either the custom photoURL if valid, or one of the 3 default avatar Data URIs
 */
export function resolveAvatarUrl(photoURL?: string | null, seed?: string, fallbackIndex?: number): string {
  if (photoURL && photoURL.trim().length > 0) {
    // If it's already an avatar ID like 'avatar-chef-gold'
    const matching = DEFAULT_AVATARS.find(a => a.id === photoURL);
    if (matching) return matching.svgDataUri;
    return photoURL;
  }
  return getDefaultAvatar(seed, fallbackIndex).svgDataUri;
}
