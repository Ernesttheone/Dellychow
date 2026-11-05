import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingCart, 
  Plus, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  FileText, 
  ArrowRight,
  Info
} from 'lucide-react';
import { Recipe, ShoppingList, ShoppingListItem } from '../../types';
import { combineIngredients, parseIngredient } from '../../lib/ingredientUtils';
import { ShoppingService } from '../../services/shoppingService';
import { useAuth } from '../../context/AuthContext';

interface AddIngredientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[]; // Can be single recipe or multiple recipes from favourites
  existingLists?: ShoppingList[];
  targetListId?: string;
  onSuccess: (listId: string) => void;
  onOpenAuthModal?: () => void;
}

export const AddIngredientsModal: React.FC<AddIngredientsModalProps> = ({
  isOpen,
  onClose,
  recipes,
  existingLists: initialLists,
  targetListId,
  onSuccess,
  onOpenAuthModal
}) => {
  const { currentUser } = useAuth();
  const [loadedLists, setLoadedLists] = useState<ShoppingList[]>([]);

  useEffect(() => {
    if (initialLists) {
      setLoadedLists(initialLists);
    } else if (currentUser?.uid) {
      const unsub = ShoppingService.listenToShoppingLists(currentUser.uid, (lists) => {
        setLoadedLists(lists);
      });
      return () => unsub();
    }
  }, [initialLists, currentUser, isOpen]);

  const availableLists = initialLists || loadedLists;

  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [notes, setNotes] = useState('');

  // Selected recipe ingredients to include
  const [preparedItems, setPreparedItems] = useState<ShoppingListItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (recipes.length > 0) {
      const defaultName = recipes.length === 1 
        ? `${recipes[0].title} Grocery List`
        : `Combined: ${recipes.map(r => r.title).slice(0, 2).join(' & ')}${recipes.length > 2 ? ` +${recipes.length - 2}` : ''}`;
      setNewListName(defaultName);

      // Smart merge and combine ingredients
      const itemsToCombine = recipes.map(r => ({
        recipeTitle: r.title,
        recipeId: r.id,
        ingredients: r.ingredients
      }));

      const combined = combineIngredients(itemsToCombine);
      setPreparedItems(combined);
      setSelectedItemIds(new Set(combined.map(i => i.id)));
    }

    if (targetListId) {
      setSelectedListId(targetListId);
      setTargetMode('existing');
    } else if (availableLists.length > 0) {
      setSelectedListId(availableLists[0].id);
    } else {
      setTargetMode('new');
    }
  }, [recipes, availableLists, targetListId, isOpen]);

  if (!isOpen || recipes.length === 0) return null;

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === preparedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(preparedItems.map(i => i.id)));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    const itemsToSave = preparedItems.filter(i => selectedItemIds.has(i.id));
    if (itemsToSave.length === 0) {
      setErrorMsg('Please select at least one ingredient to add to your shopping list.');
      return;
    }

    setSaving(true);
    try {
      let targetListId = selectedListId;

      if (targetMode === 'new') {
        const title = newListName.trim() || 'My Shopping List';
        const newList: ShoppingList = {
          id: '',
          userId: currentUser.uid,
          name: title,
          notes: notes.trim() || undefined,
          items: itemsToSave,
          recipeIds: recipes.map(r => r.id),
          recipeTitles: recipes.map(r => r.title),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        targetListId = await ShoppingService.saveShoppingList(currentUser.uid, newList);
      } else {
        const existing = availableLists.find(l => l.id === selectedListId);
        if (!existing) throw new Error('Selected shopping list was not found.');

        // Merge with existing items
        const combinedWithExisting = combineIngredients([
          {
            recipeTitle: 'Existing List',
            recipeId: 'existing',
            ingredients: existing.items.map(i => `${i.quantity} ${i.unit} ${i.name}`)
          },
          {
            recipeTitle: recipes.map(r => r.title).join(' & '),
            recipeId: recipes[0].id,
            ingredients: itemsToSave.map(i => `${i.quantity} ${i.unit} ${i.name}`)
          }
        ]);

        existing.items = combinedWithExisting;
        existing.updatedAt = new Date().toISOString();
        await ShoppingService.saveShoppingList(currentUser.uid, existing);
      }

      onSuccess(targetListId);
      onClose();
    } catch (err: any) {
      console.warn('Save shopping list error:', err);
      setErrorMsg(err.message || 'Failed to save shopping list. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                {recipes.length > 1 ? `Combine ${recipes.length} Recipes into List` : 'Add Ingredients to Shopping List'}
              </h3>
              <p className="text-xs text-stone-500">
                Smart unit merging combines compatible ingredients and keeps incompatible units safe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* List Destination Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
              Shopping List Destination
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTargetMode('new')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  targetMode === 'new'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Create New List
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('existing')}
                disabled={availableLists.length === 0}
                className={`py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 ${
                  targetMode === 'existing'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Add to Existing ({availableLists.length})
              </button>
            </div>

            {targetMode === 'new' ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">List Name *</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    required
                    placeholder="e.g. Weekend Gourmet Dinner"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Optional Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Organic produce only, prep for 6 guests"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Select List</label>
                <select
                  value={selectedListId}
                  onChange={e => setSelectedListId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availableLists.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.items.length} items)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Combined Items Review List */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Review Ingredients to Add ({selectedItemIds.size}/{preparedItems.length})
                </h4>
                <p className="text-[11px] text-stone-500">
                  {recipes.length > 1 ? 'Compatible duplicate quantities have been safely summed.' : 'Check or uncheck items as needed.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                {selectedItemIds.size === preparedItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {preparedItems.map(item => {
                const isSelected = selectedItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/50 text-stone-900'
                        : 'border-stone-200 bg-stone-50/50 text-stone-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-stone-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-stone-900">
                          {item.quantity} {item.unit}
                        </span>{' '}
                        <span className="text-stone-800">{item.name}</span>
                        {item.recipeSource && (
                          <span className="block text-[10px] text-stone-400 truncate">
                            Source: {item.recipeSource}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 shrink-0 font-medium">
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Action Strip */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selectedItemIds.size === 0}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{saving ? 'Saving...' : `Save ${selectedItemIds.size} Items to List`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
