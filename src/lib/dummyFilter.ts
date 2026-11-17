export const DUMMY_ACCOUNT_IDS = new Set([
  'chef-david-chen',
  'user-elena-rossi',
  'user-sam-miller',
  'user-clara-gomez',
  'chef-marcus-vance',
  'chef-clara-gomez',
]);

export const DUMMY_ACCOUNT_NAMES = new Set([
  'chef david chen',
  'david chen',
  'elena rossi',
  'sam miller',
  'chef clara gomez',
  'clara gomez',
  'chef marcus vance',
  'marcus vance',
]);

export const AI_STARTER_RECIPE_TITLES = new Set([
  'handmade truffle tagliatelle al parmigiano',
  'crispy skin pan-seared salmon & quinoa bowl',
  'artisanal french raspberry & creme tart',
]);

export const DUMMY_CHALLENGE_ENTRY_IDS = new Set([
  'entry-pasta-marcus',
  'entry-pasta-elena',
  'entry-sear-sam',
  'entry-berry-clara',
]);

export const DUMMY_BADGE_IDS = new Set(['badge-1', 'badge-2']);

export function isDummyAccount(account?: {
  id?: string;
  userId?: string;
  authorId?: string;
  displayName?: string;
  name?: string;
  authorName?: string;
  userName?: string;
  email?: string;
  isAi?: boolean;
  isDummy?: boolean;
} | null): boolean {
  if (!account) return false;
  if (account.isAi || account.isDummy) return true;

  const ids = [account.id, account.userId, account.authorId]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());
  if (ids.some((id) => DUMMY_ACCOUNT_IDS.has(id) || id.startsWith('dummy-') || id.startsWith('ai-'))) {
    return true;
  }

  const names = [account.displayName, account.name, account.authorName, account.userName]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());
  if (names.some((name) => DUMMY_ACCOUNT_NAMES.has(name))) {
    return true;
  }

  if (typeof account.email === 'string') {
    const email = account.email.trim().toLowerCase();
    if (email.endsWith('@dellychow-demo.local') || email.includes('dummy@')) {
      return true;
    }
  }

  return false;
}

export function isDummyOrAiRecipe(recipe?: {
  id?: string;
  title?: string;
  authorId?: string;
  authorName?: string;
  videoUrl?: string;
  isAi?: boolean;
  isDummy?: boolean;
  isStarter?: boolean;
} | null): boolean {
  if (!recipe) return false;
  if (recipe.isAi || recipe.isDummy || recipe.isStarter) return true;
  if (isDummyAccount({ id: recipe.authorId, authorName: recipe.authorName })) return true;

  const title = (recipe.title || '').trim().toLowerCase();
  if (AI_STARTER_RECIPE_TITLES.has(title)) return true;

  if (recipe.videoUrl === 'https://www.youtube.com/embed/dQw4w9WgXcQ') return true;
  return false;
}

export function isDummyOrAiVideo(video?: {
  id?: string;
  title?: string;
  authorId?: string;
  authorName?: string;
  videoUrl?: string;
  isAi?: boolean;
  isDummy?: boolean;
  isStarter?: boolean;
} | null): boolean {
  if (!video) return false;
  if (video.isAi || video.isDummy || video.isStarter) return true;
  if (isDummyAccount({ id: video.authorId, authorName: video.authorName })) return true;
  if (video.videoUrl === 'https://www.youtube.com/embed/dQw4w9WgXcQ') return true;
  return false;
}
