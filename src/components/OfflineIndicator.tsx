import React, { useState } from 'react';
import { WifiOff, Film, Sparkles, X } from 'lucide-react';
import { useOnlineStatus } from '../lib/offlineVideoCache';

interface OfflineIndicatorProps {
  onViewCachedVideos?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onViewCachedVideos }) => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-auto z-50 max-w-md bg-stone-900/95 dark:bg-stone-900 text-white rounded-2xl shadow-xl border border-amber-500/40 p-3.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <WifiOff className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">
              Offline Mode Active
            </h4>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
            You are offline. Previously watched videos, recipe guides, and cached thumbnails remain fully available in your device cache.
          </p>

          {onViewCachedVideos && (
            <button
              type="button"
              onClick={onViewCachedVideos}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Film className="w-3 h-3" />
              <span>Browse Cached Videos</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
