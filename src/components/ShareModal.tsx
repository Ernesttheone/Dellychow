import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Send, 
  ExternalLink,
  UtensilsCrossed,
  Sparkles
} from 'lucide-react';

export interface ShareItem {
  type?: 'video' | 'chef' | 'user' | 'recipe';
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  text?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  url?: string;
  mediaType?: 'video' | 'chef' | 'user' | 'recipe' | string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShareItem | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  // Build the permanent unique link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dellychow.com';
  const effectiveType = item.type || item.mediaType || 'video';
  const itemId = item.id || '';
  let sharePath = '';
  if (effectiveType === 'video' && itemId) {
    sharePath = `?video=${encodeURIComponent(itemId)}`;
  } else if (effectiveType === 'chef' && itemId) {
    sharePath = `?chef=${encodeURIComponent(itemId)}`;
  } else if (effectiveType === 'user' && itemId) {
    sharePath = `?user=${encodeURIComponent(itemId)}`;
  } else if (effectiveType === 'recipe' && itemId) {
    sharePath = `?recipe=${encodeURIComponent(itemId)}`;
  }

  const fullUrl = item.url || (sharePath ? `${origin}/${sharePath}` : origin);

  const shareText = item.text || item.description || (
    effectiveType === 'video'
      ? `Watch "${item.title}" by ${item.subtitle || 'Chef'} on DellyChow Artisanal Kitchen!`
      : effectiveType === 'chef'
      ? `Check out ${item.title}'s culinary profile and masterclasses on DellyChow!`
      : effectiveType === 'user'
      ? `Explore ${item.title}'s culinary foodie profile and badges on DellyChow!`
      : `Explore "${item.title}" recipe on DellyChow!`
  );

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy notice:', e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: fullUrl
        });
      } catch {
        // User cancelled or share dismissed
      }
    }
  };

  const openShareWindow = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  // Social Sharing Targets
  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.791.82 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.477 9.98-9.969 9.98-1.709 0-3.32-.44-4.733-1.215l-5.298 1.389 1.413-5.163c-.881-1.487-1.382-3.218-1.382-5.011 0-5.503 4.477-9.98 9.969-9.98 5.492 0 10 4.477 10 9.98z"/>
        </svg>
      ),
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      action: () => openShareWindow(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + fullUrl)}`)
    },
    {
      name: 'X (Twitter)',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: 'bg-stone-900 hover:bg-black text-white',
      action: () => openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`)
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      action: () => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`)
    },
    {
      name: 'Telegram',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.63 3.73-.53.37-1.02.55-1.45.54-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 8.01-3.44 3.82-1.59 4.62-1.87 5.14-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.04.3z"/>
        </svg>
      ),
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      action: () => openShareWindow(`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`)
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-display text-base font-bold text-stone-900 leading-tight">
                {item.type === 'video' ? 'Share Cooking Video' : item.type === 'chef' ? 'Share Chef Profile' : 'Share Foodie Profile'}
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                DellyChow Universal Permanent Link
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Visual Link Preview Card */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center gap-3 shadow-2xs">
            {(item.imageUrl || item.thumbnailUrl) ? (
              <img 
                src={item.imageUrl || item.thumbnailUrl} 
                alt={item.title} 
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200 shadow-2xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-7 h-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                {effectiveType === 'video' ? 'Masterclass Video' : effectiveType === 'chef' ? 'Artisanal Chef' : effectiveType === 'recipe' ? 'Artisanal Recipe' : 'Food Lover'}
              </span>
              <h4 className="font-serif-display text-sm font-bold text-stone-900 truncate">
                {item.title}
              </h4>
              {item.subtitle && (
                <p className="text-[11px] text-stone-500 truncate mt-0.5">
                  {item.subtitle}
                </p>
              )}
              <span className="text-[10px] text-amber-800 font-semibold block mt-1">
                DellyChow Artisanal Kitchen
              </span>
            </div>
          </div>

          {/* Permanent URL Box with Copy Button */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Unique Permanent Link
            </label>
            <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
              <input
                type="text"
                readOnly
                value={fullUrl}
                className="w-full bg-transparent px-3 py-1.5 text-xs text-stone-700 font-mono truncate focus:outline-none select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-emerald-700 text-xs font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Link copied successfully! Share it with friends or family.</span>
              </p>
            )}
          </div>

          {/* Social Media Sharing Grid */}
          <div className="space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Share to Platform
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {shareLinks.map((target) => (
                <button
                  key={target.name}
                  type="button"
                  onClick={target.action}
                  className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${target.color}`}
                >
                  {target.icon}
                  <span className="text-[11px]">{target.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Native Mobile Share if Supported */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-amber-600" />
              <span>More Share Options (Device)</span>
            </button>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-center text-[11px] text-stone-500">
          Shared links open directly for anyone on mobile, tablet, and desktop without requiring registration for public tutorials.
        </div>
      </div>
    </div>
  );
};
