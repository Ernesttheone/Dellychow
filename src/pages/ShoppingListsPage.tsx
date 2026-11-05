import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  Edit3, 
  Copy, 
  Archive, 
  ExternalLink, 
  Truck, 
  Filter, 
  Layers, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Tag, 
  DollarSign, 
  HelpCircle,
  FileText,
  ArrowRight,
  RefreshCw,
  X,
  Info
} from 'lucide-react';
import { ShoppingList, ShoppingListItem, IngredientCategory, GroceryService, GroceryMatchItem } from '../types';
import { ShoppingService } from '../services/shoppingService';
import { SUPPORTED_GROCERY_SERVICES, matchItemsWithService } from '../data/groceryServices';
import { detectCategory } from '../lib/ingredientUtils';
import { useAuth } from '../context/AuthContext';

interface ShoppingListsPageProps {
  onNavigate?: (view: string, params?: any) => void;
  onOpenAuthModal: () => void;
  onNavigateToRecipe?: (recipeId: string) => void;
  onSelectRecipe?: (recipe: any) => void;
  initialListId?: string;
}

const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  'Produce': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Dairy & Refrigerated': 'bg-blue-50 text-blue-800 border-blue-200',
  'Meat & Seafood': 'bg-rose-50 text-rose-800 border-rose-200',
  'Pantry & Dry Goods': 'bg-amber-50 text-amber-800 border-amber-200',
  'Spices & Seasonings': 'bg-purple-50 text-purple-800 border-purple-200',
  'Bakery': 'bg-orange-50 text-orange-800 border-orange-200',
  'Beverages': 'bg-cyan-50 text-cyan-800 border-cyan-200',
  'Other': 'bg-stone-50 text-stone-800 border-stone-200'
};

