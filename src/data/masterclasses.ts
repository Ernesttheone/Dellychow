import { Masterclass } from '../types';
import { ASSET_IMAGES } from '../assets/images';

export const STARTER_MASTERCLASSES: Masterclass[] = [
  {
    id: 'mc-pasta-truffle',
    chefId: 'chef-david-chen',
    chefName: 'Chef David Chen',
    chefPhoto: ASSET_IMAGES.chefAvatar,
    chefSpecialty: 'Handmade Pasta & French Bistro Pastry',
    title: 'Artisanal Handmade Pasta & Winter Truffle Emulsion',
    topic: 'Fresh Pasta Dough Chemistry & Emulsified Pan Sauces',
    schedule: 'Saturday, Nov 15 · 3:00 PM CET (Live 90 mins)',
    date: '2025-11-15',
    time: '15:00 CET',
    durationMinutes: 90,
    description: 'An exclusive, interactive live masterclass where Chef David guides participants through moisture control, gluten development, and hand-rolling without machine compression. Learn how starchy pasta water bonds with aged Parmigiano and cultured butter.',
    price: 19.99,
    currency: 'USD',
    maxParticipants: 25,
    currentParticipants: 18,
    imageUrl: ASSET_IMAGES.trufflePasta,
    prerequisites: [
      'Tipo 00 flour and free-range egg yolks',
      'Wooden rolling pin or bench scraper',
      'Sauté pan with sloping sides'
    ],
    isPremiumOnly: true
  },
  {
    id: 'mc-salmon-pan-sauces',
    chefId: 'chef-david-chen',
    chefName: 'Chef David Chen',
    chefPhoto: ASSET_IMAGES.chefAvatar,
    chefSpecialty: 'Handmade Pasta & French Bistro Pastry',
    title: 'Michelin Pan-Seared Salmon & Citrus Beurre Blanc',
    topic: 'High-Heat Seafood Searing & Classical Butter Reductions',
    schedule: 'Sunday, Nov 23 · 5:00 PM CET (Live 75 mins)',
    date: '2025-11-23',
    time: '17:00 CET',
    durationMinutes: 75,
    description: 'Discover how top bistros achieve paper-thin, glass-like crispy salmon skin while preserving melt-in-your-mouth medium-rare centers. Followed by a live reduction of shallots, white wine, and cold cubed butter.',
    price: 24.99,
    currency: 'USD',
    maxParticipants: 20,
    currentParticipants: 12,
    imageUrl: ASSET_IMAGES.salmonBowl,
    prerequisites: [
      'Heavy stainless steel or carbon steel skillet',
      'High smoke point oil (avocado or grape seed)',
      'Fish spatula'
    ],
    isPremiumOnly: true
  },
  {
    id: 'mc-pastry-souffle',
    chefId: 'chef-david-chen',
    chefName: 'Chef David Chen',
    chefPhoto: ASSET_IMAGES.chefAvatar,
    chefSpecialty: 'Handmade Pasta & French Bistro Pastry',
    title: 'French Pâtisserie: Grand Marnier & Chocolate Soufflés',
    topic: 'Aerated Egg White Structures & Ramekin Preparation',
    schedule: 'Friday, Dec 05 · 6:30 PM CET (Live 60 mins)',
    date: '2025-12-05',
    time: '18:30 CET',
    durationMinutes: 60,
    description: 'Overcome the fear of deflated soufflés. Learn the vertical buttering technique, sugar coating method, and temperature ramp required for a dramatic, cloud-like rise with a molten center.',
    price: 14.99,
    currency: 'USD',
    maxParticipants: 30,
    currentParticipants: 21,
    imageUrl: ASSET_IMAGES.berryTart,
    prerequisites: [
      'Ceramic ramekins',
      'Electric hand mixer or copper bowl with balloon whisk',
      'High-percentage dark chocolate'
    ],
    isPremiumOnly: true
  }
];
