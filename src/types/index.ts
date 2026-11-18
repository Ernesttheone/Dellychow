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
  username?: string;
  photoURL?: string;
  role: UserRole;
  bio?: string;
  specialty?: string;
  experienceYears?: number;
  premiumPriceMonthly?: number;
  perks?: string;
  subscriberCount?: number;
  followerCount?: number;
  followedChefs?: ChefFollow[];
  likedVideoIds?: string[];
  likedRecipeIds?: string[];
  recipeRatings?: Record<string, number>;
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
  imageUrl?: string;
  videoUrl?: string;
  tags?: string[];
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
  tags?: string[];
  recipeId?: string;
  attachedRecipe?: AttachedVideoRecipe;
  isPremium?: boolean;
  viewCount?: number;
  likesCount?: number;
  nutritionInfo?: NutritionalInfo;
  status?: 'published' | 'draft';
  createdAt: string;
  updatedAt?: string;
}

export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  userName?: string;
  rating: number; // 1 to 5
  createdAt: string;
  updatedAt?: string;
}

export interface ChefFollow {
  id?: string;
  chefId: string;
  userId: string;
  chefName?: string;
  chefPhoto?: string;
  chefSpecialty?: string;
  source?: 'manual' | 'vip_subscription' | 'masterclass';
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
  authorRole?: UserRole;
  parentId?: string;
  replyToUserId?: string;
  replyToUserName?: string;
  content: string;
  createdAt: string;
}

export interface VideoComment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  authorRole?: UserRole;
  parentId?: string;
  replyToUserId?: string;
  replyToUserName?: string;
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
  type:
    | 'new_video'
    | 'new_recipe'
    | 'vip_live'
    | 'chef_update'
    | 'review_received'
    | 'new_comment'
    | 'comment_reply'
    | 'new_like'
    | 'new_follower';
  chefId?: string;
  chefName?: string;
  actorId?: string;
  actorName?: string;
  actorPhoto?: string;
  targetId?: string;
  targetType?: 'video' | 'recipe' | 'community' | 'support' | 'profile';
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
  | { type: 'comment_recipe'; recipeId: string; content: string; targetTitle?: string; parentId?: string; replyToUserId?: string; replyToUserName?: string; authorId?: string }
  | { type: 'comment_video'; videoId: string; content: string; targetTitle?: string; parentId?: string; replyToUserId?: string; replyToUserName?: string; authorId?: string }
  | { type: 'like_video'; videoId: string; videoTitle?: string; authorId?: string }
  | { type: 'like_recipe'; recipeId: string; recipeTitle?: string; authorId?: string }
  | { type: 'rate_recipe'; recipeId: string; rating: number; recipeTitle?: string }
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

// ============================================================================
// Video & Microphone Studio Types
// ============================================================================

export type VideoTransitionType = 'none' | 'fade' | 'crossfade' | 'slide' | 'zoom';
export type CropAspectRatio = 'original' | '16:9' | '9:16' | '1:1' | '4:5';
export type VideoRotationDeg = 0 | 90 | 180 | 270;
export type VideoFilterPreset =
  | 'none'
  | 'warm_kitchen'
  | 'crisp_studio'
  | 'vintage_film'
  | 'high_contrast'
  | 'noir_bw'
  | 'golden_hour'
  | 'cool_fresh';

export type ZoomEffectType = 'none' | 'slow_zoom_in' | 'slow_zoom_out' | 'pulse';
export type AnimatedOverlayPreset =
  | 'none'
  | 'warm_vignette'
  | 'chef_frame'
  | 'golden_border'
  | 'cinematic_bars';

