import { Challenge, ChallengeEntry, UserBadge } from '../types';
import { ASSET_IMAGES } from '../assets/images';

export const STARTER_CHALLENGES: Challenge[] = [
  {
    id: 'ch-winter-pasta',
    title: 'Winter Truffle & Hand-Rolled Pasta Showdown',
    theme: 'Fresh Pasta Dough Chemistry & Emulsified Pan Sauces',
    description: 'Showcase your finest handmade pasta rolled without machine compression. Balance delicate yolk-rich dough with a rich, glossy emulsified butter or truffle pan sauce. Judged on pasta texture, sauce sheen, and elegant plating.',
    coverImage: ASSET_IMAGES.trufflePasta,
    type: 'monthly',
    status: 'active',
    startDate: '2026-11-01T00:00:00.000Z',
    submissionDeadline: '2026-11-20T23:59:59.000Z',
    votingPeriodStart: '2026-11-21T00:00:00.000Z',
    votingPeriodEnd: '2026-11-28T23:59:59.000Z',
    rules: [
      'Pasta must be mixed, kneaded, and shaped by hand (tagliatelle, pappardelle, agnolotti, or tortellini).',
      'At least one photo must show the rolling process or raw shaped pasta, plus the final plated dish.',
      'Sauce must be an emulsion (butter, pasta water, or olive oil based).',
      'Dish must be cooked and photographed by you.'
    ],
    requiredIngredients: ['Flour (Tipo 00 or Semolina)', 'Egg Yolks or Water', 'Fat for emulsion (butter or olive oil)'],
    formatRequirements: '1 to 4 high-resolution photos or a video clip under 90 seconds showing pasta texture and plated dish.',
    prizes: {
      firstPlace: '$250 Artisanal Culinary Supply Voucher + Official Chef Feature',
      secondPlace: '$100 DellyChow Pantry Gift Box',
      thirdPlace: '1-Year VIP Kitchen Circle Membership'
    },
    badgesAwarded: {
      participation: 'Pasta Artisan Guild',
      winner: 'Grand Truffle Virtuoso'
    },
    entryCount: 0,
    voteCount: 0,
    createdAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'ch-golden-sear',
    title: 'The Golden Crust: Master Pan Searing',
    theme: 'High-Heat Protein Searing & Crisp Edge Mastery',
    description: 'Capture the ultimate sear on seafood, poultry, or steak. Achieve a uniform, golden-amber crust without overcooking the center. Demonstrate moisture control and pan temperature regulation.',
    coverImage: ASSET_IMAGES.salmonBowl,
    type: 'weekly',
    status: 'active',
    startDate: '2026-11-03T00:00:00.000Z',
    submissionDeadline: '2026-11-10T23:59:59.000Z',
    votingPeriodStart: '2026-11-11T00:00:00.000Z',
    votingPeriodEnd: '2026-11-14T23:59:59.000Z',
    rules: [
      'Protein must have a visible high-heat sear or crispy skin (salmon, scallops, chicken thigh, or steak).',
      'Provide a cross-section cut photo showing internal doneness.',
      'List your cooking fat and skillet type in the caption.'
    ],
    requiredIngredients: ['Protein of choice', 'High smoke point oil or clarified butter', 'Coarse finishing salt'],
    formatRequirements: 'Photos or video showing the sizzling pan sear and the sliced internal temperature.',
    prizes: {
      firstPlace: '$150 Hand-Forged Carbon Steel Sauté Skillet',
      secondPlace: '$50 Specialty Finishing Salts Collection'
    },
    badgesAwarded: {
      participation: 'Searing Apprentice',
      winner: 'Golden Sear Master'
    },
    entryCount: 0,
    voteCount: 0,
    createdAt: '2026-11-03T08:00:00.000Z'
  },
  {
    id: 'ch-sourdough-crumb',
    title: 'Artisanal Sourdough & Hearth Breads',
    theme: 'Natural Fermentation, Blistered Crust & Open Crumb',
    description: 'Community voting is now open! Browse the eligible bakers who submitted their wild yeast sourdough loaves, baguettes, and boules.',
    coverImage: ASSET_IMAGES.heroCooking,
    type: 'weekly',
    status: 'voting',
    startDate: '2026-10-25T00:00:00.000Z',
    submissionDeadline: '2026-11-02T23:59:59.000Z',
    votingPeriodStart: '2026-11-03T00:00:00.000Z',
    votingPeriodEnd: '2026-11-08T23:59:59.000Z',
    rules: [
      'Naturally leavened with wild sourdough starter (no commercial yeast).',
      'Crumb shot required alongside full loaf.'
    ],
    prizes: {
      firstPlace: 'Cast-Iron Bread Oven Cloche + Banneton Proofing Kit',
      secondPlace: 'Stoneground Heritage Grain Flours (10kg)'
    },
    badgesAwarded: {
      participation: 'Wild Yeast Baker',
      winner: 'Master of the Hearth'
    },
    entryCount: 0,
    voteCount: 0,
    createdAt: '2026-10-25T08:00:00.000Z'
  },
  {
    id: 'ch-french-patisserie',
    title: 'French Pâtisserie: The Sky-High Soufflé',
    theme: 'Aerated Egg Whites & Dramatic Temperature Ramps',
    description: 'Upcoming competition launching next week! Prepare your ramekins and vertical buttering techniques for delicate, cloud-like sweet or savory soufflés.',
    coverImage: ASSET_IMAGES.berryTart,
    type: 'monthly',
    status: 'upcoming',
    startDate: '2026-11-15T00:00:00.000Z',
    submissionDeadline: '2026-12-05T23:59:59.000Z',
    votingPeriodStart: '2026-12-06T00:00:00.000Z',
    votingPeriodEnd: '2026-12-12T23:59:59.000Z',
    rules: [
      'Soufflé must be photographed immediately out of the oven to demonstrate vertical rise.',
      'Both sweet (chocolate, Grand Marnier, fruit) and savory (cheese, herb) are eligible.'
    ],
    prizes: {
      firstPlace: 'Copper Sugar Pot + Professional Kitchen Stand Mixer Attachment',
      secondPlace: 'French Ceramic Ramekin Set (6x)'
    },
    badgesAwarded: {
      participation: 'Pâtisserie Enthusiast',
      winner: 'Soufflé Virtuoso'
    },
    entryCount: 0,
    voteCount: 0,
    createdAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'ch-berry-tart',
    title: 'Autumn Harvest Fruit Tarts & Sablé Crust',
    theme: 'Pâte Sablée Geometry & Seasonal Glazes',
    description: 'Seasonal fruit tart and pâte sablée showcase archive.',
    coverImage: ASSET_IMAGES.berryTart,
    type: 'monthly',
    status: 'completed',
    startDate: '2026-10-01T00:00:00.000Z',
    submissionDeadline: '2026-10-22T23:59:59.000Z',
    votingPeriodStart: '2026-10-23T00:00:00.000Z',
    votingPeriodEnd: '2026-10-30T23:59:59.000Z',
    rules: [
      'Handmade shortcrust pastry with blind baking demonstration.',
      'Seasonal fresh fruits or baked frangipane filling.'
    ],
    prizes: {
      firstPlace: '$200 French Pastry Workshop Voucher',
      secondPlace: 'Perforated Tart Ring Set'
    },
    badgesAwarded: {
      participation: 'Tart Artisan',
      winner: 'Pâtisserie Grand Champion'
    },
    entryCount: 0,
    voteCount: 0,
    createdAt: '2026-10-01T08:00:00.000Z'
  }
];

export const STARTER_ENTRIES: ChallengeEntry[] = [];

export const STARTER_BADGES: UserBadge[] = [];
