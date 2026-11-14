export type UserRole = 'user' | 'chef';

export type RecipeCourse = 'breakfast' | 'lunch' | 'dinner' | 'desserts' | 'snacks' | 'Rice' | 'Soups' | 'Snacks' | 'Drinks' | string;
export type RecipeCategory = 'all' | RecipeCourse;

export interface NutritionalInfo {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
}

export interface LegalAcceptanceRecord {
  id?: string;
  userId: string;
  termsVersion: string;
  privacyPolicyVersion: string;
  communityGuidelinesVersion?: string;
  copyrightPolicyVersion?: string;
  foodSafetyVersion?: string;
  cookiePolicyVersion?: string;
  acceptedAt: string;
  status: 'accepted' | 'declined';
  registrationMethod?: 'email_password' | 'google' | 'existing_user_update' | 'account_settings';
  source?: 'signup' | 'update_prompt' | 'account_settings';
}

export interface CookiePreferences {
  essential: true; // Always active for Firebase Auth & session security
  functionalStorage: boolean; // Theme preference & offline recipe/video thumbnail cache
  updatedAt: string;
}

export interface UserPrivacySettings {
  profileVisibility: 'public' | 'community_only';
  allowDirectSharing: boolean;
  isMinorOrTeenProtected: boolean;
  parentalConsentConfirmed?: boolean;
  ageGroup?: 'under_13' | 'teen_13_17' | 'adult_18_plus';
  cookiePreferences?: CookiePreferences;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  bio?: string;
  specialty?: string;
  experienceYears?: number;
  premiumPriceMonthly?: number;
  perks?: string;
  subscriberCount?: number;
  followerCount?: number;
  accountStatus?: 'active' | 'restricted' | 'suspended' | 'pending_deletion';
  restrictionReason?: string;
  ageGroup?: 'under_13' | 'teen_13_17' | 'adult_18_plus';
  privacySettings?: UserPrivacySettings;
  legalAcceptance?: LegalAcceptanceRecord;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recipe {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title: string;
  description: string;
  category: string;
  cuisine?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes: number;
  servings?: number;
  ingredients: string[];
  steps: string[];
  imageUrl: string;
  videoUrl?: string;
  isPremium?: boolean;
  status?: 'published' | 'draft';
  ratingAverage?: number;
  ratingCount?: number;
  likesCount?: number;
  nutritionInfo?: NutritionalInfo;
  createdAt: string;
  updatedAt?: string;
}

export interface AttachedVideoRecipe {
  id?: string;
  title: string;
  description?: string;
  ingredients: string[];
  steps?: string[];
  cookTimeMinutes?: number;
  prepTimeMinutes?: number;
  servings?: number;
}

export interface CookingVideo {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationMinutes: number;
  category: string;
  recipeId?: string;
  attachedRecipe?: AttachedVideoRecipe;
  isPremium?: boolean;
  viewCount?: number;
  likesCount?: number;
  nutritionInfo?: NutritionalInfo;
  createdAt: string;
  updatedAt?: string;
}

export interface ChefFollow {
  chefId: string;
  userId: string;
  notificationPreference: 'all' | 'personalized' | 'none';
  followedAt: string;
}

export interface Favourite {
  id: string;
  userId: string;
  recipeId: string;
  recipeTitle: string;
  recipeImage: string;
  category: string;
  cuisine: string;
  addedAt: string;
}

export interface VideoFavourite {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl?: string;
  durationMinutes: number;
  category: string;
  authorName: string;
  authorPhoto?: string;
  isPremium?: boolean;
  addedAt: string;
}

export interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  createdAt: string;
}

export interface VideoComment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  chefId: string;
  chefName?: string;
  plan: 'monthly' | 'annual';
  status: 'active' | 'cancelled';
  price?: number;
  startDate: string;
  expiresAt: string;
}

export interface CommunityMessage {
  id: string;
  chefId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderRole: 'chef' | 'member';
  text: string;
  createdAt: string;
  serverTimestamp?: any;
  isPendingTimestamp?: boolean;
}

