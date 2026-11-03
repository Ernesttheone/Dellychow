import { ASSET_IMAGES } from '../assets/images';
import { Recipe, CookingVideo } from '../types';

export const STARTER_RECIPES: Omit<Recipe, 'id' | 'authorId' | 'createdAt'>[] = [
  {
    title: 'Handmade Truffle Tagliatelle al Parmigiano',
    description: 'Silky, ribbon-thin egg pasta tossed in a luxurious emulsion of 24-month aged Parmigiano-Reggiano, browned European butter, and freshly shaved black winter truffles.',
    category: 'dinner',
    cuisine: 'Italian',
    prepTimeMinutes: 30,
    cookTimeMinutes: 12,
    servings: 4,
    ingredients: [
      '300g Tipo 00 Italian flour',
      '3 large free-range egg yolks + 1 whole egg',
      '60g cultured unsalted butter',
      '80g freshly grated Parmigiano-Reggiano',
      '1 fresh black truffle (or 2 tbsp truffle carpaccio)',
      '1 cup starchy pasta cooking water',
      'Maldon sea salt and cracked tellicherry pepper to taste'
    ],
    steps: [
      'Mound the flour on a clean marble surface, create a well in the center, add eggs and whisk gently with a fork, slowly incorporating flour.',
      'Knead dough by hand for 10 minutes until smooth and elastic. Wrap in beeswax wrap and let rest for 30 minutes at room temperature.',
      'Roll out through a pasta roller down to setting 6, dusting lightly with semolina. Slice into 8mm wide tagliatelle ribbons.',
      'Bring a large pot of water to a rolling boil and season generously with sea salt. Cook the fresh pasta for exactly 2.5 minutes until al dente.',
      'In a wide sauté pan over gentle heat, melt the cultured butter with half a cup of pasta water. Vigorously swirl in the grated Parmigiano to form a glossy, velvety emulsion.',
      'Transfer pasta straight into the sauce with tongs. Toss vigorously for 60 seconds to coat every ribbon. Shave generous black truffle slices over the top and serve immediately.'
    ],
    imageUrl: ASSET_IMAGES.trufflePasta,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isPremium: false,
    ratingAverage: 4.9,
    ratingCount: 18,
    likesCount: 52,
    nutritionInfo: {
      calories: 520,
      protein: '18g',
      carbs: '64g',
      fat: '22g',
      fiber: '4g'
    },
    authorName: 'Chef David Chen',
    authorPhoto: ASSET_IMAGES.chefAvatar,
  },
  {
    title: 'Crispy Skin Pan-Seared Salmon & Quinoa Bowl',
    description: 'Golden, crackling salmon fillet resting on warm tri-color quinoa, sliced Haas avocado, edamame pods, quick-pickled pink radishes, and sweet ginger sesame glaze.',
    category: 'lunch',
    cuisine: 'Mediterranean',
    prepTimeMinutes: 15,
    cookTimeMinutes: 18,
    servings: 2,
    ingredients: [
      '2 wild Atlantic salmon fillets (skin-on, descaled)',
      '1 cup tri-color organic quinoa, rinsed',
      '1 ripe Haas avocado, thinly fan-sliced',
      '1/2 cup shelled edamame, steamed',
      '3 pink breakfast radishes, wafer-sliced',
      '2 tbsp toasted white and black sesame seeds',
      '2 tbsp extra virgin olive oil',
      'Dressing: 1 tbsp tamari, 1 tsp toasted sesame oil, 1 tsp honey, 1 lime juiced'
    ],
    steps: [
      'Rinse quinoa thoroughly. Simmer in 2 cups of salted water with a squeeze of lemon for 15 minutes until tender and fluffy. Fluff with a fork.',
      'Pat salmon skin thoroughly dry with paper towels; score skin lightly with a sharp knife and season liberally with kosher salt.',
      'Heat olive oil in a heavy stainless steel or cast iron skillet over medium-high heat until shimmering. Place salmon skin-side down, pressing gently with a spatula for 10 seconds.',
      'Cook undisturbed for 5 to 6 minutes until the skin is shatteringly crisp and the flesh is cooked 3/4 of the way up.',
      'Flip gently and sear the flesh side for just 90 seconds. Remove from heat immediately.',
      'Assemble warm quinoa in shallow bowls, fan out avocado slices, edamame, and pickled radishes. Crown with the crispy salmon fillet, drizzle ginger sesame dressing, and scatter toasted sesame seeds.'
    ],
    imageUrl: ASSET_IMAGES.salmonBowl,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isPremium: false,
    ratingAverage: 4.8,
    ratingCount: 24,
    likesCount: 68,
    nutritionInfo: {
      calories: 590,
      protein: '42g',
      carbs: '38g',
      fat: '31g',
      fiber: '8g'
    },
    authorName: 'Chef David Chen',
    authorPhoto: ASSET_IMAGES.chefAvatar,
  },
  {
    title: 'Artisanal French Raspberry & Creme Tart',
    description: 'Crisp sweet pâte sablée pastry shell lined with silky Madagascar vanilla bean diplomat cream, glazed ruby raspberries, and fresh garden mint.',
    category: 'desserts',
    cuisine: 'French',
    prepTimeMinutes: 45,
    cookTimeMinutes: 25,
    servings: 8,
    ingredients: [
      '200g sweet pastry dough (pâte sablée)',
      '300g fresh organic raspberries & blackberries',
      '250ml whole milk',
      '1 Madagascar vanilla bean, split and scraped',
      '3 egg yolks + 50g granulated sugar',
      '20g cornstarch',
      '100ml heavy whipping cream, whipped to soft peaks',
      '2 tbsp apricot jam (for glistening glaze)',
      'Fresh mint sprigs and edible viola flowers'
    ],
    steps: [
      'Roll out chilled pâte sablée to 3mm thickness and line a fluted 9-inch tart ring. Dock base with a fork and blind bake with pie weights at 175°C (350°F) for 20 minutes until golden.',
      'Heat milk with vanilla seeds and pod until steaming. In a bowl, whisk egg yolks, sugar, and cornstarch until pale.',
      'Temper the yolks by streaming hot milk while whisking constantly, return to saucepan and cook over medium heat until thickened and bubbling for 1 minute.',
      'Cool pastry cream completely over an ice bath, then fold in whipped cream to create a feather-light diplomat cream.',
      'Pipe diplomat cream evenly into the cooled tart shell.',
      'Arrange fresh berries concentric circles on top. Brush gently with warm strained apricot glaze, garnish with mint and edible flowers, and chill for 1 hour before slicing.'
    ],
    imageUrl: ASSET_IMAGES.berryTart,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isPremium: true,
    ratingAverage: 5.0,
    ratingCount: 14,
    likesCount: 39,
    nutritionInfo: {
      calories: 340,
      protein: '6g',
      carbs: '44g',
      fat: '16g',
      fiber: '5g'
    },
    authorName: 'Chef David Chen',
    authorPhoto: ASSET_IMAGES.chefAvatar,
  }
];

export const STARTER_VIDEOS: Omit<CookingVideo, 'id' | 'authorId' | 'createdAt'>[] = [];


