import { IngredientCategory, ShoppingListItem } from '../types';

/**
 * Normalizes an ingredient name for smart matching (e.g. "unsalted cultured butter" -> "butter")
 */
export function normalizeIngredientName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[,\(\)\.\*\d\/]/g, '')
    .replace(/\b(fresh|organic|ripe|chopped|diced|minced|sliced|peeled|grated|melted|crushed|warm|cold|salted|unsalted|extra virgin|fine|pure)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standardizes units for comparison and compatible summing
 */
export function normalizeUnit(rawUnit: string): string {
  const u = rawUnit.toLowerCase().trim();
  if (['g', 'gram', 'grams'].includes(u)) return 'g';
  if (['kg', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'milliliters'].includes(u)) return 'ml';
  if (['l', 'liter', 'liters'].includes(u)) return 'L';
  if (['oz', 'ounce', 'ounces'].includes(u)) return 'oz';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) return 'lb';
  if (['tbsp', 'tablespoon', 'tablespoons', 'tbs'].includes(u)) return 'tbsp';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'tsp';
  if (['cup', 'cups'].includes(u)) return 'cup';
  if (['clove', 'cloves'].includes(u)) return 'cloves';
  if (['bunch', 'bunches'].includes(u)) return 'bunch';
  if (['pinch', 'pinches'].includes(u)) return 'pinch';
  if (['slice', 'slices'].includes(u)) return 'slices';
  if (['piece', 'pieces', 'pc', 'pcs'].includes(u)) return 'pcs';
  if (['can', 'cans'].includes(u)) return 'can';
  if (['stalk', 'stalks'].includes(u)) return 'stalks';
  return u;
}

/**
 * Detects ingredient category based on culinary keywords
 */
export function detectCategory(ingredientText: string): IngredientCategory {
  const t = ingredientText.toLowerCase();

  if (
    t.includes('salmon') || t.includes('tuna') || t.includes('cod') || t.includes('shrimp') ||
    t.includes('prawn') || t.includes('beef') || t.includes('steak') || t.includes('chicken') ||
    t.includes('pork') || t.includes('bacon') || t.includes('prosciutto') || t.includes('lamb') ||
    t.includes('duck') || t.includes('turkey') || t.includes('fish') || t.includes('seafood')
  ) {
    return 'Meat & Seafood';
  }

  if (
    t.includes('butter') || t.includes('cream') || t.includes('parmigiano') || t.includes('parmesan') ||
    t.includes('cheese') || t.includes('milk') || t.includes('yogurt') || t.includes('egg') ||
    t.includes('ricotta') || t.includes('mozzarella') || t.includes('cheddar') || t.includes('mascarpone')
  ) {
    return 'Dairy & Refrigerated';
  }

  if (
    t.includes('garlic') || t.includes('onion') || t.includes('shallot') || t.includes('parsley') ||
    t.includes('basil') || t.includes('rosemary') || t.includes('thyme') || t.includes('cilantro') ||
    t.includes('lemon') || t.includes('lime') || t.includes('orange') || t.includes('tomato') ||
    t.includes('potato') || t.includes('avocado') || t.includes('ginger') || t.includes('scallion') ||
    t.includes('spinach') || t.includes('mushroom') || t.includes('arugula') || t.includes('lettuce') ||
    t.includes('carrot') || t.includes('celery') || t.includes('cucumber') || t.includes('berry') ||
    t.includes('berries') || t.includes('apple') || t.includes('chive') || t.includes('zucchini')
  ) {
    return 'Produce';
  }

  if (
    t.includes('salt') || t.includes('pepper') || t.includes('truffle') || t.includes('paprika') ||
    t.includes('cinnamon') || t.includes('nutmeg') || t.includes('oregano') || t.includes('cumin') ||
    t.includes('coriander') || t.includes('bay leaf') || t.includes('vanilla') || t.includes('curry') ||
    t.includes('chili flakes') || t.includes('saffron') || t.includes('peppercorn')
  ) {
    return 'Spices & Seasonings';
  }

  if (
    t.includes('bread') || t.includes('baguette') || t.includes('brioche') || t.includes('croissant') ||
    t.includes('dough') || t.includes('crust') || t.includes('bun') || t.includes('pita')
  ) {
    return 'Bakery';
  }

  if (
    t.includes('wine') || t.includes('broth') || t.includes('stock') || t.includes('coffee') ||
    t.includes('tea') || t.includes('juice') || t.includes('cider') || t.includes('beer')
  ) {
    return 'Beverages';
  }

  return 'Pantry & Dry Goods';
}

