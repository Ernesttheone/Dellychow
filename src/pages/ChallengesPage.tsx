import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Award, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Camera, 
  Heart, 
  MessageSquare, 
  Share2, 
  Filter, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  User, 
  ChefHat, 
  Lock, 
  X, 
  Edit3, 
  Trash2, 
  Check, 
  Info,
  ArrowRight,
  Vote,
  Plus
} from 'lucide-react';
import { Challenge, ChallengeEntry, ChallengeVote, UserBadge, UserRole } from '../types';
import { ChallengeService } from '../services/challengeService';
import { STARTER_CHALLENGES } from '../data/challenges';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';

interface ChallengesPageProps {
  onNavigate?: (view: string, params?: any) => void;
  onOpenAuthModal: () => void;
  onSelectChef?: (chefId: string) => void;
}

export const ChallengesPage: React.FC<ChallengesPageProps> = ({
  onNavigate,
  onOpenAuthModal,
  onSelectChef
}) => {
  const { currentUser, userProfile } = useAuth();

  const [challenges, setChallenges] = useState<Challenge[]>(STARTER_CHALLENGES);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('ch-winter-pasta');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'voting' | 'upcoming' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Entries for selected challenge
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [userVote, setUserVote] = useState<ChallengeVote | null>(null);

  // Submission Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittingDishTitle, setSubmittingDishTitle] = useState('');
  const [submittingCaption, setSubmittingCaption] = useState('');
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Editing existing entry
  const [editingEntry, setEditingEntry] = useState<ChallengeEntry | null>(null);

  // Confirm delete entry
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState<ChallengeEntry | null>(null);

  // Toast notice
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // User badges earned
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);

  // Listen to challenges
  useEffect(() => {
    const unsub = ChallengeService.listenToChallenges((loaded) => {
      setChallenges(loaded);
    });
    return () => unsub();
  }, []);

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId) || challenges[0];

  // Listen to entries for selected challenge
  useEffect(() => {
    if (!selectedChallenge) return;
    const unsub = ChallengeService.listenToChallengeEntries(selectedChallenge.id, (loaded) => {
      setEntries(loaded);
    });

    if (currentUser) {
      setUserVote(ChallengeService.getUserVote(selectedChallenge.id, currentUser.uid));
      setUserBadges(ChallengeService.getUserBadges(currentUser.uid));
    }

    return () => unsub();
  }, [selectedChallenge?.id, currentUser]);

  // Format countdown
  const getCountdownString = (deadlineIso: string): string => {
    const diff = new Date(deadlineIso).getTime() - Date.now();
    if (diff <= 0) return 'Closed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${mins}m left`;
  };

  // Filter challenges
  const filteredChallenges = challenges.filter(c => {
    const matchesTab = activeTab === 'all' ? true : c.status === activeTab;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.theme.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Check if current user already submitted to this challenge
  const myEntry = currentUser ? entries.find(e => e.userId === currentUser.uid) : null;

  // Handle entry submission
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedChallenge) {
      onOpenAuthModal();
      return;
    }

    if (!submittingDishTitle.trim()) {
      setSubmitError('Please enter your dish title.');
      return;
    }
    if (!selectedMediaUrl.trim()) {
      setSubmitError('Please provide a photo or video URL of your cooked dish.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (editingEntry) {
        await ChallengeService.updateEntry(
          selectedChallenge,
          editingEntry.id,
          currentUser.uid,
          submittingDishTitle,
          submittingCaption,
          [selectedMediaUrl]
        );
        setFeedbackToast('Entry successfully updated!');
      } else {
        await ChallengeService.submitEntry(
          selectedChallenge,
          currentUser.uid,
          userProfile?.displayName || 'Home Cook',
          userProfile?.role || 'user',
          userProfile?.photoURL,
          submittingDishTitle,
          submittingCaption,
          [selectedMediaUrl],
          mediaType
        );
        setFeedbackToast('Challenge entry submitted! You earned a new culinary badge.');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setShowSubmitModal(false);
        setEditingEntry(null);
        setSubmitSuccess(false);
        setSubmittingDishTitle('');
        setSubmittingCaption('');
        setSelectedMediaUrl('');
      }, 1200);
    } catch (err: any) {
      console.warn('Submit challenge entry notice:', err);
      setSubmitError(err.message || 'Failed to submit entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete my entry
  const handleDeleteMyEntry = async () => {
    if (!currentUser || !deleteEntryConfirm || !selectedChallenge) return;
    try {
      await ChallengeService.deleteEntry(selectedChallenge, deleteEntryConfirm.id, currentUser.uid);
      setFeedbackToast('Entry removed successfully.');
      setDeleteEntryConfirm(null);
    } catch (err: any) {
      setFeedbackToast(err.message || 'Could not delete entry.');
    }
  };

  // Handle voting
  const handleVote = async (entry: ChallengeEntry) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    try {
      const res = await ChallengeService.voteForEntry(
        selectedChallenge,
        entry.id,
        entry.userId,
        currentUser.uid
      );
      setUserVote(ChallengeService.getUserVote(selectedChallenge.id, currentUser.uid));
      setFeedbackToast(res.message);
    } catch (err: any) {
      console.warn('Voting notice:', err);
      setFeedbackToast(err.message || 'Unable to record vote.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedbackToast}</span>
          <button onClick={() => setFeedbackToast(null)} className="text-stone-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            Culinary Competitions &amp; Community Voting
          </span>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
            Cooking Challenges
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Test your culinary chops in weekly &amp; monthly themed competitions. Submit original dishes with photo or video proof, vote for community favorites, and earn verified badges.
          </p>
        </div>

        {/* User Badges Quick Ribbon */}
        {userBadges.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl flex items-center gap-3 shrink-0">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Your Culinary Badges ({userBadges.length})
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {userBadges.slice(0, 3).map(b => (
                  <span key={b.id} title={b.title} className="text-sm">
                    {b.icon}
                  </span>
                ))}
                {userBadges.length > 3 && (
                  <span className="text-[10px] text-amber-800 font-semibold">
                    +{userBadges.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'active' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Active Challenges ({challenges.filter(c => c.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('voting')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'voting' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Voting Open ({challenges.filter(c => c.status === 'voting').length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'upcoming' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Upcoming ({challenges.filter(c => c.status === 'upcoming').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'completed' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Past Winners ({challenges.filter(c => c.status === 'completed').length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search challenges by theme..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Challenge Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChallenges.map(ch => {
          const isSelected = ch.id === selectedChallenge.id;
          const countdown = getCountdownString(ch.status === 'voting' ? ch.votingPeriodEnd : ch.submissionDeadline);
          return (
            <div
              key={ch.id}
              onClick={() => setSelectedChallengeId(ch.id)}
              className={`rounded-3xl border overflow-hidden transition-all text-left flex flex-col justify-between cursor-pointer group ${
                isSelected
                  ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md bg-white'
                  : 'border-stone-200/80 bg-white hover:border-amber-300 hover:shadow-sm'
              }`}
            >
              <div className="relative aspect-16/10 bg-stone-100 overflow-hidden">
                <img
                  src={ch.coverImage}
                  alt={ch.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    ch.status === 'active'
                      ? 'bg-emerald-500/90 text-white'
                      : ch.status === 'voting'
                      ? 'bg-amber-500/90 text-white'
                      : ch.status === 'upcoming'
                      ? 'bg-blue-500/90 text-white'
                      : 'bg-stone-800/90 text-stone-200'
                  }`}>
                    {ch.status === 'active' ? 'Active Submissions' : ch.status === 'voting' ? 'Voting Live' : ch.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
                    {ch.type}
                  </span>
                </div>

                {/* Countdown banner */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                  <span className="flex items-center gap-1 font-semibold text-[11px] drop-shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>{countdown}</span>
                  </span>
                  <span className="text-[11px] font-medium text-stone-300 drop-shadow-sm">
                    {ch.entryCount} Entries
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    {ch.theme}
                  </span>
                  <h3 className="font-serif-display text-base font-bold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1 mt-0.5">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                    {ch.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-600">
                  <span className="flex items-center gap-1 text-[11px] text-amber-900 font-bold">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>{ch.badgesAwarded.winner}</span>
                  </span>
                  <span className="text-amber-700 group-hover:translate-x-0.5 transition-transform">
                    View Details →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED CHALLENGE DETAIL VIEW */}
      {selectedChallenge && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in">
          
          {/* Header Strip with Countdown and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-100">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedChallenge.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : selectedChallenge.status === 'voting'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-stone-100 text-stone-800'
                }`}>
                  {selectedChallenge.status} Challenge · {selectedChallenge.type}
                </span>
                <span className="text-xs text-stone-500">
                  Theme: <strong>{selectedChallenge.theme}</strong>
                </span>
              </div>

              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
                {selectedChallenge.title}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {selectedChallenge.description}
              </p>
            </div>

            {/* Submission / Status Action Card */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shrink-0 space-y-3 min-w-[260px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                  {selectedChallenge.status === 'voting' ? 'Voting Period Ends:' : 'Submission Deadline:'}
                </span>
                <span className="font-bold text-amber-800 tabular-nums">
                  {getCountdownString(selectedChallenge.status === 'voting' ? selectedChallenge.votingPeriodEnd : selectedChallenge.submissionDeadline)}
                </span>
              </div>

              <div className="text-[11px] text-stone-600 space-y-0.5">
                <p>Deadline: <strong>{new Date(selectedChallenge.submissionDeadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
                <p>Voting Period: <strong>{new Date(selectedChallenge.votingPeriodStart).toLocaleDateString()} - {new Date(selectedChallenge.votingPeriodEnd).toLocaleDateString()}</strong></p>
              </div>

              {selectedChallenge.status === 'active' && (
                myEntry ? (
                  <div className="pt-1 space-y-2">
                    <div className="p-2 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Entry Submitted: "{myEntry.dishTitle}"</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEntry(myEntry);
                          setSubmittingDishTitle(myEntry.dishTitle);
                          setSubmittingCaption(myEntry.caption || '');
                          setSelectedMediaUrl(myEntry.mediaUrls[0] || '');
                          setShowSubmitModal(true);
                        }}
                        className="flex-1 py-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold rounded-lg"
                      >
                        Edit Entry
                      </button>
                      <button
                        onClick={() => setDeleteEntryConfirm(myEntry)}
                        className="p-1.5 text-stone-400 hover:text-red-600"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!currentUser) onOpenAuthModal();
                      else {
                        setEditingEntry(null);
                        setSubmittingDishTitle('');
                        setSubmittingCaption('');
                        setSelectedMediaUrl('');
                        setShowSubmitModal(true);
                      }
                    }}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit Challenge Entry</span>
                  </button>
                )
              )}

              {selectedChallenge.status === 'completed' && selectedChallenge.winnerDishTitle && (
                <div className="p-2.5 bg-white rounded-xl border border-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-1 text-amber-800 font-bold text-[11px]">
                    <span>🏆</span>
                    <span>Winner Announced</span>
                  </div>
                  <p className="font-serif-display font-bold text-stone-900 text-xs">
                    {selectedChallenge.winnerDishTitle}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    by {selectedChallenge.winnerUserName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rules & Requirements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" />
                Participation Rules
              </h4>
              <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside">
                {selectedChallenge.rules.map((rule, idx) => (
                  <li key={idx} className="leading-snug">{rule}</li>
                ))}
              </ul>
            </div>

            {selectedChallenge.requiredIngredients && (
              <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Required Key Elements
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedChallenge.requiredIngredients.map((ing, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800">
                      {ing}
                    </span>
                  ))}
                </div>
                {selectedChallenge.formatRequirements && (
                  <p className="text-[11px] text-stone-500 pt-1 leading-snug">
                    Format: {selectedChallenge.formatRequirements}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-700" />
                Prizes &amp; Badges
              </h4>
              {selectedChallenge.prizes && (
                <div className="text-xs text-amber-900 space-y-1">
                  <p><strong>1st Place:</strong> {selectedChallenge.prizes.firstPlace}</p>
                  {selectedChallenge.prizes.secondPlace && (
                    <p className="text-amber-800"><strong>2nd Place:</strong> {selectedChallenge.prizes.secondPlace}</p>
                  )}
                </div>
              )}
              <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2 text-xs">
                <span className="text-lg">🏅</span>
                <span className="text-[11px] text-amber-900 font-semibold">
                  Badge: {selectedChallenge.badgesAwarded.participation} (all participants) &amp; {selectedChallenge.badgesAwarded.winner} (champion)
                </span>
              </div>
            </div>
          </div>

          {/* Submitted Entries & Community Voting Gallery */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif-display text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>Community Entries ({entries.length})</span>
                  {selectedChallenge.status === 'voting' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                      Voting Active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedChallenge.status === 'voting'
                    ? 'Signed-in users can cast 1 vote for their favorite dish. Self-voting is strictly forbidden.'
                    : 'Browse entries submitted by passionate home cooks and professional chefs.'}
                </p>
              </div>

              {currentUser && userVote && (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Your vote is cast for an entry</span>
                </span>
              )}
            </div>

            {entries.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <Trophy className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500">Be the first to submit an entry to this challenge!</p>
                {selectedChallenge.status === 'active' && (
                  <button
                    onClick={() => {
                      if (!currentUser) onOpenAuthModal();
                      else setShowSubmitModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"
                  >
                    Submit First Entry
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {entries.map(entry => {
                  const hasVotedThis = userVote?.entryId === entry.id;
                  const isMyOwn = currentUser?.uid === entry.userId;
                  return (
                    <div
                      key={entry.id}
                      className={`bg-white rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                        entry.status === 'winner'
                          ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                          : 'border-stone-200/80 hover:shadow-xs'
                      }`}
                    >
                      <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                        <img
                          src={entry.mediaUrls[0] || selectedChallenge.coverImage}
                          alt={entry.dishTitle}
                          className="w-full h-full object-cover"
                        />
                        {entry.status === 'winner' && (
                          <div className="absolute top-2.5 left-2.5 bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                            <span>🏆</span>
                            <span>Challenge Champion</span>
                          </div>
                        )}
                        <div className="absolute bottom-2.5 right-2.5 bg-stone-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-xs font-bold tabular-nums">
                          {entry.voteCount} Votes
                        </div>
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-serif-display text-base font-bold text-stone-900 line-clamp-1">
                            {entry.dishTitle}
                          </h4>
                          {entry.caption && (
                            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                              {entry.caption}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar
                              src={entry.userPhoto}
                              name={entry.userName}
                              seed={entry.userId}
                              size="sm"
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-stone-900 truncate">
                                {entry.userName}
                              </p>
                              <span className="text-[10px] text-stone-400 uppercase font-semibold">
                                {entry.userRole === 'chef' ? 'Pro Chef' : 'Home Cook'}
                              </span>
                            </div>
                          </div>

                          {/* Voting Button */}
                          {selectedChallenge.status === 'voting' && (
                            <button
                              type="button"
                              onClick={() => handleVote(entry)}
                              disabled={isMyOwn}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer ${
                                hasVotedThis
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              }`}
                              title={isMyOwn ? 'Cannot vote for your own entry' : hasVotedThis ? 'Click to withdraw vote' : 'Vote for this dish'}
                            >
                              <Vote className="w-3.5 h-3.5" />
                              <span>{hasVotedThis ? 'Voted' : 'Vote'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBMISSION / EDIT MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-display text-base font-bold text-stone-900">
                    {editingEntry ? 'Edit Challenge Entry' : `Submit Entry: ${selectedChallenge.title}`}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Accepted formats: High-res photos (JPG, PNG) or video clip under 90s.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-serif-display text-lg font-bold text-stone-900">
                    Entry Confirmed!
                  </h4>
                  <p className="text-xs text-stone-500">
                    Your dish is live in the competition gallery. You also earned the "{selectedChallenge.badgesAwarded.participation}" badge!
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Dish Title *
                    </label>
                    <input
                      type="text"
                      value={submittingDishTitle}
                      onChange={e => setSubmittingDishTitle(e.target.value)}
                      placeholder="e.g. 36-Yolk Tagliatelle with Shaved Winter Truffle"
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Dish Story &amp; Technique Notes *
                    </label>
                    <textarea
                      value={submittingCaption}
                      onChange={e => setSubmittingCaption(e.target.value)}
                      placeholder="Describe your dough hydration, pan temperatures, emulsion technique, and ingredients used..."
                      required
                      rows={3}
                      className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Photo or Video Proof URL *
                    </label>
                    <input
                      type="url"
                      value={selectedMediaUrl}
                      onChange={e => setSelectedMediaUrl(e.target.value)}
                      placeholder="https://... image or video URL"
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-500">
                      <span>Quick sample asset:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMediaUrl(selectedChallenge.coverImage)}
                        className="text-amber-700 hover:underline font-semibold"
                      >
                        Use Plated Masterpiece Photo
                      </button>
                    </div>
                  </div>

                  {selectedMediaUrl && (
                    <div className="pt-2">
                      <p className="text-[11px] text-stone-400 mb-1">Media Preview:</p>
                      <div className="aspect-16/9 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 max-h-48">
                        <img
                          src={selectedMediaUrl}
                          alt="Entry preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : editingEntry ? 'Save Changes' : 'Confirm & Submit Entry'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ENTRY MODAL */}
      {deleteEntryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                Withdraw Challenge Entry?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to remove <strong>"{deleteEntryConfirm.dishTitle}"</strong> from the competition? You can resubmit before the deadline.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteEntryConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMyEntry}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