export interface VideoClipItem {
  id: string;
  name: string;
  durationSec: number;
  trimStartSec: number;
  trimEndSec: number;
  transition: VideoTransitionType;
  volume: number; // 0 to 2
  muted: boolean;
  sourceType: 'recorded' | 'uploaded' | 'url' | 'freeze';
  serverUrl?: string;
  mimeType?: string;
  hasOriginalAudio?: boolean;
  // Multi-track & transform
  trackIndex?: 0 | 1; // 0 = Main Video Track, 1 = Picture-in-Picture / Overlay Track
  startOffsetSec?: number; // Used for Track 1 (PiP) positioning
  speed?: number; // 0.25 to 3.0
  reversed?: boolean;
  flipH?: boolean;
  flipV?: boolean;
  rotation?: VideoRotationDeg;
  // Freeze frame support
  isFreezeFrame?: boolean;
  freezeSourceTimeSec?: number;
  posterDataUrl?: string;
  // Color grading & effects
  filterPreset?: VideoFilterPreset;
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  exposure?: number; // -100 to 100
  blur?: number; // 0 to 20 px
  zoom?: number; // 1.0 to 2.5
  zoomEffect?: ZoomEffectType;
  glitch?: number; // 0 to 100
  // Background & Chroma Key & PiP
  bgColor?: string;
  chromaKeyEnabled?: boolean;
  chromaKeyColor?: string; // hex e.g. '#00ff00'
  chromaKeySimilarity?: number; // 0.05 to 0.5
  pipX?: number; // percentage 0..100
  pipY?: number; // percentage 0..100
  pipScale?: number; // 0.15..0.85
  audioDetached?: boolean;
}

export interface AudioTrackItem {
  id: string;
  name: string;
  trackType: 'voiceover' | 'music' | 'extracted';
  durationSec: number;
  startOffsetSec: number;
  trimStartSec: number;
  trimEndSec: number;
  volume: number; // 0 to 2
  muted: boolean;
  fadeInSec?: number; // 0 to 5
  fadeOutSec?: number; // 0 to 5
  noiseReduction?: boolean;
  sourceClipId?: string;
  presetId?: string;
  serverUrl?: string;
  mimeType?: string;
}

export type TextOverlayKind = 'text' | 'title' | 'lower_third' | 'caption';
export type TextAnimationType = 'none' | 'fade' | 'slide_up' | 'pop' | 'typewriter';
export type TextFontFamily =
  | 'Plus Jakarta Sans'
  | 'Playfair Display'
  | 'DM Sans'
  | 'Georgia'
  | 'Courier New';

export interface TextOverlayItem {
  id: string;
  kind?: TextOverlayKind;
  text: string;
  subtitle?: string; // Used for lower thirds / name tags
  startSec: number;
  endSec: number;
  position: 'top' | 'middle' | 'bottom' | 'custom';
  xPercent?: number; // 5..95
  yPercent?: number; // 5..95
  color: string;
  bgColor?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  fontSizePx?: number;
  fontFamily?: TextFontFamily;
  animation?: TextAnimationType;
  isAutoCaption?: boolean;
}

export interface OverlayEffectItem {
  id: string;
  preset: AnimatedOverlayPreset;
  startSec: number;
  endSec: number;
  intensity: number; // 0 to 100
}

export type ExportResolutionPreset = '720p' | '1080p' | '4k' | 'custom';
export type ExportQualityPreset = 'standard' | 'high' | 'ultra';

export interface StudioExportSettings {
  resolution: ExportResolutionPreset;
  aspectRatio: CropAspectRatio;
  customWidth: number;
  customHeight: number;
  quality: ExportQualityPreset;
  replaceOriginal: boolean;
}

export interface VideoStudioProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  recipeId?: string;
  isPremium: boolean;
  durationMinutes: number;
  prepTimeMinutes: number;
  thumbnailUrl: string;
  cropRatio: CropAspectRatio;
  rotation: VideoRotationDeg;
  bgColor?: string;
  originalAudioVolume: number;
  originalAudioMuted: boolean;
  clips: VideoClipItem[];
  audioTracks: AudioTrackItem[];
  textOverlays: TextOverlayItem[];
  overlayEffects?: OverlayEffectItem[];
  exportSettings?: StudioExportSettings;
  sourceVideoUrl?: string;
  exportedVideoUrl?: string;
  calories?: number | '';
  protein?: string;
  carbs?: string;
  fat?: string;
  status: 'draft' | 'published';
  publishedVideoId?: string;
  createdAt: string;
  updatedAt: string;
}

