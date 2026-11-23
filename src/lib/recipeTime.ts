import { Recipe } from '../types';

export type CookingTimeFilterId =
  | 'all'
  | 'under-15'
  | '15-30'
  | '30-45'
  | '45-60'
  | 'over-60';

export const COOKING_TIME_FILTERS: Array<{ id: CookingTimeFilterId; label: string }> = [
  { id: 'all', label: 'All Cooking Times' },
  { id: 'under-15', label: 'Under 15 minutes' },
  { id: '15-30', label: '15–30 minutes' },
  { id: '30-45', label: '30–45 minutes' },
  { id: '45-60', label: '45–60 minutes' },
  { id: 'over-60', label: 'Over 1 hour' },
];

const parseValidMinutes = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
};

export interface RecipeTimeBreakdown {
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
}

export function getRecipeTimeBreakdown(
  recipe: Pick<Recipe, 'prepTimeMinutes' | 'cookTimeMinutes'>
): RecipeTimeBreakdown {
  const rawPrep = parseValidMinutes(recipe.prepTimeMinutes);
  const rawCook = parseValidMinutes(recipe.cookTimeMinutes);

  const prepMinutes = rawPrep !== null && rawPrep > 0 ? rawPrep : null;
  const cookMinutes = rawCook !== null && rawCook > 0 ? rawCook : null;

  if (prepMinutes === null && cookMinutes === null) {
    return {
      prepMinutes: null,
      cookMinutes: null,
      totalMinutes: null,
    };
  }

  return {
    prepMinutes,
    cookMinutes,
    totalMinutes: (prepMinutes ?? 0) + (cookMinutes ?? 0),
  };
}

export function getRecipeTotalMinutes(
  recipe: Pick<Recipe, 'prepTimeMinutes' | 'cookTimeMinutes'>
): number | null {
  return getRecipeTimeBreakdown(recipe).totalMinutes;
}

export function formatMinutesLabel(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return 'Time not specified';
  }
  return minutes === 1 ? '1 min' : `${minutes} mins`;
}

export function formatRecipeTotalTime(
  recipe: Pick<Recipe, 'prepTimeMinutes' | 'cookTimeMinutes'>
): string {
  return formatMinutesLabel(getRecipeTotalMinutes(recipe));
}

export function matchesCookingTimeFilter(
  recipe: Pick<Recipe, 'prepTimeMinutes' | 'cookTimeMinutes'>,
  filterId: CookingTimeFilterId
): boolean {
  if (filterId === 'all') return true;
  const total = getRecipeTotalMinutes(recipe);
  if (total === null) return false;

  switch (filterId) {
    case 'under-15':
      return total < 15;
    case '15-30':
      return total >= 15 && total <= 30;
    case '30-45':
      return total >= 30 && total <= 45;
    case '45-60':
      return total >= 45 && total <= 60;
    case 'over-60':
      return total > 60;
    default:
      return true;
  }
}
