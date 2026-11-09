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
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Recipe, 
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
  CommunityReport
} from '../types';
import { STARTER_RECIPES, STARTER_VIDEOS } from '../data/starterRecipes';
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
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Recipe, 'id'>) });
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
      ratingAverage: recipe.ratingAverage || 5.0,
      ratingCount: recipe.ratingCount || 1,
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

  // Rate a recipe
  async submitRating(recipeId: string, currentRating: number, newScore: number, currentCount: number): Promise<void> {
    const docRef = doc(db, 'recipes', recipeId);
    const updatedCount = (currentCount || 0) + 1;
    const updatedAvg = Number((((currentRating || 5.0) * (currentCount || 0) + newScore) / updatedCount).toFixed(1));
    try {
      await updateDoc(docRef, {
        ratingAverage: updatedAvg,
        ratingCount: updatedCount,
        updatedAt: new Date().toISOString()
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

  // Add comment
  async addComment(recipeId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<void> {
    const path = `recipes/${recipeId}/comments`;
    const newDocRef = doc(collection(db, 'recipes', recipeId, 'comments'));
    try {
      await setDoc(newDocRef, {
        ...comment,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Listen to videos
  listenToVideos(callback: (videos: CookingVideo[]) => void) {
    const videosRef = collection(db, 'videos');
    return onSnapshot(videosRef, (snapshot) => {
      const items: CookingVideo[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<CookingVideo, 'id'>) });
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
      await deleteDoc(docRef);
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

  // Listen to VIP community group chat
  listenToCommunityMessages(chefId: string, callback: (messages: CommunityMessage[]) => void) {
    const path = `communities/${chefId}/messages`;
    const messagesRef = collection(db, 'communities', chefId, 'messages');
    return onSnapshot(messagesRef, (snapshot) => {
      const items: CommunityMessage[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<CommunityMessage, 'id'>) });
      });
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Send VIP message
  async sendCommunityMessage(chefId: string, message: Omit<CommunityMessage, 'id' | 'createdAt'>): Promise<void> {
    const path = `communities/${chefId}/messages`;
    const newDocRef = doc(collection(db, 'communities', chefId, 'messages'));
    try {
      await setDoc(newDocRef, {
        ...message,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Like a recipe
  async likeRecipe(recipeId: string, currentLikes: number = 0): Promise<number> {
    const docRef = doc(db, 'recipes', recipeId);
    const newLikes = (currentLikes || 0) + 1;
    try {
      await updateDoc(docRef, { likesCount: newLikes });
      return newLikes;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recipes/${recipeId}`);
      return newLikes;
    }
  },

  // Like a video
  async likeVideo(videoId: string, currentLikes: number = 0): Promise<number> {
    const docRef = doc(db, 'videos', videoId);
    const newLikes = (currentLikes || 0) + 1;
    try {
      await updateDoc(docRef, { likesCount: newLikes });
      return newLikes;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `videos/${videoId}`);
      return newLikes;
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

  // Add video comment
  async addVideoComment(videoId: string, comment: Omit<VideoComment, 'id' | 'createdAt'>): Promise<void> {
    const path = `videos/${videoId}/comments`;
    const newDocRef = doc(collection(db, 'videos', videoId, 'comments'));
    try {
      await setDoc(newDocRef, {
        ...comment,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
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

  // Listen to live support chat messages
  listenToLiveSupportMessages(chatId: string, callback: (msgs: LiveSupportMessage[]) => void) {
    const path = `support_chats/${chatId}/messages`;
    const messagesRef = collection(db, 'support_chats', chatId, 'messages');
    return onSnapshot(messagesRef, (snapshot) => {
      const items: LiveSupportMessage[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<LiveSupportMessage, 'id'>) });
      });
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Send live support chat message
  async sendLiveSupportMessage(chatId: string, msg: Omit<LiveSupportMessage, 'id' | 'createdAt'>): Promise<void> {
    const path = `support_chats/${chatId}/messages`;
    const newDocRef = doc(collection(db, 'support_chats', chatId, 'messages'));
    try {
      await setDoc(newDocRef, {
        ...msg,
        id: newDocRef.id,
        createdAt: new Date().toISOString()
      });

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

          await setDoc(replyRef, {
            chatId,
            senderId: 'agent-sarah',
            senderName: 'Sarah (DellyChow Support)',
            senderRole: 'agent',
            text: agentReply,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
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

  // Seed initial starter recipes when chef or user clicks Publish Starter Recipes
  async seedStarterRecipes(chefId: string, chefName: string, chefPhoto: string): Promise<number> {
    let count = 0;
    for (const r of STARTER_RECIPES) {
      const newDocRef = doc(collection(db, 'recipes'));
      await setDoc(newDocRef, {
        ...r,
        authorId: chefId,
        authorName: chefName,
        authorPhoto: chefPhoto,
        createdAt: new Date().toISOString()
      });
      count++;
    }

    for (const v of STARTER_VIDEOS) {
      const newDocRef = doc(collection(db, 'videos'));
      await setDoc(newDocRef, {
        ...v,
        authorId: chefId,
        authorName: chefName,
        authorPhoto: chefPhoto,
        createdAt: new Date().toISOString()
      });
    }

    return count;
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

    // 1. Delete all video documents from Firestore database
    let deletedCount = 0;
    for (const docSnap of snap.docs) {
      try {
        await deleteDoc(doc(db, 'videos', docSnap.id));
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting video record ${docSnap.id}:`, err);
      }
    }

    // 2. Clear physical video Blobs from IndexedDB storage
    try {
      await clearAllStoredVideos();
    } catch (err) {
      console.error("Error clearing IndexedDB videos store:", err);
    }

    return { deletedCount, backupKey, backupData: fullBackup };
  }
};


