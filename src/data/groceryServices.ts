import { GroceryService, GroceryMatchItem, ShoppingListItem } from '../types';

export const SUPPORTED_GROCERY_SERVICES: GroceryService[] = [
  {
    id: 'instacart',
    name: 'Instacart Local Delivery',
    logo: '🥕',
    tagline: 'Connects to your neighborhood grocery stores and supermarkets for same-day delivery.',
    supported: true,
    estimatedDeliveryTime: 'Within 2 hours'
  },
  {
    id: 'whole_foods',
    name: 'Whole Foods Market',
    logo: '🌿',
    tagline: 'Prime organic produce, artisanal European cheeses, and ethically sourced meats.',
    supported: true,
    estimatedDeliveryTime: 'Today by 5:00 PM'
  },
  {
    id: 'amazon_fresh',
    name: 'Amazon Fresh Groceries',
    logo: '📦',
    tagline: 'Direct grocery delivery with pantry bundles, everyday staples, and chilled essentials.',
    supported: true,
    estimatedDeliveryTime: 'Tomorrow morning'
  },
  {
    id: 'kroger',
    name: 'Kroger Fresh Market',
    logo: '🛒',
    tagline: 'Direct from regional farms, artisan bakery items, and budget-friendly household packs.',
    supported: true,
    estimatedDeliveryTime: 'Standard next-day delivery'
  }
];

/**
 * Matches shopping list items to a mock delivery service inventory.
 * Provides realistic availability, estimated prices, and suggested substitutions.
 */
export function matchItemsWithService(serviceId: string, items: ShoppingListItem[]): GroceryMatchItem[] {
  return items.map((item, index) => {
    const rawLower = item.name.toLowerCase();
    const qtyStr = `${item.quantity} ${item.unit}`.trim();

    // 1. Determine realistic availability & substitutions
    if (rawLower.includes('truffle') || rawLower.includes('caviar') || rawLower.includes('saffron')) {
      if (serviceId === 'whole_foods') {
        return {
          shoppingItemId: item.id,
          originalName: item.name,
          originalQuantity: qtyStr,
          matchedName: 'Tartufi Morra Italian Black Winter Truffles (Preserved in Brine)',
          matchedBrand: 'Tartufi Morra',
          status: 'available',
          selectedForTransfer: true,
          estimatedPrice: 28.50
        };
      } else {
        return {
          shoppingItemId: item.id,
          originalName: item.name,
          originalQuantity: qtyStr,
          matchedName: 'Urbani White Truffle Infused Extra Virgin Olive Oil (100ml)',
          matchedBrand: 'Urbani Tartufi',
          status: 'substituted',
          suggestedSubstitute: {
            name: 'Urbani White Truffle Infused Extra Virgin Olive Oil',
            brand: 'Urbani Tartufi',
            price: 16.99,
            reason: 'Fresh truffles are currently out of stock locally; high-grade finishing oil suggested.'
          },
          acceptedSubstitute: true,
          selectedForTransfer: true,
          estimatedPrice: 16.99
        };
      }
    }

    if (rawLower.includes('tipo 00') || rawLower.includes('tagliatelle')) {
      return {
        shoppingItemId: item.id,
        originalName: item.name,
        originalQuantity: qtyStr,
        matchedName: 'Caputo Tipo 00 Italian Superiore Wheat Flour (1kg)',
        matchedBrand: 'Caputo 1884',
        status: 'available',
        selectedForTransfer: true,
        estimatedPrice: 5.49
      };
    }

    if (rawLower.includes('butter') || rawLower.includes('cultured')) {
      return {
        shoppingItemId: item.id,
        originalName: item.name,
        originalQuantity: qtyStr,
        matchedName: 'Kerrygold Pure Irish Grass-Fed Unsalted Butter (8 oz)',
        matchedBrand: 'Kerrygold',
        status: 'available',
        selectedForTransfer: true,
        estimatedPrice: 4.89
      };
    }

    if (rawLower.includes('parmigiano') || rawLower.includes('parmesan')) {
      return {
        shoppingItemId: item.id,
        originalName: item.name,
        originalQuantity: qtyStr,
        matchedName: 'Parmigiano-Reggiano DOP 24-Month Aged Wedge (7 oz)',
        matchedBrand: 'Zanetti DOP',
        status: 'available',
        selectedForTransfer: true,
        estimatedPrice: 8.99
      };
    }

    if (rawLower.includes('salmon') || rawLower.includes('fillet')) {
      return {
        shoppingItemId: item.id,
        originalName: item.name,
        originalQuantity: qtyStr,
        matchedName: 'Wild-Caught Alaskan Sockeye Salmon Portions (Skin-on, 12 oz)',
        matchedBrand: 'Pacific Catch',
        status: 'available',
        selectedForTransfer: true,
        estimatedPrice: 14.50
      };
    }

    if (rawLower.includes('parsley') || rawLower.includes('garlic') || rawLower.includes('onion') || rawLower.includes('shallot')) {
      return {
        shoppingItemId: item.id,
        originalName: item.name,
        originalQuantity: qtyStr,
        matchedName: `Organic Fresh ${item.name}`,
        matchedBrand: 'Organic Valley Fresh',
        status: 'available',
        selectedForTransfer: true,
        estimatedPrice: 2.29
      };
    }

    // Default general item matching
    const basePrice = Math.round((2.5 + (index % 5) * 1.5) * 100) / 100;
    return {
      shoppingItemId: item.id,
      originalName: item.name,
      originalQuantity: qtyStr,
      matchedName: item.name,
      matchedBrand: 'Market Pantry Selected',
      status: 'available',
      selectedForTransfer: true,
      estimatedPrice: basePrice
    };
  });
}
