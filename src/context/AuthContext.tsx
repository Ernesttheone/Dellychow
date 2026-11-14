import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testConnection } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  Subscription,
  Favourite,
  Recipe,
  CookingVideo,
  VideoFavourite,
  PendingAction,
  UserNotification,
  LegalAcceptanceRecord,
  BlockedUserRecord,
  CookiePreferences,
  UserPrivacySettings,
} from '../types';
import { ASSET_IMAGES } from '../assets/images';
import { getDefaultAvatar } from '../constants/avatars';
import { RecipeService } from '../services/recipeService';
import { buildLegalAcceptanceRecord } from '../data/legalDocuments';
import { getAuthoritativeServerTime } from '../lib/chatTimestamp';
import { isAuthorizedAdminUser } from '../lib/admin';
import {
  LegalService,
  getSavedCookiePreferences,
  saveLocalCookiePreferences,
} from '../services/legalService';

export interface LegalSignupOptions {
  ageGroup?: 'teen_13_17' | 'adult_18_plus';
  parentalConsentConfirmed?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  activeSubscriptions: Subscription[];
  favourites: Favourite[];
  videoFavourites: VideoFavourite[];
  notifications: UserNotification[];
  unreadNotificationCount: number;
  blockedUsers: BlockedUserRecord[];
  blockedUserIds: string[];
  cookiePreferences: CookiePreferences;
  pendingAction: PendingAction | null;
  pendingToast: string | null;
  activeWatchVideo: CookingVideo | null;
  setActiveWatchVideo: (v: CookingVideo | null) => void;
  setPendingToast: (msg: string | null) => void;
  setPendingAction: (action: PendingAction | null) => void;
  executePendingAction: (actionToRun?: PendingAction) => Promise<void>;
  isSubscribedToChef: (chefId: string) => boolean;
  isRecipeBookmarked: (recipeId: string) => boolean;
  isVideoBookmarked: (videoId: string) => boolean;
  createAccount: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    specialty?: string,
    acceptedTerms?: boolean,
    signupOptions?: LegalSignupOptions
  ) => Promise<UserProfile>;
  login: (email: string, password: string) => Promise<UserProfile>;
  signInWithGoogle: (
    preferredRole?: UserRole,
    acceptedTerms?: boolean,
    signupOptions?: LegalSignupOptions
  ) => Promise<UserProfile | null>;
  acceptLatestLegalTerms: (
    source?: 'signup' | 'update_prompt' | 'account_settings',
    registrationMethod?: LegalAcceptanceRecord['registrationMethod']
  ) => Promise<LegalAcceptanceRecord | null>;
  declineUpdatedLegalTerms: () => Promise<void>;
  blockUser: (targetUserId: string, targetName?: string, reason?: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  updatePrivacySettings: (updates: Partial<UserPrivacySettings>) => Promise<void>;
  updateCookiePreferences: (functionalStorage: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  toggleBookmark: (recipe: Recipe) => Promise<boolean>;
  toggleVideoBookmark: (video: CookingVideo) => Promise<boolean>;
  subscribeToChef: (chefId: string, chefName: string, plan: 'monthly' | 'annual', price: number) => Promise<void>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyResetCode: (code: string) => Promise<string>;
  confirmResetPassword: (code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [videoFavourites, setVideoFavourites] = useState<VideoFavourite[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [hasAdminDoc, setHasAdminDoc] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRecord[]>([]);
  const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(() =>
    getSavedCookiePreferences()
  );
  const [activeWatchVideo, setActiveWatchVideo] = useState<CookingVideo | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingToast, setPendingToast] = useState<string | null>(null);


  // Test Firestore connectivity on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Monitor Auth state
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (user) {
        const defaultProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Food Explorer',
          photoURL: user.photoURL || ASSET_IMAGES.chefAvatar,
          role: 'user',
          bio: 'Passionate food enthusiast seeking delicious flavors and culinary inspiration.',
          specialty: 'Home Bistro & Global Flavors',
          experienceYears: 1,
          premiumPriceMonthly: 9.99,
          perks: 'Exclusive monthly masterclasses, secret spice blends, private Discord & VIP chat access.',
          subscriberCount: 0,
          followerCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Check local storage for quick offline retrieval
        const cacheKey = `dellychow_profile_${user.uid}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setUserProfile(JSON.parse(cached));
          } else {
            setUserProfile(defaultProfile);
          }
        } catch {
          setUserProfile(defaultProfile);
        }

        const userDocRef = doc(db, 'users', user.uid);
        profileUnsub = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch {}
          } else {
            // First time login - bootstrap default user profile
            setDoc(userDocRef, defaultProfile).catch((err) => {
              console.warn("Could not sync initial profile to cloud, using local profile:", err?.message || err);
            });
            setUserProfile(defaultProfile);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(defaultProfile));
            } catch {}
          }
          setLoading(false);
        }, (error) => {
          // If Firestore is offline or re-connecting, continue seamlessly with fallback
          console.warn("Firestore operating in offline or reconnecting mode for profile:", error?.message || error);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setActiveSubscriptions([]);
        setFavourites([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // Listen for user favourites
  useEffect(() => {
    if (!currentUser) return;
    const favPath = `users/${currentUser.uid}/favourites`;
    const favRef = collection(db, 'users', currentUser.uid, 'favourites');

    const unsubscribe = onSnapshot(favRef, (snapshot) => {
      const items: Favourite[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Favourite, 'id'>) });
      });
      setFavourites(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, favPath);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for user video favourites
  useEffect(() => {
    if (!currentUser) {
      setVideoFavourites([]);
      return;
    }
    const vidFavPath = `users/${currentUser.uid}/video_favourites`;
    const vidFavRef = collection(db, 'users', currentUser.uid, 'video_favourites');

    const unsubscribe = onSnapshot(vidFavRef, (snapshot) => {
      const items: VideoFavourite[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<VideoFavourite, 'id'>) });
      });
      setVideoFavourites(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, vidFavPath);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for active subscriptions
  useEffect(() => {
    if (!currentUser) return;
    const subPath = 'subscriptions';
    const subQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', currentUser.uid)
    );


    const unsubscribe = onSnapshot(subQuery, (snapshot) => {
      const subs: Subscription[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Subscription, 'id'>;
        if (data.status === 'active') {
          subs.push({ id: docSnap.id, ...data });
        }
      });
      setActiveSubscriptions(subs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, subPath);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Feature 3: Listen for notifications for the user in real-time
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const unsub = RecipeService.listenToUserNotifications(currentUser.uid, (notes) => {
      setNotifications(notes);
    });

    return () => unsub();
  }, [currentUser]);

  // Check optional /admins/{uid} document and subscribe to user block list
  useEffect(() => {
    if (!currentUser) {
      setHasAdminDoc(false);
      setBlockedUsers([]);
      return;
    }

    getDoc(doc(db, 'admins', currentUser.uid))
      .then((snap) => setHasAdminDoc(snap.exists()))
      .catch(() => setHasAdminDoc(false));

    const unsubBlocked = LegalService.listenToBlockedUsers(currentUser.uid, (records) => {
      setBlockedUsers(records);
    });

    return () => {
      unsubBlocked();
    };
  }, [currentUser]);

  // Create account with email & password and role
  const createAccount = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    specialty?: string,
    acceptedTerms = false,
    signupOptions?: LegalSignupOptions
  ): Promise<UserProfile> => {
    if (!acceptedTerms) {
      throw new Error(
        "Please read and agree to DellyChow's Terms and Conditions, Privacy Policy and Community Guidelines before registering."
      );
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile display name
      await fbUpdateProfile(user, { displayName });

      const authoritativeNow = await getAuthoritativeServerTime()
        .then((res) => res.utcIso)
        .catch(() => new Date().toISOString());

      const acceptanceRecord = buildLegalAcceptanceRecord(
        user.uid,
        authoritativeNow,
        'signup',
        'email_password',
        'accepted'
      );

      const ageGroup = signupOptions?.ageGroup || 'adult_18_plus';
      const isMinor = ageGroup === 'teen_13_17';

      const newProfile: UserProfile = {
        id: user.uid,
        email: user.email || email,
        displayName: displayName || (role === 'chef' ? 'Executive Chef' : 'Food Explorer'),
        photoURL: getDefaultAvatar(user.uid, role === 'chef' ? 0 : 1).svgDataUri,
        role: role,
        bio: role === 'chef'
          ? 'Professional chef sharing authentic recipes, kitchen secrets, and cooking tutorials.'
          : 'Food lover exploring culinary traditions and testing new home recipes.',
        specialty: specialty || (role === 'chef' ? 'Artisanal Culinary Arts' : 'Home Cooking & World Cuisine'),
        experienceYears: role === 'chef' ? 5 : 1,
        premiumPriceMonthly: 9.99,
        perks: 'Exclusive monthly masterclasses, secret spice blends, private Discord & VIP chat access.',
        subscriberCount: 0,
        followerCount: 0,
        accountStatus: 'active',
        ageGroup,
        privacySettings: {
          profileVisibility: isMinor ? 'community_only' : 'public',
          allowDirectSharing: !isMinor,
          isMinorOrTeenProtected: isMinor,
          parentalConsentConfirmed: Boolean(signupOptions?.parentalConsentConfirmed),
          ageGroup,
          cookiePreferences,
          updatedAt: authoritativeNow,
        },
        legalAcceptance: acceptanceRecord,
        createdAt: authoritativeNow,
        updatedAt: authoritativeNow
      };

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, newProfile);
      await LegalService.createLegalAcceptanceRecord(acceptanceRecord).catch(() => {});
      setUserProfile(newProfile);
      try {
        localStorage.setItem(`dellychow_profile_${user.uid}`, JSON.stringify(newProfile));
      } catch {}
      return newProfile;
    } catch (err: any) {
      console.warn("Account creation notice:", err?.code || err?.message || err);
      throw err;
    }
  };

  // Log in with email & password
  const login = async (email: string, password: string): Promise<UserProfile> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        setUserProfile(profile);
        return profile;
      } else {
        const fallbackProfile: UserProfile = {
          id: user.uid,
          email: user.email || email,
          displayName: user.displayName || 'Food Explorer',
          photoURL: user.photoURL || getDefaultAvatar(user.uid, 1).svgDataUri,
          role: 'user',
          accountStatus: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, fallbackProfile);
        setUserProfile(fallbackProfile);
        return fallbackProfile;
      }
    } catch (err: any) {
      console.warn("Login notice:", err?.code || err?.message || err);
      throw err;
    }
  };

  // Google sign in with role selection
  const signInWithGoogle = async (
    preferredRole?: UserRole,
    acceptedTerms = false,
    signupOptions?: LegalSignupOptions
  ): Promise<UserProfile | null> => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        // Feature 7: Permanent account role assignment - an existing account permanently retains its role
        setUserProfile(profile);
        return profile;
      } else {
        if (!acceptedTerms) {
          // Sign back out immediately so unconsented brand-new Google signups cannot slip through
          await fbSignOut(auth).catch(() => {});
          throw new Error(
            "Please accept DellyChow's Terms and Conditions, Privacy Policy and Community Guidelines to complete new account registration."
          );
        }
        const authoritativeNow = await getAuthoritativeServerTime()
          .then((res) => res.utcIso)
          .catch(() => new Date().toISOString());

        const acceptanceRecord = buildLegalAcceptanceRecord(
          user.uid,
          authoritativeNow,
          'signup',
          'google',
          'accepted'
        );

        const ageGroup = signupOptions?.ageGroup || 'adult_18_plus';
        const isMinor = ageGroup === 'teen_13_17';

        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || (preferredRole === 'chef' ? 'Executive Chef' : 'Food Explorer'),
          photoURL: user.photoURL || getDefaultAvatar(user.uid, preferredRole === 'chef' ? 0 : 1).svgDataUri,
          role: preferredRole || 'user',
          bio: preferredRole === 'chef'
            ? 'Professional chef sharing authentic recipes, kitchen secrets, and cooking tutorials.'
            : 'Passionate food enthusiast seeking delicious flavors and culinary inspiration.',
          specialty: preferredRole === 'chef' ? 'Artisanal Culinary Arts' : 'Home Bistro & Global Flavors',
          experienceYears: preferredRole === 'chef' ? 5 : 1,
          premiumPriceMonthly: 9.99,
          perks: 'Exclusive monthly masterclasses, secret spice blends, private Discord & VIP chat access.',
          subscriberCount: 0,
          followerCount: 0,
          accountStatus: 'active',
          ageGroup,
          privacySettings: {
            profileVisibility: isMinor ? 'community_only' : 'public',
            allowDirectSharing: !isMinor,
            isMinorOrTeenProtected: isMinor,
            parentalConsentConfirmed: Boolean(signupOptions?.parentalConsentConfirmed),
            ageGroup,
            cookiePreferences,
            updatedAt: authoritativeNow,
          },
          legalAcceptance: acceptanceRecord,
          createdAt: authoritativeNow,
          updatedAt: authoritativeNow
        };
        await setDoc(userDocRef, initialProfile);
        await LegalService.createLegalAcceptanceRecord(acceptanceRecord).catch(() => {});
        setUserProfile(initialProfile);
        try {
          localStorage.setItem(`dellychow_profile_${user.uid}`, JSON.stringify(initialProfile));
        } catch {}
        return initialProfile;
      }
    } catch (err: any) {
      console.warn("Sign in notice:", err?.code || err?.message || err);
      throw err;
    }
  };

  // Record explicit user acceptance of latest Terms & Privacy Policy
  const acceptLatestLegalTerms = async (
    source: 'signup' | 'update_prompt' | 'account_settings' = 'update_prompt',
    registrationMethod?: LegalAcceptanceRecord['registrationMethod']
  ): Promise<LegalAcceptanceRecord | null> => {
    if (!currentUser || !userProfile) return null;
    const acceptedAtIso = await getAuthoritativeServerTime()
      .then((res) => res.utcIso)
      .catch(() => new Date().toISOString());

    const resolvedMethod: LegalAcceptanceRecord['registrationMethod'] =
      registrationMethod ||
      (source === 'account_settings' ? 'account_settings' : 'existing_user_update');

    const record = buildLegalAcceptanceRecord(
      currentUser.uid,
      acceptedAtIso,
      source,
      resolvedMethod,
      'accepted'
    );
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updatedProfile: UserProfile = {
      ...userProfile,
      legalAcceptance: record,
      updatedAt: acceptedAtIso,
    };

    try {
      await updateDoc(userDocRef, {
        legalAcceptance: record,
        updatedAt: acceptedAtIso,
      });
    } catch {
      await setDoc(userDocRef, updatedProfile, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      });
    }

    await LegalService.createLegalAcceptanceRecord(record).catch(() => {});

    setUserProfile(updatedProfile);
    try {
      localStorage.setItem(`dellychow_profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
    } catch {}
    return record;
  };

  // Record non-destructive decline of updated policy without deleting user data
  const declineUpdatedLegalTerms = async (): Promise<void> => {
    if (!currentUser) return;
    const utcIso = await getAuthoritativeServerTime()
      .then((res) => res.utcIso)
      .catch(() => new Date().toISOString());
    const declinedRecord = buildLegalAcceptanceRecord(
      currentUser.uid,
      utcIso,
      'update_prompt',
      'existing_user_update',
      'declined'
    );
    await LegalService.createLegalAcceptanceRecord(declinedRecord).catch(() => {});
  };

  const blockUser = async (targetUserId: string, targetName?: string, reason?: string) => {
    if (!currentUser || !targetUserId || targetUserId === currentUser.uid) return;
    const record = await LegalService.blockUser(currentUser.uid, targetUserId, targetName, reason);
    setBlockedUsers((prev) => [record, ...prev.filter((b) => b.blockedUserId !== targetUserId)]);
    setPendingToast(`Blocked ${targetName || 'user'}. You will no longer see their comments.`);
    setTimeout(() => setPendingToast(null), 4000);
  };

  const unblockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    await LegalService.unblockUser(currentUser.uid, targetUserId);
    setBlockedUsers((prev) => prev.filter((b) => b.blockedUserId !== targetUserId));
    setPendingToast('User removed from your block list.');
    setTimeout(() => setPendingToast(null), 3500);
  };

  const updatePrivacySettings = async (updates: Partial<UserPrivacySettings>) => {
    if (!currentUser || !userProfile) return;
    const utcIso = new Date().toISOString();
    const merged: UserPrivacySettings = {
      profileVisibility: userProfile.privacySettings?.profileVisibility || 'public',
      allowDirectSharing: userProfile.privacySettings?.allowDirectSharing ?? true,
      isMinorOrTeenProtected: userProfile.privacySettings?.isMinorOrTeenProtected ?? false,
      parentalConsentConfirmed: userProfile.privacySettings?.parentalConsentConfirmed,
      ageGroup: userProfile.privacySettings?.ageGroup || userProfile.ageGroup || 'adult_18_plus',
      cookiePreferences,
      ...updates,
      updatedAt: utcIso,
    };

    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      privacySettings: merged,
      ...(merged.ageGroup ? { ageGroup: merged.ageGroup } : {}),
      updatedAt: utcIso,
    });
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            privacySettings: merged,
            ...(merged.ageGroup ? { ageGroup: merged.ageGroup } : {}),
            updatedAt: utcIso,
          }
        : null
    );
  };

  const updateCookiePreferences = async (functionalStorage: boolean) => {
    const nextPrefs = saveLocalCookiePreferences(functionalStorage);
    setCookiePreferences(nextPrefs);
    if (currentUser && userProfile) {
      await updatePrivacySettings({ cookiePreferences: nextPrefs }).catch(() => {});
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUserProfile(null);
    } catch (err) {
      console.warn("Sign out notice:", err);
    }
  };

  // Feature 7: Role restrictions - role is permanently locked and cannot be updated through profile settings
  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).role; // Strictly forbid modifying account role
    delete (safeUpdates as any).id;

    const updatedData = {
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    };
    try {
      await updateDoc(userDocRef, updatedData);
      setUserProfile(prev => prev ? ({ ...prev, ...updatedData }) : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!currentUser) return;
    await RecipeService.markNotificationAsRead(currentUser.uid, id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    await RecipeService.markAllNotificationsAsRead(currentUser.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const isRecipeBookmarked = (recipeId: string): boolean => {
    return favourites.some(f => f.recipeId === recipeId);
  };

  const isSubscribedToChef = (chefId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.uid === chefId) return true;
    return activeSubscriptions.some(sub => sub.chefId === chefId && sub.status === 'active');
  };

  const isVideoBookmarked = (videoId: string): boolean => {
    return videoFavourites.some(f => f.videoId === videoId);
  };

  const toggleBookmark = async (recipe: Recipe): Promise<boolean> => {
    if (!currentUser) {
      throw new Error("AUTH_REQUIRED");
    }

    const existingFav = favourites.find(f => f.recipeId === recipe.id);
    const favPath = `users/${currentUser.uid}/favourites`;

    if (existingFav) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'favourites', existingFav.id));
        return false;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${favPath}/${existingFav.id}`);
        return true;
      }
    } else {
      try {
        const newDocRef = doc(collection(db, 'users', currentUser.uid, 'favourites'));
        const favData: Omit<Favourite, 'id'> = {
          userId: currentUser.uid,
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          recipeImage: recipe.imageUrl,
          category: recipe.category,
          cuisine: recipe.cuisine || 'Specialty',
          addedAt: new Date().toISOString()
        };
        await setDoc(newDocRef, favData);
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, favPath);
        return false;
      }
    }
  };

  const toggleVideoBookmark = async (video: CookingVideo): Promise<boolean> => {
    if (!currentUser) {
      throw new Error("AUTH_REQUIRED");
    }

    const existingFav = videoFavourites.find(f => f.videoId === video.id);
    const vidFavPath = `users/${currentUser.uid}/video_favourites`;

    if (existingFav) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'video_favourites', existingFav.id));
        return false;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${vidFavPath}/${existingFav.id}`);
        return true;
      }
    } else {
      try {
        const newDocRef = doc(collection(db, 'users', currentUser.uid, 'video_favourites'));
        const favData: Omit<VideoFavourite, 'id'> = {
          userId: currentUser.uid,
          videoId: video.id,
          videoTitle: video.title,
          thumbnailUrl: video.thumbnailUrl,
          durationMinutes: video.durationMinutes,
          category: video.category,
          authorName: video.authorName,
          authorPhoto: video.authorPhoto,
          isPremium: video.isPremium,
          addedAt: new Date().toISOString()
        };
        await setDoc(newDocRef, favData);
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, vidFavPath);
        return false;
      }
    }
  };

  // Execute an action that was held pending while the guest user was signing in
  const executePendingAction = async (actionToRun?: PendingAction) => {
    const act = actionToRun || pendingAction;
    if (!act || !currentUser) return;

    try {
      if (act.type === 'comment_recipe') {
        await RecipeService.addComment(act.recipeId, {
          recipeId: act.recipeId,
          userId: currentUser.uid,
          userName: userProfile?.displayName || currentUser.displayName || 'Food Explorer',
          userPhoto: userProfile?.photoURL || currentUser.photoURL || '',
          content: act.content
        });
        setPendingToast('Your cooking note has been published!');
      } else if (act.type === 'comment_video') {
        await RecipeService.addVideoComment(act.videoId, {
          videoId: act.videoId,
          userId: currentUser.uid,
          userName: userProfile?.displayName || currentUser.displayName || 'Food Explorer',
          userPhoto: userProfile?.photoURL || currentUser.photoURL || '',
          content: act.content
        });
        setPendingToast('Your video note has been published!');
      } else if (act.type === 'like_video') {
        await RecipeService.likeVideo(act.videoId, 0);
        setPendingToast('You liked this video!');
      } else if (act.type === 'like_recipe') {
        await RecipeService.likeRecipe(act.recipeId, 0);
        setPendingToast('You liked this recipe!');
      } else if (act.type === 'follow_chef') {
        try {
          const chefDocRef = doc(db, 'users', act.chefId);
          const snap = await getDoc(chefDocRef);
          if (snap.exists()) {
            const count = snap.data().followerCount || 0;
            await updateDoc(chefDocRef, { followerCount: count + 1 });
          }
        } catch {
          // ignore
        }
        setPendingToast(`You are now following ${act.chefName}!`);
      } else if (act.type === 'bookmark_video') {
        await toggleVideoBookmark(act.video);
        setPendingToast('Video bookmarked to your favourites!');
      } else if (act.type === 'watch_video') {
        setActiveWatchVideo(act.video);
        setPendingToast(`Account verified! Loading ${act.video.title}...`);
      }
    } catch (err) {
      console.error('Error executing pending action:', err);
    } finally {
      setPendingAction(null);
      setTimeout(() => setPendingToast(null), 4000);
    }
  };

  const subscribeToChef = async (chefId: string, chefName: string, plan: 'monthly' | 'annual', price: number) => {
    if (!currentUser) {
      throw new Error("AUTH_REQUIRED");
    }

    const subPath = 'subscriptions';
    try {
      const now = new Date();
      const expires = new Date();
      if (plan === 'annual') {
        expires.setFullYear(now.getFullYear() + 1);
      } else {
        expires.setMonth(now.getMonth() + 1);
      }

      const newSubRef = doc(collection(db, 'subscriptions'));
      const subData: Omit<Subscription, 'id'> = {
        userId: currentUser.uid,
        chefId,
        chefName,
        plan,
        price,
        status: 'active',
        startDate: now.toISOString(),
        expiresAt: expires.toISOString()
      };

      await setDoc(newSubRef, subData);

      try {
        const chefDocRef = doc(db, 'users', chefId);
        const chefSnap = await getDoc(chefDocRef);
        if (chefSnap.exists()) {
          const currentCount = chefSnap.data().subscriberCount || 0;
          await updateDoc(chefDocRef, { subscriberCount: currentCount + 1 });
        }
      } catch {
        // Silently continue if chef count cannot be incremented
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, subPath);
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!currentUser) return;
    const subPath = `subscriptions/${subscriptionId}`;
    try {
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, subPath);
    }
  };

  // Password Recovery / Reset Functions
  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/?mode=resetPassword',
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
    } catch (err: any) {
      // Security: Do not reveal whether an email address is registered
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        console.warn("Password reset requested for unrecognized email:", email);
        return;
      }
      throw err;
    }
  };

  const verifyResetCode = async (code: string): Promise<string> => {
    return await verifyPasswordResetCode(auth, code);
  };

  const confirmResetPassword = async (code: string, newPassword: string): Promise<void> => {
    await confirmPasswordReset(auth, code, newPassword);
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const isAdmin = isAuthorizedAdminUser(currentUser, hasAdminDoc);
  const blockedUserIds = blockedUsers.map((b) => b.blockedUserId);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        activeSubscriptions,
        favourites,
        videoFavourites,
        notifications,
        unreadNotificationCount,
        blockedUsers,
        blockedUserIds,
        cookiePreferences,
        pendingAction,
        pendingToast,
        activeWatchVideo,
        setActiveWatchVideo,
        setPendingToast,
        setPendingAction,
        executePendingAction,
        isSubscribedToChef,
        isRecipeBookmarked,
        isVideoBookmarked,
        createAccount,
        login,
        signInWithGoogle,
        acceptLatestLegalTerms,
        declineUpdatedLegalTerms,
        blockUser,
        unblockUser,
        updatePrivacySettings,
        updateCookiePreferences,
        signOut,
        updateProfileData,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toggleBookmark,
        toggleVideoBookmark,
        subscribeToChef,
        cancelSubscription,
        sendPasswordReset,
        verifyResetCode,
        confirmResetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
