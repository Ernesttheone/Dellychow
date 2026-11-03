import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Clock, Star, UtensilsCrossed } from 'lucide-react';
import { Recipe, RecipeCategory } from '../types';
import { RecipeCard } from '../components/RecipeCard';

interface ExplorePageProps {
  recipes: Recipe[];
  initialCategory?: string;
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectChef: (chefId: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  recipes,
  initialCategory = 'all',
  onSelectRecipe,
  onSelectChef
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || 'all'
  );
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'time'>('newest');

  // Dynamic categories including Rice, Soups, Snacks, Drinks, etc.
  const categories = useMemo(() => {
    const baseList = ['Rice', 'Soups', 'Snacks', 'Drinks', 'Breakfast', 'Lunch', 'Dinner', 'Desserts'];
    const set = new Set<string>(baseList);
    recipes.forEach((r) => {
      if (r.category) {
        const formatted = r.category.charAt(0).toUpperCase() + r.category.slice(1).toLowerCase();
        set.add(formatted);
      }
    });
    return [
      { id: 'all', label: 'All Categories' },
      ...Array.from(set).map((cat) => ({ id: cat.toLowerCase(), label: cat }))
    ];
  }, [recipes]);

  // Extract all available cuisines dynamically
  const cuisines = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.cuisine) set.add(r.cuisine);
    });
    return Array.from(set).sort();
  }, [recipes]);

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      // Category filter (case-insensitive)
      if (selectedCategory !== 'all' && (r.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Cuisine filter
      if (selectedCuisine !== 'all' && (r.cuisine || '').toLowerCase() !== selectedCuisine.toLowerCase()) {
        return false;
      }
      // Search query (checks meal name, cuisine, and ingredients!)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.title.toLowerCase().includes(q);
        const matchesCuisine = (r.cuisine || '').toLowerCase().includes(q);
        const matchesIngredients = r.ingredients?.some((ing) => ing.toLowerCase().includes(q));
        const matchesDesc = r.description.toLowerCase().includes(q);
        if (!matchesName && !matchesCuisine && !matchesIngredients && !matchesDesc) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      }
      if (sortBy === 'time') {
        const timeA = (a.prepTimeMinutes || 0) + (a.cookTimeMinutes || 0);
        const timeB = (b.prepTimeMinutes || 0) + (b.cookTimeMinutes || 0);
        return timeA - timeB;
      }
      // Default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [recipes, selectedCategory, selectedCuisine, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header and Search */}
      <div className="space-y-4">
        <div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Discover & Explore Recipes
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Search delicious meals by title, secret ingredients, cuisine style, or course.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by meal name (e.g., Truffle Pasta), ingredients (e.g., garlic, salmon), or cuisine..."
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-stone-200/90 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sort Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-stone-200/80">
        
        {/* Category Tabs (Segmented Button Controls) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters: Cuisine & Sorting */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between sm:justify-end">
          {/* Cuisine Filter */}
          {cuisines.length > 0 && (
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Cuisines</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="newest">Newest First</option>
            <option value="rating">Highest Rated</option>
            <option value="time">Quickest Cook Time</option>
          </select>
        </div>
      </div>

      {/* Search Result Count */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>
          Showing <strong className="text-stone-800 tabular-nums">{filteredRecipes.length}</strong> recipes
          {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
        </span>
        {(searchQuery || selectedCategory !== 'all' || selectedCuisine !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedCuisine('all');
            }}
            className="text-amber-700 hover:underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Grid or Zero State */}
      {filteredRecipes.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h3 className="font-serif-display text-xl font-bold text-stone-900">
            No Matching Recipes Found
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            We couldn&apos;t find any recipes matching your current filter criteria. Try searching for broader ingredients or clearing your category selection.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedCuisine('all');
            }}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelect={onSelectRecipe}
              onSelectChef={onSelectChef}
            />
          ))}
        </div>
      )}

    </div>
  );
};