/**
 * Parses raw ingredient string into structured quantity, unit, name, and category
 * Examples:
 * - "350g Fresh egg tagliatelle" -> qty: 350, unit: "g", name: "Fresh egg tagliatelle"
 * - "2 tbsp Coarse sea salt" -> qty: 2, unit: "tbsp", name: "Coarse sea salt"
 * - "1/2 cup Heavy cream" -> qty: 0.5, unit: "cup", name: "Heavy cream"
 * - "3 cloves Garlic, minced" -> qty: 3, unit: "cloves", name: "Garlic, minced"
 */
export function parseIngredient(rawText: string, recipeSource?: string, recipeId?: string): ShoppingListItem {
  const trimmed = rawText.trim();
  const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const category = detectCategory(trimmed);

  // Regex for fractions like 1/2, mixed fractions like 1 1/2, or decimals like 2.5
  const match = trimmed.match(/^([\d\s\/\.\-]+)\s*([a-zA-Z]+)?\s+(.*)$/);

  if (match) {
    const rawQty = match[1].trim();
    const rawUnit = match[2] ? match[2].trim() : '';
    const name = match[3].trim();

    // Convert fraction string to decimal number
    let numericQty: number | string = rawQty;
    if (rawQty.includes('/')) {
      const parts = rawQty.split(' ');
      if (parts.length === 2) {
        const whole = parseFloat(parts[0]);
        const [num, den] = parts[1].split('/').map(Number);
        if (den) numericQty = whole + (num / den);
      } else {
        const [num, den] = rawQty.split('/').map(Number);
        if (den) numericQty = num / den;
      }
    } else {
      const parsedNum = parseFloat(rawQty);
      if (!isNaN(parsedNum)) numericQty = parsedNum;
    }

    return {
      id,
      name: name || trimmed,
      quantity: typeof numericQty === 'number' ? Math.round(numericQty * 100) / 100 : numericQty,
      unit: rawUnit ? normalizeUnit(rawUnit) : '',
      category,
      purchased: false,
      recipeSource,
      recipeId
    };
  }

  // Handle unitless items like "Salt to taste", "Fresh parsley"
  return {
    id,
    name: trimmed,
    quantity: 1,
    unit: 'item',
    category,
    purchased: false,
    recipeSource,
    recipeId
  };
}

/**
 * Checks if two units are compatible for safe addition
 */
export function areUnitsCompatible(u1: string, u2: string): boolean {
  const norm1 = normalizeUnit(u1);
  const norm2 = normalizeUnit(u2);
  if (!norm1 && !norm2) return true;
  return norm1 === norm2;
}

/**
 * Combines ingredients across multiple recipes or lists.
 * - Merges duplicates when name and units are compatible.
 * - Retains recipe source attribution (e.g. "Tagliatelle & Salmon Bowl").
 * - Keeps items separate when units cannot be safely combined (e.g. "1 bunch" vs "2 cups").
 */
export function combineIngredients(
  recipeItems: Array<{ recipeTitle: string; recipeId: string; ingredients: string[] }>
): ShoppingListItem[] {
  const parsedList: ShoppingListItem[] = [];

  for (const { recipeTitle, recipeId, ingredients } of recipeItems) {
    for (const raw of ingredients) {
      if (raw && raw.trim()) {
        parsedList.push(parseIngredient(raw, recipeTitle, recipeId));
      }
    }
  }

  const merged: ShoppingListItem[] = [];

  for (const item of parsedList) {
    const itemNormName = normalizeIngredientName(item.name);
    const itemNormUnit = normalizeUnit(item.unit);

    // Look for compatible existing item in merged list
    const existingIndex = merged.findIndex((m) => {
      const mNormName = normalizeIngredientName(m.name);
      const mNormUnit = normalizeUnit(m.unit);

      // Must be same category and essentially same core ingredient
      if (m.category !== item.category) return false;

      const isNameMatch = 
        mNormName === itemNormName ||
        (mNormName.length > 3 && itemNormName.length > 3 && (mNormName.includes(itemNormName) || itemNormName.includes(mNormName)));

      if (!isNameMatch) return false;

      // STRICT REQUIREMENT: Only merge if units can be safely combined
      return areUnitsCompatible(mNormUnit, itemNormUnit);
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const q1 = typeof existing.quantity === 'number' ? existing.quantity : parseFloat(String(existing.quantity)) || 1;
      const q2 = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 1;

      const newQty = Math.round((q1 + q2) * 100) / 100;

      // Combine recipe sources
      const sources = new Set<string>();
      if (existing.recipeSource) sources.add(existing.recipeSource);
      if (item.recipeSource) sources.add(item.recipeSource);

      merged[existingIndex] = {
        ...existing,
        quantity: newQty,
        recipeSource: Array.from(sources).join(' & ')
      };
    } else {
      // Keep distinct if incompatible units or new ingredient
      merged.push({ ...item });
    }
  }

  return merged;
}
