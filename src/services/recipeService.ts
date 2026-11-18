import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { deleteVideoFromFirebaseStorage } from '../lib/videoStorage';
import { removeWatchedVideoOffline, clearWatchedVideosOffline } from '../lib/offlineVideoCache';
import {
  getAuthoritativeServerTime,
  normalizeToUtcIso,
  parseUtcEpochMs,
  syncServerClock,
} from '../lib/chatTimestamp';
import { 
  Recipe, 
  RecipeRating,
  CookingVideo, 
  Comment, 
  VideoComment, 
  CommunityMessage, 
  MasterclassRegistration,
  ChefReview,
  UserNotification,
  SupportTicket,
  LiveSupportMessage,
  CommunitySettings,
  CommunityReport,
  UserProfile
} from '../types';
import { isDummyOrAiAccountId, DUMMY_ACCOUNT_NAMES, isSeededAiRecipe } from '../data/starterRecipes';
import { backupStoredVideos, clearAllStoredVideos } from '../lib/videoStorage';

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanUndefined(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

export const RecipeService = {
  // Subscribe to recipes list in real-time
  listenToRecipes(callback: (recipes: Recipe[]) => void, onError?: (error: any) => void) {
    const recipesRef = collection(db, 'recipes');
    return onSnapshot(recipesRef, (snapshot) => {
      const items: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const recipe = { id: docSnap.id, ...(docSnap.data() as Omit<Recipe, 'id'>) };
        if (!isSeededAiRecipe(recipe)) {
          items.push(recipe);
        }
      });
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, 'recipes');
    });
  },

  // Get single recipe
  async getRecipe(recipeId: string): Promise<Recipe | null> {
    const docRef = doc(db, 'recipes', recipeId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as Omit<Recipe, 'id'>) };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `recipes/${recipeId}`);
    }
  },

  // Create new recipe
  async createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>): Promise<string> {
    const newDocRef = doc(collection(db, 'recipes'));
    const fullRecipe = cleanUndefined({
      ...recipe,
      status: recipe.status || 'published',
      ratingAverage: recipe.ratingAverage ?? 0,
      ratingCount: recipe.ratingCount ?? 0,
      createdAt: new Date().toISOString()
    });
    try {
      await setDoc(newDocRef, fullRecipe);
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recipes');
      throw error;
    }
  },

  // Update existing recipe
  async updateRecipe(recipeId: string, updates: Partial<Recipe>): Promise<void> {
    const docRef = doc(db, 'recipes', recipeId);
    try {
      const cleanUpdates = cleanUndefined({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recipes/${recipeId}`);
    }
  },

  // Delete recipe
  async deleteRecipe(recipeId: string): Promise<void> {
    const docRef = doc(db, 'recipes', recipeId);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipes/${recipeId}`);
    }
  },

  // Listen to per-user recipe star ratings in real time
  listenToRecipeRatings(recipeId: string, callback: (ratings: RecipeRating[]) => void) {
    const ratingsRef = collection(db, 'recipes', recipeId, 'ratings');
    return onSnapshot(ratingsRef, (snapshot) => {
      const items: RecipeRating[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<RecipeRating, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, () => {
      // Gracefully fall back to aggregate recipe rating + userProfile.recipeRatings if subcollection rules are not yet deployed
      callback([]);
    });
  },

  // Rate a recipe (1 to 5 stars, one persistent rating per authenticated user, recalculates average)
  async rateRecipe(
    recipeId: string,
    userId: string,
    rating: number,
    userName?: string
  ): Promise<{ average: number; count: number; userRating: number }> {
    const score = Math.min(5, Math.max(1, Math.round(rating)));
    const now = new Date().toISOString();
    const userDocRef = doc(db, 'users', userId);
    const recipeDocRef = doc(db, 'recipes', recipeId);

    // 1. Read user's prior rating (from users/{userId}.recipeRatings) and recipe's current aggregate
    let prevUserScore = 0;
    let existingUserRatings: Record<string, number> = {};
    try {
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        existingUserRatings = (userSnap.data().recipeRatings as Record<string, number>) || {};
        prevUserScore = existingUserRatings[recipeId] || 0;
      }
    } catch {
      // Continue
    }

    // 2. Try writing to recipes/{recipeId}/ratings/{userId} subcollection
    let subcollectionSaved = false;
    try {
      const ratingDocRef = doc(db, 'recipes', recipeId, 'ratings', userId);
      const existingRatingSnap = await getDoc(ratingDocRef);
      await setDoc(ratingDocRef, cleanUndefined({
        id: userId,
        recipeId,
        userId,
        userName: userName || 'Food Explorer',
        rating: score,
        createdAt: existingRatingSnap.exists() ? (existingRatingSnap.data().createdAt || now) : now,
        updatedAt: now
      }));
      subcollectionSaved = true;
    } catch {
      // Fall back to user document + recipe aggregate update
    }

    // 3. Save user's rating on users/{userId}.recipeRatings so it always persists across sessions
    try {
      await updateDoc(userDocRef, {
        recipeRatings: {
          ...existingUserRatings,
          [recipeId]: score,
        },
        updatedAt: now,
      });
    } catch (err) {
      if (!subcollectionSaved) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        throw err;
      }
    }

    // 4. Compute exact new average & count
    let average = score;
    let count = 1;

    if (subcollectionSaved) {
      try {
        const ratingsSnap = await getDocs(collection(db, 'recipes', recipeId, 'ratings'));
        let total = 0;
        let subCount = 0;
        ratingsSnap.forEach((docSnap) => {
          const val = docSnap.data().rating;
          if (typeof val === 'number' && val >= 1 && val <= 5) {
            total += val;
            subCount++;
          }
        });
        if (subCount > 0) {
          count = subCount;
          average = Number((total / subCount).toFixed(1));
        }
      } catch {
        // Fallback below
      }
    } else {
      try {
        const recipeSnap = await getDoc(recipeDocRef);
        const recipeData = recipeSnap.exists() ? (recipeSnap.data() as Partial<Recipe>) : {};
        const prevCount = typeof recipeData.ratingCount === 'number' ? recipeData.ratingCount : 0;
        const prevAvg = typeof recipeData.ratingAverage === 'number' ? recipeData.ratingAverage : 0;

        if (prevUserScore > 0 && prevCount > 0) {
          count = prevCount;
          const total = prevAvg * prevCount - prevUserScore + score;
          average = Number(Math.min(5, Math.max(1, total / count)).toFixed(1));
        } else {
          count = prevCount + 1;
          const total = prevAvg * prevCount + score;
          average = Number(Math.min(5, Math.max(1, total / count)).toFixed(1));
        }
      } catch {
        average = score;
        count = 1;
      }
    }

    // 5. Persist recalculated ratingAverage and ratingCount on recipes/{recipeId}
    try {
      await updateDoc(recipeDocRef, {
        ratingAverage: average,
        ratingCount: count
      });
    } catch (updateErr) {
      console.warn('Could not sync aggregate rating on recipe document:', updateErr);
    }

    return { average, count, userRating: score };
  },

  // Rate a recipe (legacy fallback wrapper)
  async submitRating(recipeId: string, currentRating: number, newScore: number, currentCount: number): Promise<void> {
    const docRef = doc(db, 'recipes', recipeId);
    const updatedCount = (currentCount || 0) + 1;
    const updatedAvg = Number((((currentRating || 0) * (currentCount || 0) + newScore) / updatedCount).toFixed(1));
    try {
      await updateDoc(docRef, {
        ratingAverage: updatedAvg,
        ratingCount: updatedCount
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recipes/${recipeId}`);
    }
  },

  // Listen to recipe comments
  listenToComments(recipeId: string, callback: (comments: Comment[]) => void) {
    const path = `recipes/${recipeId}/comments`;
    const commentsRef = collection(db, 'recipes', recipeId, 'comments');
    return onSnapshot(commentsRef, (snapshot) => {
      const items: Comment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Comment, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Add comment (supports top-level comments and threaded replies)
  async addComment(recipeId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<string | null> {
    const path = `recipes/${recipeId}/comments`;
    const newDocRef = doc(collection(db, 'recipes', recipeId, 'comments'));
    try {
      await setDoc(newDocRef, cleanUndefined({
        ...comment,
        createdAt: new Date().toISOString()
      }));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return null;
    }
  },

  // Listen to videos
  listenToVideos(callback: (videos: CookingVideo[]) => void) {
    const videosRef = collection(db, 'videos');
    return onSnapshot(videosRef, (snapshot) => {
      const items: CookingVideo[] = [];
      snapshot.forEach((docSnap) => {
        const video = { id: docSnap.id, ...(docSnap.data() as Omit<CookingVideo, 'id'>) };
        if (
          !isDummyOrAiAccountId(video.authorId) &&
          !DUMMY_ACCOUNT_NAMES.has((video.authorName || '').trim()) &&
          !(video.videoUrl || '').includes('dQw4w9WgXcQ')
        ) {
          items.push(video);
        }
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'videos');
    });
  },

  // Generate video ID helper
  generateVideoId(): string {
    return doc(collection(db, 'videos')).id;
  },

  // Get a single video by ID
  async getVideo(videoId: string): Promise<CookingVideo | null> {
    try {
      const docRef = doc(db, 'videos', videoId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as Omit<CookingVideo, 'id'>) };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `videos/${videoId}`);
      return null;
    }
  },

  // Create video
  async createVideo(video: Omit<CookingVideo, 'id' | 'createdAt'>, customId?: string): Promise<string> {
    const newDocRef = customId ? doc(db, 'videos', customId) : doc(collection(db, 'videos'));
    try {
      const cleanVideo = cleanUndefined({
        ...video,
        createdAt: new Date().toISOString()
      });
      await setDoc(newDocRef, cleanVideo);
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
      throw error;
    }
  },

  // Delete video
  async deleteVideo(videoId: string): Promise<void> {
    const docRef = doc(db, 'videos', videoId);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await removeWatchedVideoOffline(videoId);
        return;
      }
      const videoUrl = (snap.data() as CookingVideo).videoUrl;
      await deleteDoc(docRef);
      if (videoUrl) {
        await deleteVideoFromFirebaseStorage(videoUrl);
      }
      await removeWatchedVideoOffline(videoId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${videoId}`);
    }
  },

  // Update video
  async updateVideo(videoId: string, updates: Partial<CookingVideo>): Promise<void> {
    const docRef = doc(db, 'videos', videoId);
    try {
      const cleanUpdates = cleanUndefined({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `videos/${videoId}`);
    }
  },

  // Listen to VIP community group chat with real-time database timestamp resolution
  listenToCommunityMessages(chefId: string, callback: (messages: CommunityMessage[]) => void) {
    syncServerClock();
    const path = `communities/${chefId}/messages`;
    const messagesRef = collection(db, 'communities', chefId, 'messages');
    return onSnapshot(
      messagesRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items: CommunityMessage[] = [];
        snapshot.forEach((docSnap) => {
          const rawData = docSnap.data({ serverTimestamps: 'none' }) as Record<string, any>;
          const hasCommittedServerTs =
            rawData.serverTimestamp != null &&
            (typeof rawData.serverTimestamp?.toDate === 'function' ||
              typeof rawData.serverTimestamp?.seconds === 'number');

          const canonicalCreatedAt = normalizeToUtcIso(
            hasCommittedServerTs ? rawData.serverTimestamp : null,
            rawData.createdAt
          );

          items.push({
            id: docSnap.id,
            chefId: rawData.chefId || chefId,
            senderId: rawData.senderId || '',
            senderName: rawData.senderName || 'Member',
            senderPhoto: rawData.senderPhoto || '',
            senderRole: rawData.senderRole || 'member',
            text: rawData.text || '',
            createdAt: canonicalCreatedAt,
            serverTimestamp: rawData.serverTimestamp,
            isPendingTimestamp: Boolean(docSnap.metadata.hasPendingWrites && !hasCommittedServerTs),
          });
        });

        items.sort((a, b) => {
          const diff = parseUtcEpochMs(a.createdAt) - parseUtcEpochMs(b.createdAt);
          if (diff !== 0) return diff;
          return a.id.localeCompare(b.id);
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // Send VIP message using authoritative database serverTimestamp + server UTC ISO 8601
  async sendCommunityMessage(chefId: string, message: Omit<CommunityMessage, 'id' | 'createdAt'>): Promise<void> {
    const path = `communities/${chefId}/messages`;
    const newDocRef = doc(collection(db, 'communities', chefId, 'messages'));
    try {
      const { utcIso } = await getAuthoritativeServerTime();
      await setDoc(newDocRef, cleanUndefined({
        ...message,
        createdAt: utcIso,
        serverTimestamp: serverTimestamp(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Like or unlike a recipe (stores exact non-negative likesCount)
  async likeRecipe(recipeId: string, nextLikesCount: number): Promise<number> {
    const docRef = doc(db, 'recipes', recipeId);
    const safeLikes = Math.max(0, Math.round(nextLikesCount));
    try {
      await updateDoc(docRef, { likesCount: safeLikes });
      return safeLikes;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recipes/${recipeId}`);
      return safeLikes;
    }
  },

  // Like or unlike a video (stores exact non-negative likesCount)
  async likeVideo(videoId: string, nextLikesCount: number): Promise<number> {
    const docRef = doc(db, 'videos', videoId);
    const safeLikes = Math.max(0, Math.round(nextLikesCount));
    try {
      await updateDoc(docRef, { likesCount: safeLikes });
      return safeLikes;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `videos/${videoId}`);
      return safeLikes;
    }
  },

  // Listen to video comments
  listenToVideoComments(videoId: string, callback: (comments: VideoComment[]) => void) {
    const path = `videos/${videoId}/comments`;
    const commentsRef = collection(db, 'videos', videoId, 'comments');
    return onSnapshot(commentsRef, (snapshot) => {
      const items: VideoComment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<VideoComment, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Add video comment (supports threaded replies)
  async addVideoComment(videoId: string, comment: Omit<VideoComment, 'id' | 'createdAt'>): Promise<string | null> {
    const path = `videos/${videoId}/comments`;
    const newDocRef = doc(collection(db, 'videos', videoId, 'comments'));
    try {
      await setDoc(newDocRef, cleanUndefined({
        ...comment,
        createdAt: new Date().toISOString()
      }));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return null;
    }
  },


  // Register for VIP masterclass (does not confirm until Firestore setDoc succeeds)
  async registerMasterclass(data: Omit<MasterclassRegistration, 'id' | 'registeredAt' | 'confirmationCode' | 'status'>): Promise<MasterclassRegistration> {
    const confirmationCode = 'DC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newDocRef = doc(collection(db, 'masterclass_registrations'));
    const registration: MasterclassRegistration = {
      ...data,
      id: newDocRef.id,
      status: 'confirmed',
      confirmationCode,
      registeredAt: new Date().toISOString()
    };
    try {
      await setDoc(newDocRef, registration);
      return registration;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'masterclass_registrations');
      throw error;
    }
  },

  // Listen to user's registered masterclasses
  listenToUserMasterclasses(userId: string, callback: (regs: MasterclassRegistration[]) => void) {
    const q = query(
      collection(db, 'masterclass_registrations'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const items: MasterclassRegistration[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<MasterclassRegistration, 'id'>) });
      });
      items.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'masterclass_registrations');
    });
  },

  // Submit structured support ticket
  async submitSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const newDocRef = doc(collection(db, 'support_tickets'));
    const fullTicket: SupportTicket = {
      ...ticket,
      id: newDocRef.id,
      status: 'open',
      agentResponse: 'Thank you for reaching out to DellyChow Support. An agent has been assigned to your ticket and will respond shortly.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(newDocRef, fullTicket);
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'support_tickets');
      return 'DC-TICKET-' + Date.now().toString(36).toUpperCase();
    }
  },

  // Listen to user support tickets
  listenToUserTickets(userId: string, callback: (tickets: SupportTicket[]) => void) {
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const items: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<SupportTicket, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    });
  },

  // Listen to live support chat messages with database timestamp resolution
  listenToLiveSupportMessages(chatId: string, callback: (msgs: LiveSupportMessage[]) => void) {
    syncServerClock();
    const path = `support_chats/${chatId}/messages`;
    const messagesRef = collection(db, 'support_chats', chatId, 'messages');
    return onSnapshot(
      messagesRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items: LiveSupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const rawData = docSnap.data({ serverTimestamps: 'none' }) as Record<string, any>;
          const hasCommittedServerTs =
            rawData.serverTimestamp != null &&
            (typeof rawData.serverTimestamp?.toDate === 'function' ||
              typeof rawData.serverTimestamp?.seconds === 'number');

          const canonicalCreatedAt = normalizeToUtcIso(
            hasCommittedServerTs ? rawData.serverTimestamp : null,
            rawData.createdAt
          );

          items.push({
            id: docSnap.id,
            chatId: rawData.chatId || chatId,
            senderId: rawData.senderId || '',
            senderName: rawData.senderName || 'Support',
            senderRole: rawData.senderRole || 'user',
            text: rawData.text || '',
            createdAt: canonicalCreatedAt,
            serverTimestamp: rawData.serverTimestamp,
            isPendingTimestamp: Boolean(docSnap.metadata.hasPendingWrites && !hasCommittedServerTs),
          });
        });

        items.sort((a, b) => {
          const diff = parseUtcEpochMs(a.createdAt) - parseUtcEpochMs(b.createdAt);
          if (diff !== 0) return diff;
          return a.id.localeCompare(b.id);
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // Send live support chat message using authoritative server UTC timestamp
  async sendLiveSupportMessage(chatId: string, msg: Omit<LiveSupportMessage, 'id' | 'createdAt'>): Promise<void> {
    const path = `support_chats/${chatId}/messages`;
    const newDocRef = doc(collection(db, 'support_chats', chatId, 'messages'));
    try {
      const { utcIso } = await getAuthoritativeServerTime();
      await setDoc(newDocRef, cleanUndefined({
        ...msg,
        id: newDocRef.id,
        createdAt: utcIso,
        serverTimestamp: serverTimestamp(),
      }));

      // Automated helpful agent reply for common inquiries
      setTimeout(async () => {
        try {
          const replyRef = doc(collection(db, 'support_chats', chatId, 'messages'));
          let agentReply = "Hello! Thanks for reaching out to DellyChow Live Support. An agent will be with you in a moment.";
          const lower = msg.text.toLowerCase();
          if (lower.includes('vip') || lower.includes('subscri') || lower.includes('membership')) {
            agentReply = "For VIP cooking sessions and private chef circles: VIP subscriptions are handled securely per chef. You can subscribe via any chef's profile or during a video preview.";
          } else if (lower.includes('recipe') || lower.includes('upload')) {
            agentReply = "Chefs can publish recipes with 8 simple fields via Chef Studio. If you have an account issue, feel free to submit a ticket.";
          } else if (lower.includes('tablet') || lower.includes('device') || lower.includes('video')) {
            agentReply = "Our platform is fully optimized for iPad, Android tablets, phones, and desktops. If video playback buffers, please check your network connection.";
          }

          const replyTime = await getAuthoritativeServerTime();
          await setDoc(replyRef, {
            chatId,
            senderId: 'agent-sarah',
            senderName: 'Sarah (DellyChow Support)',
            senderRole: 'agent',
            text: agentReply,
            createdAt: replyTime.utcIso,
            serverTimestamp: serverTimestamp(),
          });
        } catch {
          // Ignore
        }
      }, 1200);

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Chef Reviews & Ratings: Listen to reviews for a specific chef
  listenToChefReviews(chefId: string, callback: (reviews: ChefReview[]) => void) {
    const path = `chefs/${chefId}/reviews`;
    const reviewsRef = collection(db, 'chefs', chefId, 'reviews');
    return onSnapshot(reviewsRef, (snapshot) => {
      const items: ChefReview[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<ChefReview, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Submit Chef Review with anti-spam safeguard (one review per user account per chef)
  async submitChefReview(
    chefId: string, 
    review: Omit<ChefReview, 'id' | 'createdAt'>
  ): Promise<{ average: number; count: number }> {
    const path = `chefs/${chefId}/reviews`;
    // Deterministic document ID per user to prevent duplicate reviews/spam from the same account
    const reviewDocId = `review_${review.userId}`;
    const reviewDocRef = doc(db, 'chefs', chefId, 'reviews', reviewDocId);

    try {
      const now = new Date().toISOString();
      const existingSnap = await getDoc(reviewDocRef);
      const isUpdate = existingSnap.exists();

      await setDoc(reviewDocRef, {
        ...review,
        id: reviewDocId,
        createdAt: isUpdate ? (existingSnap.data().createdAt || now) : now,
        updatedAt: now
      });

      // Recalculate average and update chef's profile
      const reviewsSnap = await getDocs(collection(db, 'chefs', chefId, 'reviews'));
      let total = 0;
      let count = 0;
      reviewsSnap.forEach((doc) => {
        const data = doc.data();
        if (typeof data.rating === 'number') {
          total += data.rating;
          count++;
        }
      });
      const avg = count > 0 ? Number((total / count).toFixed(1)) : review.rating;

      try {
        const chefDocRef = doc(db, 'users', chefId);
        await updateDoc(chefDocRef, {
          ratingAverage: avg,
          ratingCount: count
        });
      } catch {
        // Continue even if chef doc not found
      }

      return { average: avg, count };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  // User Notifications: Listen to notifications for a user
  listenToUserNotifications(userId: string, callback: (notifications: UserNotification[]) => void) {
    const path = `users/${userId}/notifications`;
    const notesRef = collection(db, 'users', userId, 'notifications');
    return onSnapshot(notesRef, (snapshot) => {
      const items: UserNotification[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<UserNotification, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Create a YouTube-style notification for a target user (non-blocking)
  async createNotification(
    targetUserId: string,
    payload: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'>
  ): Promise<void> {
    if (!targetUserId) return;
    if (payload.actorId && payload.actorId === targetUserId) return;
    try {
      const newDocRef = doc(collection(db, 'users', targetUserId, 'notifications'));
      await setDoc(
        newDocRef,
        cleanUndefined({
          ...payload,
          id: newDocRef.id,
          userId: targetUserId,
          read: false,
          createdAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.warn('Could not dispatch notification:', err);
    }
  },

  // Notify all followers when a creator publishes a new video
  async notifyFollowersOfNewVideo(video: {
    id: string;
    title: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
  }): Promise<void> {
    if (!video.authorId) return;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const tasks: Promise<void>[] = [];
      usersSnap.forEach((docSnap) => {
        if (docSnap.id === video.authorId) return;
        const data = docSnap.data() as Partial<UserProfile>;
        if (isDummyOrAiAccountId(docSnap.id)) return;
        const followsAuthor = Array.isArray(data.followedChefs)
          ? data.followedChefs.some(
              (f) => f.chefId === video.authorId && f.notificationPreference !== 'none'
            )
          : false;
        if (followsAuthor) {
          tasks.push(
            this.createNotification(docSnap.id, {
              type: 'new_video',
              title: `${video.authorName} uploaded a new video`,
              message: video.title,
              chefId: video.authorId,
              chefName: video.authorName,
              actorId: video.authorId,
              actorName: video.authorName,
              actorPhoto: video.authorPhoto,
              targetId: video.id,
              targetType: 'video',
              link: `video:${video.id}`,
            })
          );
        }
      });
      await Promise.all(tasks);
    } catch (err) {
      console.warn('Could not notify followers of new video:', err);
    }
  },

  // Subscribe to real-time directory of verified real creator profiles (excluding dummy/AI accounts)
  listenToCreators(callback: (creatorsMap: Record<string, UserProfile>) => void) {
    const usersRef = collection(db, 'users');
    return onSnapshot(
      usersRef,
      (snapshot) => {
        const map: Record<string, UserProfile> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile & { isDummy?: boolean; isAiAccount?: boolean };
          if (
            isDummyOrAiAccountId(docSnap.id) ||
            data?.isDummy === true ||
            data?.isAiAccount === true ||
            DUMMY_ACCOUNT_NAMES.has((data?.displayName || '').trim())
          ) {
            return;
          }
          map[docSnap.id] = { ...data, id: docSnap.id };
        });
        callback(map);
      },
      () => {
        callback({});
      }
    );
  },

  // Mark single notification as read
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    const noteRef = doc(db, 'users', userId, 'notifications', notificationId);
    try {
      await updateDoc(noteRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/notifications/${notificationId}`);
    }
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const notesRef = collection(db, 'users', userId, 'notifications');
    try {
      const snap = await getDocs(notesRef);
      const updates = snap.docs.map(d => updateDoc(d.ref, { read: true }));
      await Promise.all(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/notifications`);
    }
  },

  // Community Moderation: Delete a community message
  async deleteCommunityMessage(chefId: string, messageId: string): Promise<void> {
    const msgRef = doc(db, 'communities', chefId, 'messages', messageId);
    try {
      await deleteDoc(msgRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `communities/${chefId}/messages/${messageId}`);
    }
  },

  // Community Moderation: Pin or update announcement
  async updateCommunitySettings(chefId: string, settings: Partial<CommunitySettings>): Promise<void> {
    const docRef = doc(db, 'communities', chefId);
    try {
      await setDoc(docRef, { ...settings, chefId, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `communities/${chefId}`);
    }
  },

  // Community Moderation: Get community settings
  async getCommunitySettings(chefId: string): Promise<CommunitySettings | null> {
    const docRef = doc(db, 'communities', chefId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as CommunitySettings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `communities/${chefId}`);
      return null;
    }
  },

  // Community Report: Submit a report on a chat message
  async reportCommunityMessage(report: Omit<CommunityReport, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const newDocRef = doc(collection(db, 'community_reports'));
    try {
      await setDoc(newDocRef, {
        ...report,
        id: newDocRef.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community_reports');
      return 'REP-' + Date.now().toString(36).toUpperCase();
    }
  },

  // Purge previously seeded AI recipes, dummy videos, and dummy user profiles from Firestore when authorized
  async purgeDummyAndAiContent(currentUserUid?: string, isAdmin = false): Promise<number> {
    if (!currentUserUid) return 0;
    let deletedCount = 0;

    try {
      const recipesSnap = await getDocs(collection(db, 'recipes'));
      for (const docSnap of recipesSnap.docs) {
        const data = docSnap.data() as Partial<Recipe>;
        if (isSeededAiRecipe(data) && (isAdmin || data.authorId === currentUserUid)) {
          await deleteDoc(doc(db, 'recipes', docSnap.id));
          deletedCount++;
        }
      }
    } catch (err) {
      console.warn('Notice purging seeded AI recipes:', err);
    }

    try {
      const videosSnap = await getDocs(collection(db, 'videos'));
      for (const docSnap of videosSnap.docs) {
        const data = docSnap.data() as Partial<CookingVideo>;
        const isDummyVideo =
          isDummyOrAiAccountId(data.authorId) ||
          (data.authorName && DUMMY_ACCOUNT_NAMES.has(data.authorName.trim())) ||
          (data.videoUrl || '').includes('dQw4w9WgXcQ');
        if (isDummyVideo && (isAdmin || data.authorId === currentUserUid)) {
          await deleteDoc(doc(db, 'videos', docSnap.id));
          deletedCount++;
        }
      }
    } catch (err) {
      console.warn('Notice purging dummy videos:', err);
    }

    if (isAdmin) {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const docSnap of usersSnap.docs) {
          const data = docSnap.data() as { displayName?: string; isDummy?: boolean; isAiAccount?: boolean };
          if (
            isDummyOrAiAccountId(docSnap.id) ||
            data?.isDummy === true ||
            data?.isAiAccount === true ||
            (data?.displayName && DUMMY_ACCOUNT_NAMES.has(data.displayName.trim()))
          ) {
            await deleteDoc(doc(db, 'users', docSnap.id));
            deletedCount++;
          }
        }
      } catch (err) {
        console.warn('Notice purging dummy user profiles:', err);
      }
    }

    return deletedCount;
  },

  // Complete Video Cleanup Feature: Permanently removes all AI-generated and uploaded videos
  async cleanupAllWebsiteVideos(): Promise<{ deletedCount: number; backupKey: string; backupData: any }> {
    const videosRef = collection(db, 'videos');
    const snap = await getDocs(videosRef);
    const firestoreVideos: any[] = [];
    
    snap.forEach((docSnap) => {
      firestoreVideos.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Also gather IndexedDB stored video metadata
    let storedBlobsMetadata: any[] = [];
    try {
      storedBlobsMetadata = await backupStoredVideos();
    } catch (e) {
      console.warn("Could not retrieve stored blobs metadata for backup:", e);
    }

    const backupKey = `dellychow_videos_backup_${Date.now()}`;
    const fullBackup = {
      timestamp: new Date().toISOString(),
      firestoreVideos,
      storageBlobs: storedBlobsMetadata,
      totalCount: firestoreVideos.length + storedBlobsMetadata.length
    };

    try {
      localStorage.setItem(backupKey, JSON.stringify(fullBackup));
    } catch (e) {
      console.warn("LocalStorage full, backup retained in memory:", e);
    }

    // 1. Delete all video documents from Firestore database and Firebase Storage
    let deletedCount = 0;
    for (const docSnap of snap.docs) {
      try {
        const data = docSnap.data() as CookingVideo;
        await deleteDoc(doc(db, 'videos', docSnap.id));
        if (data?.videoUrl) {
          await deleteVideoFromFirebaseStorage(data.videoUrl);
        }
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting video record ${docSnap.id}:`, err);
      }
    }

    // 2. Clear physical video Blobs and offline metadata caches
    try {
      await clearAllStoredVideos();
      await clearWatchedVideosOffline();
    } catch (err) {
      console.error("Error clearing IndexedDB videos store:", err);
    }

    return { deletedCount, backupKey, backupData: fullBackup };
  }
};