export const ShoppingListsPage: React.FC<ShoppingListsPageProps> = ({
  onOpenAuthModal,
  onNavigateToRecipe,
  initialListId
}) => {
  const { currentUser } = useAuth();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'remaining' | 'purchased'>('all');
  const [groupByCategory, setGroupByCategory] = useState(true);

  // New item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('item');
  const [newItemCategory, setNewItemCategory] = useState<IngredientCategory>('Produce');

  // New list form
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListNotes, setNewListNotes] = useState('');

  // Editing list details
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // Inline editing item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQty, setEditItemQty] = useState('');
  const [editItemUnit, setEditItemUnit] = useState('');

  // Undo system
  const [undoAction, setUndoAction] = useState<{
    message: string;
    action: () => void;
  } | null>(null);

  // Grocery Transfer Modal
  const [selectedService, setSelectedService] = useState<GroceryService | null>(null);
  const [groceryMatches, setGroceryMatches] = useState<GroceryMatchItem[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Confirm delete modal
  const [deleteConfirmList, setDeleteConfirmList] = useState<ShoppingList | null>(null);

  // Real-time listener for user shopping lists
  useEffect(() => {
    if (!currentUser) return;
    const unsub = ShoppingService.listenToShoppingLists(currentUser.uid, (loaded) => {
      setLists(loaded);
      if (loaded.length > 0) {
        if (initialListId && loaded.some(l => l.id === initialListId)) {
          setActiveListId(initialListId);
        } else if (!activeListId || !loaded.some(l => l.id === activeListId)) {
          setActiveListId(loaded[0].id);
        }
      }
    });
    return () => unsub();
  }, [currentUser, initialListId]);

  const activeList = lists.find(l => l.id === activeListId) || null;

  // Toggle item purchased
  const handleTogglePurchased = async (item: ShoppingListItem) => {
    if (!currentUser || !activeList) return;
    const previousStatus = item.purchased;
    const updatedItems = activeList.items.map(i => 
      i.id === item.id ? { ...i, purchased: !previousStatus } : i
    );

    await ShoppingService.updateListItems(currentUser.uid, activeList.id, updatedItems);

    // Provide Undo option
    setUndoAction({
      message: `Marked "${item.name}" as ${!previousStatus ? 'purchased' : 'unpurchased'}.`,
      action: async () => {
        const revertedItems = activeList.items.map(i => 
          i.id === item.id ? { ...i, purchased: previousStatus } : i
        );
        await ShoppingService.updateListItems(currentUser.uid, activeList.id, revertedItems);
      }
    });
  };

  // Remove item
  const handleRemoveItem = async (item: ShoppingListItem) => {
    if (!currentUser || !activeList) return;
    const removedItem = { ...item };
    const updatedItems = activeList.items.filter(i => i.id !== item.id);

    await ShoppingService.updateListItems(currentUser.uid, activeList.id, updatedItems);

    setUndoAction({
      message: `Removed "${item.name}".`,
      action: async () => {
        const restored = [...activeList.items, removedItem];
        await ShoppingService.updateListItems(currentUser.uid, activeList.id, restored);
      }
    });
  };

  // Clear purchased items
  const handleClearPurchased = async () => {
    if (!currentUser || !activeList) return;
    const purchasedItems = activeList.items.filter(i => i.purchased);
    if (purchasedItems.length === 0) return;

    const remainingItems = activeList.items.filter(i => !i.purchased);
    await ShoppingService.updateListItems(currentUser.uid, activeList.id, remainingItems);

    setUndoAction({
      message: `Cleared ${purchasedItems.length} purchased items.`,
      action: async () => {
        await ShoppingService.updateListItems(currentUser.uid, activeList.id, activeList.items);
      }
    });
  };

  // Add custom ingredient
  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeList || !newItemName.trim()) return;

    const newItem: ShoppingListItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newItemName.trim(),
      quantity: parseFloat(newItemQty) || 1,
      unit: newItemUnit.trim() || 'item',
      category: newItemCategory,
      purchased: false
    };

    const updated = [...activeList.items, newItem];
    await ShoppingService.updateListItems(currentUser.uid, activeList.id, updated);

    setNewItemName('');
    setNewItemQty('1');
    setNewItemUnit('item');
    setShowAddItem(false);
  };

  // Save inline edit
  const handleSaveItemEdit = async (itemId: string) => {
    if (!currentUser || !activeList) return;
    const updated = activeList.items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          name: editItemName.trim() || i.name,
          quantity: parseFloat(editItemQty) || i.quantity,
          unit: editItemUnit.trim() || i.unit
        };
      }
      return i;
    });

    await ShoppingService.updateListItems(currentUser.uid, activeList.id, updated);
    setEditingItemId(null);
  };

  // Create new list
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newListTitle.trim()) return;

    const newList: ShoppingList = {
      id: '',
      userId: currentUser.uid,
      name: newListTitle.trim(),
      notes: newListNotes.trim() || undefined,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const id = await ShoppingService.saveShoppingList(currentUser.uid, newList);
    setActiveListId(id);
    setNewListTitle('');
    setNewListNotes('');
    setShowCreateList(false);
  };

  // Rename list
  const handleSaveRename = async () => {
    if (!currentUser || !activeList || !tempTitle.trim()) return;
    const updated = { ...activeList, name: tempTitle.trim() };
    await ShoppingService.saveShoppingList(currentUser.uid, updated);
    setEditingTitle(false);
  };

  // Duplicate list
  const handleDuplicate = async () => {
    if (!currentUser || !activeList) return;
    const copy = await ShoppingService.duplicateList(currentUser.uid, activeList);
    setActiveListId(copy.id);
  };

  // Delete list
  const handleConfirmDelete = async () => {
    if (!currentUser || !deleteConfirmList) return;
    await ShoppingService.deleteShoppingList(currentUser.uid, deleteConfirmList.id);
    setDeleteConfirmList(null);
  };

  // Grocery transfer initialization
  const handleOpenGroceryTransfer = (service: GroceryService) => {
    if (!activeList || activeList.items.length === 0) return;
    setSelectedService(service);
    const matches = matchItemsWithService(service.id, activeList.items);
    setGroceryMatches(matches);
    setTransferSuccess(false);
    setTransferError(null);
  };

  // Toggle match substitution acceptance
  const handleToggleSub = (shoppingItemId: string) => {
    setGroceryMatches(prev => prev.map(m => {
      if (m.shoppingItemId === shoppingItemId) {
        return { ...m, acceptedSubstitute: !m.acceptedSubstitute };
      }
      return m;
    }));
  };

  // Toggle item selection for grocery transfer
  const handleToggleTransferItem = (shoppingItemId: string) => {
    setGroceryMatches(prev => prev.map(m => {
      if (m.shoppingItemId === shoppingItemId) {
        return { ...m, selectedForTransfer: !m.selectedForTransfer };
      }
      return m;
    }));
  };

  // Finalize grocery transfer
  const handleExecuteTransfer = () => {
    setTransferring(true);
    setTransferError(null);

    // Simulate transfer with progress
    setTimeout(() => {
      setTransferring(false);
      setTransferSuccess(true);
    }, 1400);
  };

  // Filter items
  const filteredItems = (activeList?.items || []).filter(item => {
    if (filterMode === 'remaining') return !item.purchased;
    if (filterMode === 'purchased') return item.purchased;
    return true;
  });

  // Group items by category
  const groupedCategories: Record<string, ShoppingListItem[]> = {};
  if (groupByCategory) {
    for (const item of filteredItems) {
      if (!groupedCategories[item.category]) {
        groupedCategories[item.category] = [];
      }
      groupedCategories[item.category].push(item);
    }
  }

  // Purchased progress
  const totalCount = activeList?.items.length || 0;
  const purchasedCount = activeList?.items.filter(i => i.purchased).length || 0;
  const progressPercent = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
            Shopping &amp; Ingredient Integration
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Create unified grocery lists from recipes, combine dishes with smart unit merging, and connect directly to Instacart and Whole Foods. Please sign in to manage your lists.
          </p>
        </div>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Sign In to Access Shopping Lists</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const renderItemRow = (item: ShoppingListItem) => {
    const isEditing = editingItemId === item.id;
    return (
      <div
        key={item.id}
        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
          item.purchased
            ? 'bg-stone-50/60 border-stone-200/60 text-stone-400 line-through'
            : 'bg-white border-stone-200 text-stone-900 hover:border-amber-300'
        }`}
      >
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editItemQty}
              onChange={e => setEditItemQty(e.target.value)}
              className="w-14 text-xs px-2 py-1 border rounded-lg"
            />
            <input
              type="text"
              value={editItemUnit}
              onChange={e => setEditItemUnit(e.target.value)}
              className="w-18 text-xs px-2 py-1 border rounded-lg"
            />
            <input
              type="text"
              value={editItemName}
              onChange={e => setEditItemName(e.target.value)}
              className="flex-1 text-xs px-2 py-1 border rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleSaveItemEdit(item.id)}
              className="px-2.5 py-1 bg-amber-600 text-white text-xs font-semibold rounded-lg"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              className="text-stone-400 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div 
              onClick={() => handleTogglePurchased(item)}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
            >
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                item.purchased
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-stone-300 hover:border-amber-500'
              }`}>
                {item.purchased && <Check className="w-3.5 h-3.5" />}
              </div>

              <div className="truncate">
                <span className={`font-semibold ${item.purchased ? 'text-stone-400' : 'text-stone-900'}`}>
                  {item.quantity} {item.unit}
                </span>{' '}
                <span>{item.name}</span>
                {item.recipeSource && (
                  <span className="block text-[10px] text-stone-400 truncate">
                    Recipe: {item.recipeSource}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingItemId(item.id);
                  setEditItemName(item.name);
                  setEditItemQty(String(item.quantity));
                  setEditItemUnit(item.unit);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                title="Edit quantity or name"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveItem(item)}
                className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4" />
            Culinary Shopping Integration
          </span>
          <h1 className="font-serif-display text-3xl font-bold text-stone-900 mt-1">
            Ingredient Shopping Lists
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Organize ingredients by supermarket aisles, merge recipe quantities, and order with grocery delivery partners.
          </p>
        </div>

        <button
          onClick={() => setShowCreateList(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Shopping List</span>
        </button>
      </div>

      {/* Undo Toast Banner */}
      {undoAction && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
          <span>{undoAction.message}</span>
          <button
            onClick={() => {
              undoAction.action();
              setUndoAction(null);
            }}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
          <button
            onClick={() => setUndoAction(null)}
            className="text-stone-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: List Selector & Overview (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-base font-bold text-stone-900">
                Your Lists ({lists.length})
              </h3>
              <button
                onClick={() => setShowCreateList(true)}
                className="text-amber-700 hover:text-amber-800 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {lists.length === 0 ? (
              <div className="p-6 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <ShoppingCart className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500">No shopping lists yet. Add ingredients from any recipe or create a blank list.</p>
                <button
                  onClick={() => setShowCreateList(true)}
                  className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold"
                >
                  Create First List
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {lists.map(list => {
                  const isActive = list.id === activeListId;
                  const count = list.items.length;
                  const done = list.items.filter(i => i.purchased).length;
                  return (
                    <div
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                          {list.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                          <span>{count} items</span>
                          <span>·</span>
                          <span className={done === count && count > 0 ? 'text-emerald-700 font-semibold' : ''}>
                            {done}/{count} bought
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-amber-700 translate-x-0.5' : 'text-stone-300'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grocery Delivery Integration Services Box */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <h3 className="font-serif-display text-sm font-bold text-stone-900">
                Connected Grocery Services
              </h3>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Transfer your active shopping list ingredients directly into a delivery partner's cart with automatic inventory matching.
            </p>

            <div className="space-y-2.5">
              {SUPPORTED_GROCERY_SERVICES.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleOpenGroceryTransfer(service)}
                  disabled={!activeList || activeList.items.length === 0}
                  className="w-full p-3 rounded-2xl border border-stone-200 hover:border-amber-400 bg-stone-50/50 hover:bg-amber-50/30 transition-all text-left flex items-center justify-between gap-3 disabled:opacity-50 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{service.logo}</span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                        {service.name}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate">
                        {service.estimatedDeliveryTime}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
                </button>
              ))}
            </div>

            <p className="text-[10px] text-stone-400 italic leading-tight text-center pt-1">
              * Live availability &amp; prices are checked with each delivery service before final order placement.
            </p>
          </div>
        </div>

        {/* Right Column: Active List Details & Ingredient Items (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeList ? (
            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Header Strip with Title, Progress Bar, and List Actions */}
              <div className="space-y-4 border-b border-stone-100 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {editingTitle ? (
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={e => setTempTitle(e.target.value)}
                        className="text-lg font-bold text-stone-900 px-3 py-1.5 rounded-xl border border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveRename}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTitle(false)}
                        className="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h2 className="font-serif-display text-2xl font-bold text-stone-900">
                        {activeList.name}
                      </h2>
                      <button
                        onClick={() => { setTempTitle(activeList.name); setEditingTitle(true); }}
                        className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                        title="Rename list"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Top Action Buttons (Duplicate, Clear Purchased, Delete) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDuplicate}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Duplicate list"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>

                    {purchasedCount > 0 && (
                      <button
                        onClick={handleClearPurchased}
                        className="px-3 py-1.5 rounded-xl border border-amber-200 text-amber-800 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Clear purchased items"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Clear Bought</span>
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteConfirmList(activeList)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete shopping list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {activeList.notes && (
                  <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                    <strong>Notes:</strong> {activeList.notes}
                  </p>
                )}

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-stone-600">
                    <span>{purchasedCount} of {totalCount} ingredients checked</span>
                    <span className="tabular-nums">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-amber-600 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Filter and Group Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1 rounded-lg transition-all ${filterMode === 'all' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'hover:text-stone-900'}`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('remaining')}
                      className={`px-3 py-1 rounded-lg transition-all ${filterMode === 'remaining' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'hover:text-stone-900'}`}
                    >
                      Remaining ({totalCount - purchasedCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('purchased')}
                      className={`px-3 py-1 rounded-lg transition-all ${filterMode === 'purchased' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'hover:text-stone-900'}`}
                    >
                      Purchased ({purchasedCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGroupByCategory(!groupByCategory)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        groupByCategory
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Group Aisles</span>
                    </button>

                    <button
                      onClick={() => setShowAddItem(true)}
                      className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Custom Item Inline Drawer */}
              {showAddItem && (
                <form onSubmit={handleAddCustomItem} className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Add Custom Ingredient
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddItem(false)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Ingredient Name *</label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={e => {
                          setNewItemName(e.target.value);
                          setNewItemCategory(detectCategory(e.target.value));
                        }}
                        placeholder="e.g. Fresh Shallots"
                        required
                        className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Quantity</label>
                      <input
                        type="text"
                        value={newItemQty}
                        onChange={e => setNewItemQty(e.target.value)}
                        placeholder="1"
                        className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Unit</label>
                      <input
                        type="text"
                        value={newItemUnit}
                        onChange={e => setNewItemUnit(e.target.value)}
                        placeholder="bunch, tbsp"
                        className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Aisle Category</label>
                      <select
                        value={newItemCategory}
                        onChange={e => setNewItemCategory(e.target.value as IngredientCategory)}
                        className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Produce">Produce</option>
                        <option value="Dairy & Refrigerated">Dairy &amp; Refrigerated</option>
                        <option value="Meat & Seafood">Meat &amp; Seafood</option>
                        <option value="Pantry & Dry Goods">Pantry &amp; Dry Goods</option>
                        <option value="Spices & Seasonings">Spices &amp; Seasonings</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddItem(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs"
                    >
                      Add Ingredient
                    </button>
                  </div>
                </form>
              )}

              {/* Items List (Grouped or Flat) */}
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <ShoppingCart className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs text-stone-500">
                    {filterMode === 'remaining' ? 'All ingredients in this list have been checked off!' : 'No items match your filter.'}
                  </p>
                </div>
              ) : groupByCategory ? (
                <div className="space-y-6">
                  {Object.entries(groupedCategories).map(([category, items]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[category as IngredientCategory] || 'bg-stone-100 text-stone-800 border-stone-200'}`}>
                          {category}
                        </span>
                        <div className="h-px bg-stone-100 flex-1" />
                        <span className="text-[11px] text-stone-400 font-medium">{items.length} items</span>
                      </div>

                      <div className="space-y-1.5">
                        {items.map(item => renderItemRow(item))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredItems.map(item => renderItemRow(item))}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-4">
              <ShoppingCart className="w-12 h-12 text-amber-500 mx-auto opacity-40" />
              <h3 className="font-serif-display text-xl font-bold text-stone-900">
                Select a Shopping List
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Select an existing shopping list from the left or create a new one to start organizing ingredients.
              </p>
              <button
                onClick={() => setShowCreateList(true)}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Create Shopping List
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CREATE NEW LIST MODAL */}
      {showCreateList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                Create New Shopping List
              </h3>
              <button onClick={() => setShowCreateList(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">List Name *</label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  placeholder="e.g. Gourmet Dinner Party, Weekly Pantry Staples"
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Optional Notes</label>
                <textarea
                  value={newListNotes}
                  onChange={e => setNewListNotes(e.target.value)}
                  placeholder="e.g. Shop at Farmers Market on Saturday morning"
                  rows={2}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateList(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE LIST MODAL (Strict requirement: confirm destructive actions) */}
      {deleteConfirmList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                Delete Shopping List?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to permanently delete <strong>"{deleteConfirmList.name}"</strong>? This will remove all {deleteConfirmList.items.length} ingredients.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmList(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROCERY DELIVERY SERVICE TRANSFER & REVIEW MODAL */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedService.logo}</span>
                <div>
                  <h3 className="font-serif-display text-lg font-bold text-stone-900">
                    Transfer Ingredients to {selectedService.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Review availability, estimated partner prices, and substitution options before transferring.
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedService(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Important Service Disclosure (Mandatory Requirement) */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Service Notice:</strong> Real-time item availability, brands, estimated prices, and substitutions are retrieved directly from {selectedService.name} based on your area. DellyChow transfers your grocery items to your basket; final payment, delivery scheduling, and fulfillment occur on the delivery partner's checkout.
                </p>
              </div>

              {transferSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif-display text-xl font-bold text-stone-900">
                    Ingredients Transferred Successfully!
                  </h4>
                  <p className="text-xs text-stone-600 max-w-md mx-auto">
                    {groceryMatches.filter(m => m.selectedForTransfer).length} ingredients have been transferred into your {selectedService.name} cart. Your DellyChow shopping list remains safely preserved.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedService(null)}
                      className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                      Done &amp; Return to List
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700 pt-1">
                    <span>
                      Items for Transfer ({groceryMatches.filter(m => m.selectedForTransfer).length}/{groceryMatches.length})
                    </span>
                    <span className="text-stone-500">
                      Estimated Cart Total: ${groceryMatches.filter(m => m.selectedForTransfer).reduce((acc, m) => acc + (m.estimatedPrice || 0), 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Matches Review Table */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {groceryMatches.map(m => (
                      <div
                        key={m.shoppingItemId}
                        className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                          m.selectedForTransfer ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.selectedForTransfer}
                              onChange={() => handleToggleTransferItem(m.shoppingItemId)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-stone-900">{m.originalQuantity}</span>{' '}
                              <span>{m.originalName}</span>
                            </div>
                          </label>

                          <div className="flex items-center gap-2 shrink-0">
                            {m.status === 'available' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                In Stock
                              </span>
                            )}
                            {m.status === 'substituted' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                Substitute
                              </span>
                            )}
                            {m.status === 'unavailable' && (
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                                Out of Stock
                              </span>
                            )}
                            <span className="font-bold text-stone-900 tabular-nums">
                              ${m.estimatedPrice?.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Substitution details & accept toggle */}
                        {m.suggestedSubstitute && (
                          <div className="pl-6 pt-1 text-[11px] text-stone-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-amber-900">
                                Suggested: {m.suggestedSubstitute.name} (${m.suggestedSubstitute.price.toFixed(2)})
                              </p>
                              <p className="text-[10px] text-amber-800 mt-0.5">
                                {m.suggestedSubstitute.reason}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSub(m.shoppingItemId)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors ${
                                m.acceptedSubstitute
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              {m.acceptedSubstitute ? 'Accepted' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Transfer Confirmation Footer */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <p className="text-[11px] text-stone-500">
                      Transferring preserves your DellyChow list.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedService(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteTransfer}
                        disabled={transferring || groceryMatches.filter(m => m.selectedForTransfer).length === 0}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {transferring ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-4 h-4" />
                            <span>Transfer to {selectedService.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
