import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  UtensilsCrossed, 
  Clock, 
  Search, 
  Eye,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { Recipe } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';

interface ChefMyRecipesProps {
  recipes: Recipe[];
  onBack: () => void;
  onNavigate: (view: string, params?: any) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export const ChefMyRecipes: React.FC<ChefMyRecipesProps> = ({
  recipes,
  onBack,
  onNavigate,
  onEditRecipe,
  onSelectRecipe
}) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const myRecipes = recipes.filter(r => r.authorId === currentUser?.uid);

  const publishedCount = myRecipes.filter(r => !r.status || r.status === 'published').length;
  const draftCount = myRecipes.filter(r => r.status === 'draft').length;

  const filtered = myRecipes.filter(r => {
    // Status filter
    if (statusFilter === 'published' && r.status === 'draft') return false;
    if (statusFilter === 'draft' && r.status !== 'draft') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (recipeId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await RecipeService.deleteRecipe(recipeId);
      } catch (err) {
        console.error('Failed to delete recipe:', err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Chef Studio</span>
        </button>

        <button
          onClick={() => onNavigate('chef-create-recipe')}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recipe</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-display text-3xl font-bold text-stone-900 tracking-tight">
            My Recipes ({myRecipes.length})
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage your published meals and private recipe drafts.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my recipes..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Filter Tabs: All, Published, Drafts */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            statusFilter === 'all'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          All ({myRecipes.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('published')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            statusFilter === 'published'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Published ({publishedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            statusFilter === 'draft'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Drafts ({draftCount})</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-3 max-w-md mx-auto">
          <UtensilsCrossed className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-serif-display text-lg font-bold text-stone-800">
            {myRecipes.length === 0 ? 'No recipes uploaded yet' : 'No matching recipes'}
          </h3>
          <p className="text-xs text-stone-500">
            {myRecipes.length === 0
              ? 'Click "Add Recipe" above to upload your first meal.'
              : 'Try clearing your search or filter.'}
          </p>
          {myRecipes.length === 0 && (
            <button
              onClick={() => onNavigate('chef-create-recipe')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recipe</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe) => (
            <div 
              key={recipe.id}
              className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div 
                className="relative aspect-16/10 overflow-hidden bg-stone-100 cursor-pointer"
                onClick={() => onSelectRecipe(recipe)}
              >
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5">
                  {recipe.status === 'draft' ? (
                    <span className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>Draft</span>
                    </span>
                  ) : (
                    <span className="bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Published</span>
                    </span>
                  )}
                </div>

                {recipe.videoUrl && (
                  <div className="absolute bottom-2.5 right-2.5 bg-stone-900/80 text-white text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                    <span>Includes Video</span>
                  </div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                    <span className="capitalize font-semibold text-amber-700">{recipe.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.cookTimeMinutes} mins</span>
                    </span>
                  </div>

                  <h3 
                    onClick={() => onSelectRecipe(recipe)}
                    className="font-serif-display text-base font-bold text-stone-900 hover:text-amber-700 transition-colors cursor-pointer line-clamp-1"
                  >
                    {recipe.title}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                    {recipe.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectRecipe(recipe)}
                    className="px-2.5 py-1 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    title="View recipe"
                  >
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>View</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditRecipe(recipe)}
                      className="px-2.5 py-1 text-stone-700 hover:text-amber-700 hover:bg-stone-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Recipe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
