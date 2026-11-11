import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Clock, 
  ChefHat, 
  Video, 
  Sparkles, 
  TrendingUp, 
  Play, 
  Eye, 
  ChevronRight 
} from 'lucide-react';
import { CookingVideo, Recipe } from '../types';
import { UserAvatar } from './UserAvatar';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  videos: CookingVideo[];
  recipes: Recipe[];
  onPlayVideo: (video: CookingVideo) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectChef?: (chefId: string) => void;
}

const POPULAR_SEARCH_SUGGESTIONS = [
  'Handmade Pasta',
  'Jollof Rice',
  'Knife Skills',
  'French Bistro',
  'Truffle Sauce',
  'Artisan Sourdough',
  'Suya Beef',
  'Seafood Platter'
];

export const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  isOpen,
  onClose,
  videos,
  recipes,
  onPlayVideo,
  onSelectRecipe,
  onSelectChef
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'videos' | 'recipes' | 'chefs'>('all');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dellychow_mobile_search_history');
      if (stored) {
        setSearchHistory(JSON.parse(stored).slice(0, 8));
      }
    } catch {
      // ignore
    }
  }, []);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const saveToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...searchHistory.filter(h => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setSearchHistory(updated);
    try {
      localStorage.setItem('dellychow_mobile_search_history', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeFromHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.filter(h => h !== term);
    setSearchHistory(updated);
    try {
      localStorage.setItem('dellychow_mobile_search_history', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('dellychow_mobile_search_history');
    } catch {
      // ignore
    }
  };

  // Search Results Filtering
  const cleanQ = query.trim().toLowerCase();

  const matchedVideos = useMemo(() => {
    if (!cleanQ) return [];
    return videos.filter(v => 
      v.title.toLowerCase().includes(cleanQ) || 
      v.authorName.toLowerCase().includes(cleanQ) || 
      (v.category && v.category.toLowerCase().includes(cleanQ)) ||
      (v.description && v.description.toLowerCase().includes(cleanQ))
    );
  }, [videos, cleanQ]);

  const matchedRecipes = useMemo(() => {
    if (!cleanQ) return [];
    return recipes.filter(r => 
      r.title.toLowerCase().includes(cleanQ) || 
      r.authorName.toLowerCase().includes(cleanQ) || 
      (r.category && r.category.toLowerCase().includes(cleanQ))
    );
  }, [recipes, cleanQ]);

  // Extract unique chefs from matched videos and recipes
  const matchedChefs = useMemo(() => {
    if (!cleanQ) return [];
    const chefMap = new Map<string, { id: string; name: string; photo?: string }>();
    
    videos.forEach(v => {
      if (v.authorName.toLowerCase().includes(cleanQ) && !chefMap.has(v.authorId)) {
        chefMap.set(v.authorId, { id: v.authorId, name: v.authorName, photo: v.authorPhoto });
      }
    });

    recipes.forEach(r => {
      if (r.authorName.toLowerCase().includes(cleanQ) && !chefMap.has(r.authorId)) {
        chefMap.set(r.authorId, { id: r.authorId, name: r.authorName });
      }
    });

    return Array.from(chefMap.values());
  }, [videos, recipes, cleanQ]);

  const hasResults = matchedVideos.length > 0 || matchedRecipes.length > 0 || matchedChefs.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col animate-in fade-in">
      {/* 1. YouTube-Style Top Search Header */}
      <div className="px-3 py-2.5 bg-white border-b border-stone-200 flex items-center gap-2 shadow-xs shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Input Pill */}
        <div className="flex-1 flex items-center bg-stone-100 rounded-full px-3.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveToHistory(query);
              }
            }}
            placeholder="Search recipes, videos, chefs..."
            className="w-full bg-transparent text-sm text-stone-900 focus:outline-none placeholder-stone-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-stone-400 hover:text-stone-700"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Chips (when typing query) */}
      {cleanQ && (
        <div className="px-3 py-2 bg-white/80 border-b border-stone-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {(['all', 'videos', 'recipes', 'chefs'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize ${
                filterType === t
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 3. Search Body: History & Suggestions or Search Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* If no query entered yet: Show Recent Searches & Popular Suggestions */}
        {!cleanQ && (
          <div className="space-y-6">
            {/* Recent Searches */}
            {searchHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Recent Searches</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearAllHistory}
                    className="text-[11px] text-amber-700 hover:underline lowercase font-medium"
                  >
                    Clear history
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => setQuery(item)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer text-sm text-stone-800"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <span>{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => removeFromHistory(item, e)}
                        className="p-1 text-stone-400 hover:text-stone-700"
                        aria-label="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Culinary Suggestions */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                <span>Trending Culinary Topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCH_SUGGESTIONS.map((topic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(topic);
                      saveToHistory(topic);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:border-amber-500 hover:text-amber-800 transition-all shadow-2xs"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* When query is typed: Live YouTube-Style Results */}
        {cleanQ && (
          <div className="space-y-6">
            {!hasResults && (
              <div className="py-16 text-center space-y-2">
                <Search className="w-10 h-10 text-stone-400 mx-auto" />
                <h4 className="font-serif-display text-base font-bold text-stone-800">
                  No matches found for &quot;{query}&quot;
                </h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Try checking your spelling or search for popular topics like pasta, jollof, or knife skills.
                </p>
              </div>
            )}

            {/* Chef Channel Results */}
            {(filterType === 'all' || filterType === 'chefs') && matchedChefs.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Chefs & Creators ({matchedChefs.length})
                </span>
                <div className="space-y-2">
                  {matchedChefs.map((chef) => (
                    <div
                      key={chef.id}
                      onClick={() => {
                        saveToHistory(query);
                        onClose();
                        if (onSelectChef) onSelectChef(chef.id);
                      }}
                      className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={chef.photo}
                          seed={chef.id}
                          name={chef.name}
                          size="md"
                        />
                        <div>
                          <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                            <span>Chef {chef.name}</span>
                            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <span className="text-xs text-stone-500">Verified Culinary Channel</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Masterclasses Results (YouTube-Style List Cards) */}
            {(filterType === 'all' || filterType === 'videos') && matchedVideos.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Cooking Videos ({matchedVideos.length})
                </span>
                <div className="space-y-3">
                  {matchedVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => {
                        saveToHistory(query);
                        onClose();
                        onPlayVideo(video);
                      }}
                      className="flex gap-3 bg-white p-2.5 rounded-2xl border border-stone-200/80 cursor-pointer hover:border-amber-500 transition-all shadow-2xs group"
                    >
                      {/* Video Thumbnail */}
                      <div className="relative w-32 aspect-16/9 bg-stone-900 rounded-xl overflow-hidden shrink-0">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-500">
                            <Play className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-bold text-white px-1.5 py-0.2 rounded tabular-nums">
                          {video.durationMinutes || 15}m
                        </span>
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="font-semibold text-xs sm:text-sm text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-800 transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 mt-1 truncate">
                            Chef {video.authorName} • {(video.viewCount || 100).toLocaleString()} views
                          </p>
                        </div>
                        {video.category && (
                          <span className="text-[9px] font-bold uppercase text-amber-700">
                            {video.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipes Results */}
            {(filterType === 'all' || filterType === 'recipes') && matchedRecipes.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Artisan Recipes ({matchedRecipes.length})
                </span>
                <div className="space-y-2">
                  {matchedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => {
                        saveToHistory(query);
                        onClose();
                        onSelectRecipe(recipe);
                      }}
                      className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                            {recipe.title}
                          </h4>
                          <span className="text-[11px] text-stone-500 block truncate">
                            By {recipe.authorName} • {recipe.cookTimeMinutes} mins
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