export interface Masterclass {
  id: string;
  chefId: string;
  chefName: string;
  chefPhoto?: string;
  chefSpecialty?: string;
  title: string;
  topic: string;
  schedule: string;
  date: string;
  time: string;
  durationMinutes: number;
  description: string;
  price: number;
  currency: string;
  maxParticipants?: number;
  currentParticipants?: number;
  imageUrl: string;
  prerequisites?: string[];
  isPremiumOnly?: boolean;
}

export interface MasterclassRegistration {
  id: string;
  masterclassId: string;
  masterclassTitle: string;
  chefId: string;
  chefName: string;
  userId: string;
  userName: string;
  userEmail: string;
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  dietaryNotes?: string;
  status: 'confirmed';
  registeredAt: string;
  confirmationCode: string;
}

export interface ChefReview {
  id: string;
  chefId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number; // 1 to 5
  headline: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_video' | 'new_recipe' | 'vip_live' | 'chef_update' | 'review_received';
  chefId?: string;
  chefName?: string;
  targetId?: string;
  targetType?: 'video' | 'recipe' | 'community' | 'support';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  name: string;
  email: string;
  topic: string;
  category: 'account' | 'subscriptions' | 'payments' | 'video_upload' | 'live_session' | 'community' | 'technical' | 'complaint' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  message: string;
  status: 'open' | 'in_review' | 'investigating' | 'resolved';
  agentResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LiveSupportMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'agent' | 'bot';
  text: string;
  createdAt: string;
  serverTimestamp?: any;
  isPendingTimestamp?: boolean;
}

export interface CommunitySettings {
  chefId: string;
  name?: string;
  description?: string;
  privacy?: 'public' | 'vip_only';
  isPublicGroup?: boolean;
  pinnedAnnouncement?: string;
  rules?: string[] | string;
}

export interface CommunityReport {
  id?: string;
  chefId: string;
  messageId: string;
  messageText: string;
  reportedBy?: string;
  reportedByUserId?: string;
  reportedByUserName?: string;
  senderId?: string;
  reason: 'spam' | 'harassment' | 'offensive' | 'unsafe' | 'other' | string;
  details?: string;
  status?: 'pending' | 'reviewed' | 'action_taken';
  createdAt: string;
}

