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
    entryCount: 14,
    voteCount: 86,
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
    entryCount: 9,
    voteCount: 42,
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
    entryCount: 18,
    voteCount: 145,
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
    description: 'Completed challenge! Congratulations to Chef Clara Gomez who captured first place with her caramelized fig and blackberry frangipane tart.',
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
    entryCount: 22,
    voteCount: 230,
    winnerEntryId: 'entry-berry-clara',
    winnerUserId: 'user-clara-gomez',
    winnerUserName: 'Chef Clara Gomez',
    winnerDishTitle: 'Black Fig & Frangipane Sablé Tart with Lavender Glaze',
    createdAt: '2026-10-01T08:00:00.000Z'
  }
];

export const STARTER_ENTRIES: ChallengeEntry[] = [
  {
    id: 'entry-pasta-marcus',
    challengeId: 'ch-winter-pasta',
    challengeTitle: 'Winter Truffle & Hand-Rolled Pasta Showdown',
    userId: 'chef-david-chen',
    userName: 'Chef David Chen',
    userPhoto: ASSET_IMAGES.chefAvatar,
    userRole: 'chef',
    dishTitle: 'Aged Parmigiano Tagliatelle with Shaved Norcia Truffle',
    caption: 'Kneaded 36-yolk pasta dough rolled to 1.1mm thickness on white oak. Emulsified with 24-month Parmigiano whey and cultured butter emulsion.',
    mediaUrls: [ASSET_IMAGES.trufflePasta],
    mediaType: 'image',
    voteCount: 28,
    status: 'eligible',
    submittedAt: '2026-11-02T14:30:00.000Z'
  },
  {
    id: 'entry-pasta-elena',
    challengeId: 'ch-winter-pasta',
    challengeTitle: 'Winter Truffle & Hand-Rolled Pasta Showdown',
    userId: 'user-elena-rossi',
    userName: 'Elena Rossi',
    userPhoto: ASSET_IMAGES.chefAvatar,
    userRole: 'user',
    dishTitle: 'Handmade Ricotta & Herb Agnolotti with Brown Butter Glaze',
    caption: 'Pinched individual agnolotti pillows stuffed with sheep ricotta and nutmeg. Glossed in hazelnut brown butter and crisp sage.',
    mediaUrls: [ASSET_IMAGES.trufflePasta],
    mediaType: 'image',
    voteCount: 19,
    status: 'eligible',
    submittedAt: '2026-11-03T11:15:00.000Z'
  },
  {
    id: 'entry-sear-sam',
    challengeId: 'ch-golden-sear',
    challengeTitle: 'The Golden Crust: Master Pan Searing',
    userId: 'user-sam-miller',
    userName: 'Sam Miller',
    userPhoto: ASSET_IMAGES.chefAvatar,
    userRole: 'user',
    dishTitle: 'Crispy Skin Steelhead Trout with Charred Citrus Beurre Blanc',
    caption: 'Pressed in a screaming-hot carbon steel skillet with clarified ghee for 4 minutes. Skin shattered like glass while center remained medium-rare.',
    mediaUrls: [ASSET_IMAGES.salmonBowl],
    mediaType: 'image',
    voteCount: 16,
    status: 'eligible',
    submittedAt: '2026-11-03T19:00:00.000Z'
  },
  {
    id: 'entry-berry-clara',
    challengeId: 'ch-berry-tart',
    challengeTitle: 'Autumn Harvest Fruit Tarts & Sablé Crust',
    userId: 'user-clara-gomez',
    userName: 'Chef Clara Gomez',
    userPhoto: ASSET_IMAGES.chefAvatar,
    userRole: 'chef',
    dishTitle: 'Black Fig & Frangipane Sablé Tart with Lavender Glaze',
    caption: 'Classic French pâte sablée with hazelnut flour frangipane, topped with black mission figs glazed with wild lavender honey syrup.',
    mediaUrls: [ASSET_IMAGES.berryTart],
    mediaType: 'image',
    voteCount: 82,
    status: 'winner',
    submittedAt: '2026-10-14T16:20:00.000Z'
  }
];

export const STARTER_BADGES: UserBadge[] = [
  {
    id: 'badge-1',
    userId: 'user-clara-gomez',
    badgeId: 'patisserie-grand-champion',
    title: 'Pâtisserie Grand Champion',
    description: 'Awarded 1st place in the Autumn Harvest Fruit Tarts & Sablé Crust challenge with 82 community votes.',
    icon: '🏆',
    challengeId: 'ch-berry-tart',
    challengeTitle: 'Autumn Harvest Fruit Tarts & Sablé Crust',
    category: 'winner',
    earnedAt: '2026-10-30T23:59:59.000Z'
  },
  {
    id: 'badge-2',
    userId: 'chef-david-chen',
    badgeId: 'pasta-artisan-guild',
    title: 'Pasta Artisan Guild',
    description: 'Awarded for submitting an eligible entry to the Winter Truffle & Hand-Rolled Pasta Showdown.',
    icon: '🍝',
    challengeId: 'ch-winter-pasta',
    challengeTitle: 'Winter Truffle & Hand-Rolled Pasta Showdown',
    category: 'participation',
    earnedAt: '2026-11-02T14:30:00.000Z'
  }
];
