import { Recipe, CookingVideo } from '../types';

export const DUMMY_ACCOUNT_IDS = new Set([
  'chef-david-chen',
  'user-clara-gomez',
  'user-elena-rossi',
  'user-sam-miller',
]);

export const DUMMY_ACCOUNT_NAMES = new Set([
  'Chef David Chen',
  'Chef Clara Gomez',
  'Clara Gomez',
  'Elena Rossi',
  'Sam Miller',
]);

export const AI_STARTER_RECIPE_TITLES = new Set([
  'Handmade Truffle Tagliatelle al Parmigiano',
  'Crispy Skin Pan-Seared Salmon & Quinoa Bowl',
  'Artisanal French Raspberry & Creme Tart',
]);

export function isDummyOrAiAccountId(userId?: string | null): boolean {
  if (!userId) return false;
  return DUMMY_ACCOUNT_IDS.has(userId.trim());
}

export function isSeededAiRecipe(recipe: Partial<Recipe>): boolean {
  if (isDummyOrAiAccountId(recipe.authorId)) return true;
  if (recipe.authorName && DUMMY_ACCOUNT_NAMES.has(recipe.authorName.trim())) return true;
  if (
    recipe.title &&
    AI_STARTER_RECIPE_TITLES.has(recipe.title.trim()) &&
    (!recipe.videoUrl || recipe.videoUrl.includes('dQw4w9WgXcQ'))
  ) {
    return true;
  }
  return false;
}

export const STARTER_RECIPES: Omit<Recipe, 'id' | 'authorId' | 'createdAt'>[] = [];

export const STARTER_VIDEOS: Omit<CookingVideo, 'id' | 'authorId' | 'createdAt'>[] = [];