// Feature 1: Shopping & Ingredient Integration Types
export type IngredientCategory = 
  | 'Produce' 
  | 'Dairy & Refrigerated' 
  | 'Pantry & Dry Goods' 
  | 'Meat & Seafood' 
  | 'Spices & Seasonings' 
  | 'Bakery' 
  | 'Beverages' 
  | 'Other';

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  category: IngredientCategory;
  purchased: boolean;
  recipeSource?: string;
  recipeId?: string;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  notes?: string;
  items: ShoppingListItem[];
  recipeIds?: string[];
  recipeTitles?: string[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryService {
  id: 'instacart' | 'whole_foods' | 'amazon_fresh' | 'kroger';
  name: string;
  logo: string;
  tagline: string;
  supported: boolean;
  estimatedDeliveryTime: string;
}

export interface GroceryMatchItem {
  shoppingItemId: string;
  originalName: string;
  originalQuantity: string;
  matchedName: string;
  matchedBrand?: string;
  status: 'available' | 'substituted' | 'unavailable';
  suggestedSubstitute?: {
    name: string;
    brand?: string;
    price: number;
    reason: string;
  };
  acceptedSubstitute?: boolean;
  selectedForTransfer: boolean;
  estimatedPrice?: number;
}

// Feature 2: Cooking Challenges & Competitions Types
export type ChallengeType = 'weekly' | 'monthly';
export type ChallengeStatus = 'active' | 'upcoming' | 'voting' | 'completed';

export interface Challenge {
  id: string;
  title: string;
  theme: string;
  description: string;
  coverImage: string;
  type: ChallengeType;
  status: ChallengeStatus;
  startDate: string;
  submissionDeadline: string;
  votingPeriodStart: string;
  votingPeriodEnd: string;
  rules: string[];
  requiredIngredients?: string[];
  formatRequirements?: string;
  prizes?: {
    firstPlace: string;
    secondPlace?: string;
    thirdPlace?: string;
  };
  badgesAwarded: {
    participation: string;
    winner: string;
  };
  entryCount: number;
  voteCount?: number;
  winnerEntryId?: string;
  winnerUserId?: string;
  winnerUserName?: string;
  winnerDishTitle?: string;
  createdAt: string;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  challengeTitle: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userRole: UserRole;
  dishTitle: string;
  caption?: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'mixed';
  voteCount: number;
  status: 'eligible' | 'winner' | 'runner_up';
  submittedAt: string;
  updatedAt?: string;
}

export interface ChallengeVote {
  id: string;
  challengeId: string;
  entryId: string;
  userId: string;
  votedAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  title: string;
  description: string;
  icon: string;
  challengeId?: string;
  challengeTitle?: string;
  category: 'participation' | 'winner' | 'mastery';
  earnedAt: string;
}

export type PendingAction = 
  | { type: 'comment_recipe'; recipeId: string; content: string; targetTitle?: string }
  | { type: 'comment_video'; videoId: string; content: string; targetTitle?: string }
  | { type: 'like_video'; videoId: string; videoTitle?: string }
  | { type: 'like_recipe'; recipeId: string; recipeTitle?: string }
  | { type: 'follow_chef'; chefId: string; chefName: string }
  | { type: 'bookmark_video'; video: CookingVideo }
  | { type: 'watch_video'; video: CookingVideo }
  | { type: 'register_masterclass'; masterclass: Masterclass }
  | { type: 'add_to_shopping_list'; recipe: Recipe }
  | { type: 'submit_challenge_entry'; challengeId: string }
  | { type: 'vote_challenge_entry'; challengeId: string; entryId: string };

export type LegalPolicyKey =
  | 'legal'
  | 'terms'
  | 'privacy'
  | 'guidelines'
  | 'copyright'
  | 'food-safety'
  | 'cookies'
  | 'reporting'
  | 'contact';

export interface CopyrightClaim {
  id: string;
  claimantUserId: string;
  claimantName: string;
  claimantEmail: string;
  violationType:
    | 'stolen_video'
    | 'unauthorized_image'
    | 'copied_recipe'
    | 'copyrighted_music'
    | 'creator_impersonation';
  reportedTargetType: 'video' | 'recipe' | 'chef_profile' | 'user_profile';
  reportedTargetId: string;
  reportedTargetTitle?: string;
  reportedContentUrl: string;
  targetAuthorId?: string;
  originalWorkTitle: string;
  originalWorkUrl?: string;
  originalWorkDescription: string;
  goodFaithDeclaration: boolean;
  status:
    | 'submitted'
    | 'under_review'
    | 'action_taken'
    | 'counter_notice_submitted'
    | 'dismissed';
  adminDecisionNotes?: string;
  counterNoticeText?: string;
  counterNoticeAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType:
    | 'video'
    | 'recipe'
    | 'video_comment'
    | 'recipe_comment'
    | 'chef_profile'
    | 'user_profile'
    | 'external_link';
  targetId: string;
  targetTitle?: string;
  targetAuthorId?: string;
  reason:
    | 'harassment'
    | 'spam'
    | 'fraud'
    | 'suspicious_link'
    | 'copyright_violation'
    | 'impersonation'
    | 'food_safety_hazard'
    | 'inappropriate_minor_contact'
    | 'other';
  details: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  resolutionAction?: 'none' | 'content_removed' | 'user_restricted' | 'user_suspended';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModerationAppeal {
  id: string;
  userId: string;
  userName: string;
  targetType: 'account' | 'video' | 'recipe' | 'comment' | 'copyright';
  targetId: string;
  referenceReportId?: string;
  appealReason: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BlockedUserRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedUserName?: string;
  reason?: string;
  createdAt: string;
}

export interface PrivacyRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  requestType: 'account_deletion' | 'data_access' | 'data_correction' | 'privacy_inquiry';
  details: string;
  deletionConfirmationCode?: string;
  acknowledgedDataRetention?: boolean;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModerationAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface PolicyVersionMetadata {
  id: string;
  policyKey: LegalPolicyKey;
  title: string;
  version: string;
  lastUpdated: string;
  updatedByEmail?: string;
  summaryOfChanges?: string;
}


