import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Challenge, ChallengeEntry, ChallengeVote, UserBadge, UserRole } from '../types';
import { STARTER_CHALLENGES, STARTER_ENTRIES, STARTER_BADGES } from '../data/challenges';

const LOCAL_CHALLENGES_KEY = 'dellychow_challenges';
const LOCAL_ENTRIES_KEY = 'dellychow_challenge_entries';
const LOCAL_VOTES_KEY = 'dellychow_challenge_votes';
const LOCAL_BADGES_KEY = 'dellychow_user_badges';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Local storage read error for ${key}:`, e);
  }
  return fallback;
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Local storage write error for ${key}:`, e);
  }
}

export const ChallengeService = {
  // Listen to challenges
  listenToChallenges(callback: (challenges: Challenge[]) => void): () => void {
    const local = getLocal<Challenge[]>(LOCAL_CHALLENGES_KEY, STARTER_CHALLENGES);
    callback(local);

    try {
      const challengesRef = collection(db, 'challenges');
      const unsubscribe = onSnapshot(challengesRef, (snapshot) => {
        if (!snapshot.empty) {
          const items: Challenge[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Challenge, 'id'>) });
          });
          // Merge with starter challenges if some aren't in firestore
          const merged = [...items];
          for (const st of STARTER_CHALLENGES) {
            if (!merged.some(m => m.id === st.id)) {
              merged.push(st);
            }
          }
          setLocal(LOCAL_CHALLENGES_KEY, merged);
          callback(merged);
        } else {
          callback(local);
        }
      }, (err) => {
        console.warn('Firestore challenges listener notice:', err);
        callback(local);
      });

      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  // Listen to entries for a specific challenge
  listenToChallengeEntries(challengeId: string, callback: (entries: ChallengeEntry[]) => void): () => void {
    const allEntries = getLocal<ChallengeEntry[]>(LOCAL_ENTRIES_KEY, STARTER_ENTRIES);
    const filtered = allEntries.filter(e => e.challengeId === challengeId);
    callback(filtered);

    try {
      const entriesRef = collection(db, 'challenge_entries');
      const q = query(entriesRef, where('challengeId', '==', challengeId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const remote: ChallengeEntry[] = [];
          snapshot.forEach((docSnap) => {
            remote.push({ id: docSnap.id, ...(docSnap.data() as Omit<ChallengeEntry, 'id'>) });
          });
          // Merge with starter entries
          const merged = [...remote];
          for (const se of STARTER_ENTRIES.filter(e => e.challengeId === challengeId)) {
            if (!merged.some(m => m.id === se.id)) {
              merged.push(se);
            }
          }
          // Sort by votes then newest
          merged.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
          callback(merged);
        } else {
          callback(filtered);
        }
      }, (err) => {
        console.warn('Firestore entries listener notice:', err);
        callback(filtered);
      });

      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  // Submit new challenge entry
  async submitEntry(
    challenge: Challenge,
    userId: string,
    userName: string,
    userRole: UserRole,
    userPhoto: string | undefined,
    dishTitle: string,
    caption: string,
    mediaUrls: string[],
    mediaType: 'image' | 'video' | 'mixed'
  ): Promise<ChallengeEntry> {
    // 1. Verify deadline
    const deadlineTime = new Date(challenge.submissionDeadline).getTime();
    if (Date.now() > deadlineTime) {
      throw new Error(`The submission deadline for this challenge passed on ${new Date(challenge.submissionDeadline).toLocaleDateString()}. New entries are closed.`);
    }

    const newId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: ChallengeEntry = {
      id: newId,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      userId,
      userName,
      userPhoto,
      userRole,
      dishTitle: dishTitle.trim(),
      caption: caption.trim(),
      mediaUrls,
      mediaType,
      voteCount: 0,
      status: 'eligible',
      submittedAt: new Date().toISOString()
    };

    // Update local cache
    const currentEntries = getLocal<ChallengeEntry[]>(LOCAL_ENTRIES_KEY, STARTER_ENTRIES);
    currentEntries.unshift(newEntry);
    setLocal(LOCAL_ENTRIES_KEY, currentEntries);

    // Update challenge entry count
    const allChallenges = getLocal<Challenge[]>(LOCAL_CHALLENGES_KEY, STARTER_CHALLENGES);
    const ch = allChallenges.find(c => c.id === challenge.id);
    if (ch) {
      ch.entryCount = (ch.entryCount || 0) + 1;
      setLocal(LOCAL_CHALLENGES_KEY, allChallenges);
    }

    // Award Participation Badge (check for duplicate)
    await this.awardBadge(
      userId,
      `badge_${challenge.id}_participant`,
      `${challenge.badgesAwarded.participation}`,
      `Awarded for submitting "${dishTitle.trim()}" to the ${challenge.title}.`,
      '🍳',
      challenge.id,
      challenge.title,
      'participation'
    );

    // Persist to Firestore
    try {
      const entryRef = doc(db, 'challenge_entries', newId);
      await setDoc(entryRef, newEntry);

      const chRef = doc(db, 'challenges', challenge.id);
      await updateDoc(chRef, { entryCount: (challenge.entryCount || 0) + 1 });
    } catch (e) {
      console.warn('Firestore entry submit notice, cached locally:', e);
    }

    return newEntry;
  },

  // Edit existing entry
  async updateEntry(
    challenge: Challenge,
    entryId: string,
    userId: string,
    dishTitle: string,
    caption: string,
    mediaUrls: string[]
  ): Promise<void> {
    const deadlineTime = new Date(challenge.submissionDeadline).getTime();
    if (Date.now() > deadlineTime) {
      throw new Error('Entries cannot be modified after the submission deadline.');
    }

    const currentEntries = getLocal<ChallengeEntry[]>(LOCAL_ENTRIES_KEY, STARTER_ENTRIES);
    const entry = currentEntries.find(e => e.id === entryId);
    if (!entry) throw new Error('Entry not found.');
    if (entry.userId !== userId) throw new Error('You do not have permission to edit this entry.');

    entry.dishTitle = dishTitle.trim();
    entry.caption = caption.trim();
    if (mediaUrls.length > 0) entry.mediaUrls = mediaUrls;
    entry.updatedAt = new Date().toISOString();

    setLocal(LOCAL_ENTRIES_KEY, currentEntries);

    try {
      const entryRef = doc(db, 'challenge_entries', entryId);
      await updateDoc(entryRef, {
        dishTitle: entry.dishTitle,
        caption: entry.caption,
        mediaUrls: entry.mediaUrls,
        updatedAt: entry.updatedAt
      });
    } catch (e) {
      console.warn('Firestore entry update notice:', e);
    }
  },

  // Delete entry before deadline
  async deleteEntry(challenge: Challenge, entryId: string, userId: string): Promise<void> {
    const deadlineTime = new Date(challenge.submissionDeadline).getTime();
    if (Date.now() > deadlineTime) {
      throw new Error('Entries cannot be removed after the submission deadline.');
    }

    const currentEntries = getLocal<ChallengeEntry[]>(LOCAL_ENTRIES_KEY, STARTER_ENTRIES);
    const entry = currentEntries.find(e => e.id === entryId);
    if (!entry) throw new Error('Entry not found.');
    if (entry.userId !== userId) throw new Error('You do not have permission to delete this entry.');

    const remaining = currentEntries.filter(e => e.id !== entryId);
    setLocal(LOCAL_ENTRIES_KEY, remaining);

    // Update challenge entry count
    const allChallenges = getLocal<Challenge[]>(LOCAL_CHALLENGES_KEY, STARTER_CHALLENGES);
    const ch = allChallenges.find(c => c.id === challenge.id);
    if (ch && ch.entryCount > 0) {
      ch.entryCount -= 1;
      setLocal(LOCAL_CHALLENGES_KEY, allChallenges);
    }

    try {
      const entryRef = doc(db, 'challenge_entries', entryId);
      await deleteDoc(entryRef);

      if (ch) {
        const chRef = doc(db, 'challenges', challenge.id);
        await updateDoc(chRef, { entryCount: ch.entryCount });
      }
    } catch (e) {
      console.warn('Firestore entry delete notice:', e);
    }
  },

  // Community Voting
  async voteForEntry(
    challenge: Challenge,
    entryId: string,
    entryAuthorId: string,
    voterUserId: string
  ): Promise<{ message: string; newVoteCount: number }> {
    // 1. Check voting period
    const now = Date.now();
    const votingStart = new Date(challenge.votingPeriodStart || challenge.startDate).getTime();
    const votingEnd = new Date(challenge.votingPeriodEnd || challenge.submissionDeadline).getTime();

    if (now < votingStart) {
      throw new Error(`Voting opens on ${new Date(votingStart).toLocaleDateString()}. Please check back then!`);
    }
    if (now > votingEnd) {
      throw new Error(`Voting for this challenge has closed as of ${new Date(votingEnd).toLocaleDateString()}. Final results are published.`);
    }

    // 2. Prevent self-voting
    if (entryAuthorId === voterUserId) {
      throw new Error('Culinary competition rules forbid voting for your own dish entry.');
    }

    // 3. Check existing vote for this user in this challenge
    const allVotes = getLocal<ChallengeVote[]>(LOCAL_VOTES_KEY, []);
    const existingVoteIndex = allVotes.findIndex(v => v.challengeId === challenge.id && v.userId === voterUserId);

    const allEntries = getLocal<ChallengeEntry[]>(LOCAL_ENTRIES_KEY, STARTER_ENTRIES);
    const targetEntry = allEntries.find(e => e.id === entryId);
    if (!targetEntry) throw new Error('Entry not found.');

    if (existingVoteIndex >= 0) {
      const prevVote = allVotes[existingVoteIndex];
      if (prevVote.entryId === entryId) {
        // Toggle/Remove vote
        allVotes.splice(existingVoteIndex, 1);
        targetEntry.voteCount = Math.max(0, (targetEntry.voteCount || 1) - 1);
        setLocal(LOCAL_VOTES_KEY, allVotes);
        setLocal(LOCAL_ENTRIES_KEY, allEntries);

        try {
          await deleteDoc(doc(db, 'challenge_votes', prevVote.id));
          await updateDoc(doc(db, 'challenge_entries', entryId), { voteCount: targetEntry.voteCount });
        } catch {}

        return { message: 'Your vote has been removed.', newVoteCount: targetEntry.voteCount };
      } else {
        // Switch vote to new entry
        const prevEntry = allEntries.find(e => e.id === prevVote.entryId);
        if (prevEntry) {
          prevEntry.voteCount = Math.max(0, (prevEntry.voteCount || 1) - 1);
        }
        targetEntry.voteCount = (targetEntry.voteCount || 0) + 1;
        prevVote.entryId = entryId;
        prevVote.votedAt = new Date().toISOString();

        setLocal(LOCAL_VOTES_KEY, allVotes);
        setLocal(LOCAL_ENTRIES_KEY, allEntries);

        try {
          await updateDoc(doc(db, 'challenge_votes', prevVote.id), { entryId, votedAt: prevVote.votedAt });
          await updateDoc(doc(db, 'challenge_entries', entryId), { voteCount: targetEntry.voteCount });
          if (prevEntry) {
            await updateDoc(doc(db, 'challenge_entries', prevEntry.id), { voteCount: prevEntry.voteCount });
          }
        } catch {}

        return { message: 'Your vote has been updated to this dish!', newVoteCount: targetEntry.voteCount };
      }
    }

    // New Vote
    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVote: ChallengeVote = {
      id: voteId,
      challengeId: challenge.id,
      entryId,
      userId: voterUserId,
      votedAt: new Date().toISOString()
    };

    allVotes.push(newVote);
    targetEntry.voteCount = (targetEntry.voteCount || 0) + 1;

    setLocal(LOCAL_VOTES_KEY, allVotes);
    setLocal(LOCAL_ENTRIES_KEY, allEntries);

    try {
      await setDoc(doc(db, 'challenge_votes', voteId), newVote);
      await updateDoc(doc(db, 'challenge_entries', entryId), { voteCount: targetEntry.voteCount });
    } catch {}

    return { message: 'Vote successfully recorded! Thank you for supporting community creators.', newVoteCount: targetEntry.voteCount };
  },

  // Check if user has voted in a challenge
  getUserVote(challengeId: string, userId: string): ChallengeVote | null {
    if (!userId) return null;
    const allVotes = getLocal<ChallengeVote[]>(LOCAL_VOTES_KEY, []);
    return allVotes.find(v => v.challengeId === challengeId && v.userId === userId) || null;
  },

  // Award user badge without duplicates
  async awardBadge(
    userId: string,
    badgeId: string,
    title: string,
    description: string,
    icon: string,
    challengeId?: string,
    challengeTitle?: string,
    category: 'participation' | 'winner' | 'mastery' = 'participation'
  ): Promise<UserBadge | null> {
    const allBadges = getLocal<UserBadge[]>(LOCAL_BADGES_KEY, STARTER_BADGES);

    // Duplicate check
    const existing = allBadges.find(b => b.userId === userId && b.badgeId === badgeId);
    if (existing) return null;

    const id = `ub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBadge: UserBadge = {
      id,
      userId,
      badgeId,
      title,
      description,
      icon,
      challengeId,
      challengeTitle,
      category,
      earnedAt: new Date().toISOString()
    };

    allBadges.push(newBadge);
    setLocal(LOCAL_BADGES_KEY, allBadges);

    try {
      await setDoc(doc(db, 'user_badges', id), newBadge);
    } catch {}

    return newBadge;
  },

  // Get user badges
  getUserBadges(userId: string): UserBadge[] {
    if (!userId) return [];
    const all = getLocal<UserBadge[]>(LOCAL_BADGES_KEY, STARTER_BADGES);
    return all.filter(b => b.userId === userId);
  }
};
