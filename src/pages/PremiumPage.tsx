import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  MessageSquare, 
  Video, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  ChefHat, 
  Calendar,
  Clock,
  DollarSign,
  UserCheck,
  AlertCircle,
  X,
  Send,
  Ticket
} from 'lucide-react';
import { CookingVideo, Masterclass, MasterclassRegistration } from '../types';
import { useAuth } from '../context/AuthContext';
import { CommunityChat } from '../components/CommunityChat';
import { VideoCard } from '../components/VideoCard';
import { ASSET_IMAGES } from '../assets/images';
import { STARTER_MASTERCLASSES } from '../data/masterclasses';
import { RecipeService } from '../services/recipeService';

interface PremiumPageProps {
  videos: CookingVideo[];
  onPlayVideo: (video: CookingVideo) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onSelectChef: (chefId: string) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
}

export const PremiumPage: React.FC<PremiumPageProps> = ({
  videos,
  onPlayVideo,
  onRequestSubscribe,
  onSelectChef,
  onOpenAuthModal
}) => {
  const { currentUser, userProfile, activeSubscriptions, cancelSubscription, isSubscribedToChef } = useAuth();
  const [selectedChatChefId, setSelectedChatChefId] = useState<string | null>(null);

  // VIP Masterclasses data
  const [masterclasses] = useState<Masterclass[]>(STARTER_MASTERCLASSES);
  const [userRegistrations, setUserRegistrations] = useState<MasterclassRegistration[]>([]);

  // Registration Modal State
  const [selectedMasterclass, setSelectedMasterclass] = useState<Masterclass | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState<MasterclassRegistration | null>(null);

  // VIP Videos
  const vipVideos = videos.filter(v => v.isPremium);

  // Featured chefs offering VIP memberships
  const featuredVipChefs = [
    {
      id: 'chef-david-chen',
      name: 'Chef David Chen',
      photo: ASSET_IMAGES.chefAvatar,
      specialty: 'Handmade Pasta & French Bistro Pastry',
      monthlyPrice: 9.99,
      perks: [
        'Weekly live masterclasses with step-by-step guidance',
        'Direct culinary troubleshooting in the VIP kitchen chat',
        'Private library of secret recipes and mother sauce ratios'
      ]
    }
  ];

  // Listen to user's registered masterclasses from Firestore
  useEffect(() => {
    if (!currentUser) {
      setUserRegistrations([]);
      return;
    }
    const unsub = RecipeService.listenToUserMasterclasses(currentUser.uid, (regs) => {
      setUserRegistrations(regs);
    });
    return () => unsub();
  }, [currentUser]);

  // Open Registration Modal
  const handleOpenRegister = (mc: Masterclass) => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    setSelectedMasterclass(mc);
    setApplicantName(userProfile?.displayName || currentUser.displayName || '');
    setApplicantEmail(userProfile?.email || currentUser.email || '');
    setRegistrationError(null);
    setConfirmedRegistration(null);
  };

  // Submit Registration (strictly confirms ONLY after successful Firestore response)
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedMasterclass) return;
    if (!applicantName.trim() || !applicantEmail.trim()) {
      setRegistrationError('Please provide your full name and email address.');
      return;
    }

    setRegistering(true);
    setRegistrationError(null);

    try {
      const reg = await RecipeService.registerMasterclass({
        masterclassId: selectedMasterclass.id,
        masterclassTitle: selectedMasterclass.title,
        chefId: selectedMasterclass.chefId,
        chefName: selectedMasterclass.chefName,
        userId: currentUser.uid,
        userName: applicantName.trim(),
        userEmail: applicantEmail.trim(),
        cookingSkillLevel: skillLevel,
        dietaryNotes: dietaryNotes.trim() || undefined
      });

      // Successful write to Firestore: now and only now display as confirmed
      setConfirmedRegistration(reg);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setRegistrationError(err.message || 'Unable to complete masterclass registration. Please verify your connection.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 text-white p-8 sm:p-12 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            <span>DellyChow VIP Culinary Communities</span>
          </div>

          <h1 className="font-serif-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Learn Directly From World-Class Chefs.
          </h1>

          <p className="text-stone-200 text-xs sm:text-base leading-relaxed">
            Support your favorite culinary creators, apply for live VIP cooking masterclasses, and engage in private group discussions where chefs review your cooking techniques.
          </p>
        </div>
      </div>

      {/* Distinction Banner: Free vs VIP Masterclasses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Public Free Tutorials
            </span>
            <p className="text-xs text-emerald-950 mt-1 leading-relaxed">
              Accessible to all registered users and guests. Free tutorials showcase essential techniques, kitchen knife skills, and foundational step-by-step cooking videos with zero subscription fee.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
              VIP Cooking Masterclasses
            </span>
            <p className="text-xs text-amber-950 mt-1 leading-relaxed">
              Curated, interactive live masterclasses hosted by verified master chefs. Features real-time Q&A, detailed technique critique, secret sauce chemistry, and small participant sizes.
            </p>
          </div>
        </div>
      </div>

      {/* User's Confirmed Masterclasses Section */}
      {currentUser && userRegistrations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-600" />
            <h2 className="font-serif-display text-2xl font-bold text-stone-900">
              Your Confirmed VIP Masterclasses ({userRegistrations.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRegistrations.map((reg) => (
              <div 
                key={reg.id}
                className="p-5 rounded-2xl bg-white border border-amber-300 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Confirmed Registration
                    </span>
                    <h3 className="font-serif-display text-base font-bold text-stone-900 mt-1.5">
                      {reg.masterclassTitle}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Chef: <strong>{reg.chefName}</strong> · Skill: <span className="capitalize">{reg.cookingSkillLevel}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-stone-400 block font-semibold">Confirmation</span>
                    <span className="font-mono text-xs font-bold text-amber-800">{reg.confirmationCode}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-[11px]">Registered on {new Date(reg.registeredAt).toLocaleDateString()}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Seat Reserved
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIP Cooking Masterclasses Offered by Chefs */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Interactive Live Masterclasses</span>
          </div>
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
            VIP Cooking Masterclasses
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Browse upcoming live masterclasses led by world chefs. Review topics, schedules, and submit your registration application.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {masterclasses.map((mc) => {
            const isRegistered = userRegistrations.some(r => r.masterclassId === mc.id);
            const isSubscriber = isSubscribedToChef(mc.chefId);

            return (
              <div 
                key={mc.id}
                className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Masterclass Image */}
                  <div className="relative aspect-16/10 bg-stone-900 overflow-hidden">
                    <img 
                      src={mc.imageUrl} 
                      alt={mc.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      <span>VIP Masterclass</span>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-stone-950/80 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{mc.durationMinutes} mins</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                        Topic: {mc.topic}
                      </p>
                      <h3 className="font-serif-display text-lg font-bold text-stone-900 leading-snug">
                        {mc.title}
                      </h3>
                    </div>

                    {/* Schedule & Chef Info */}
                    <div className="p-3 bg-stone-50 rounded-xl space-y-2 border border-stone-100 text-xs">
                      <div className="flex items-center gap-2 text-stone-700">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-semibold">{mc.schedule}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-stone-600">
                        <span>Led by <strong>{mc.chefName}</strong></span>
                        <button 
                          onClick={() => onSelectChef(mc.chefId)}
                          className="text-amber-700 hover:underline font-medium text-[11px]"
                        >
                          View Bio
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {mc.description}
                    </p>

                    {/* Pricing */}
                    <div className="pt-2 flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-stone-400 block uppercase font-medium">Price</span>
                        <span className="font-serif-display text-2xl font-bold text-stone-900">
                          ${mc.price}
                        </span>
                        {isSubscriber && (
                          <span className="text-[11px] text-emerald-700 font-semibold block">
                            Included with your VIP membership
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-stone-400 block uppercase font-medium">Seats</span>
                        <span className="text-xs font-semibold text-stone-700">
                          {mc.currentParticipants}/{mc.maxParticipants} Enrolled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 sm:p-6 pt-0">
                  {isRegistered ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Registration Confirmed</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenRegister(mc)}
                      className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Apply & Register</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active VIP Subscriptions Section */}
      {currentUser && (
        <div className="space-y-4 pt-6 border-t border-stone-200">
          <h2 className="font-serif-display text-2xl font-bold text-stone-900">
            Your Active VIP Kitchen Circles ({activeSubscriptions.length})
          </h2>

          {activeSubscriptions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2">
              <p className="text-xs sm:text-sm text-stone-600">
                You do not currently have any active chef VIP memberships. Join a chef circle below to unlock group chats and full masterclass perks!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSubscriptions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif-display text-base font-bold text-stone-900">
                          {sub.chefName || 'Chef VIP Kitchen'}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 capitalize">
                        Plan: {sub.plan} · Valid until {new Date(sub.expiresAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => cancelSubscription(sub.id)}
                      className="text-[11px] text-stone-400 hover:text-red-600 font-medium transition-colors"
                      title="Cancel Subscription"
                    >
                      Cancel Membership
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setSelectedChatChefId(selectedChatChefId === sub.chefId ? null : sub.chefId)}
                      className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{selectedChatChefId === sub.chefId ? 'Close Group Chat' : 'Enter VIP Group Chat'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Render Active Community Chat if opened */}
          {selectedChatChefId && (
            <div className="pt-4">
              <CommunityChat
                chefId={selectedChatChefId}
                chefName={activeSubscriptions.find(s => s.chefId === selectedChatChefId)?.chefName || 'Head Chef'}
              />
            </div>
          )}
        </div>
      )}

      {/* Available Chef Circles to Join */}
      <div className="space-y-6 pt-6 border-t border-stone-200">
        <div>
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
            Featured Chef VIP Kitchens
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Choose a culinary master to join and start cooking together.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredVipChefs.map((chef) => (
            <div 
              key={chef.id}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={chef.photo}
                    alt={chef.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-500/20"
                  />
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-stone-900">{chef.name}</h3>
                    <p className="text-xs text-amber-700 font-semibold">{chef.specialty}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="font-serif-display text-3xl font-bold text-stone-900">${chef.monthlyPrice}</span>
                  <span className="text-xs text-stone-500">/ month</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Member Perks:</p>
                  {chef.perks.map((p, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-stone-600">
                      <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRequestSubscribe(chef.id, chef.name)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-200" />
                <span>Join VIP Circle</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusive VIP Masterclass Cooking Tutorials */}
      <div className="space-y-6 pt-6 border-t border-stone-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
            <Video className="w-4 h-4" />
            <span>Subscriber Only Tutorials</span>
          </div>
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
            VIP Masterclass Cooking Videos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            In-depth multi-part technique series reserved for active VIP kitchen members.
          </p>
        </div>

        {vipVideos.length === 0 ? (
          <p className="text-xs text-stone-500">No VIP videos posted yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vipVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={onPlayVideo}
                onRequestSubscribe={onRequestSubscribe}
              />
            ))}
          </div>
        )}
      </div>

      {/* Masterclass Registration Modal */}
      {selectedMasterclass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in">
          <div 
            className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  VIP Masterclass Registration
                </span>
                <h3 className="font-serif-display text-lg font-bold text-stone-900 line-clamp-1">
                  {selectedMasterclass.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedMasterclass(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Either Confirmed Success or Form */}
            <div className="p-6 overflow-y-auto space-y-5">
              {confirmedRegistration ? (
                /* Strict requirement: Confirmation is shown only upon confirmed Firestore write */
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                    <Check className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                      Registration Confirmed
                    </span>
                    <h4 className="font-serif-display text-xl font-bold text-stone-900 mt-2">
                      You are Enrolled!
                    </h4>
                    <p className="text-xs text-stone-600 max-w-sm mx-auto">
                      Chef {selectedMasterclass.chefName} has reserved your seat for <strong>{selectedMasterclass.title}</strong>.
                    </p>
                  </div>

                  {/* Confirmation Ticket Card */}
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-amber-200">
                      <span className="text-stone-600 font-medium">Confirmation Code:</span>
                      <span className="font-mono font-bold text-amber-900 text-sm">
                        {confirmedRegistration.confirmationCode}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600 font-medium">Schedule:</span>
                      <span className="font-semibold text-stone-900">{selectedMasterclass.schedule}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600 font-medium">Attendee:</span>
                      <span className="font-semibold text-stone-900">{confirmedRegistration.userName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedMasterclass(null)}
                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Registration Application Form */
                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  {registrationError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{registrationError}</span>
                    </div>
                  )}

                  {/* Masterclass Summary Strip */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                    <p className="font-semibold text-stone-900">Topic: {selectedMasterclass.topic}</p>
                    <p className="text-stone-600">Instructor: Chef {selectedMasterclass.chefName}</p>
                    <p className="text-amber-800 font-medium">{selectedMasterclass.schedule}</p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input 
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input 
                      type="email"
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Skill level */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Your Cooking Experience
                    </label>
                    <select
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="beginner">Beginner (Comfortable with basics)</option>
                      <option value="intermediate">Intermediate (Regular home cook)</option>
                      <option value="advanced">Advanced / Professional</option>
                    </select>
                  </div>

                  {/* Dietary notes */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Dietary Restrictions or Questions for the Chef (Optional)
                    </label>
                    <textarea 
                      rows={2}
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      placeholder="e.g. Vegetarian substitute questions, knife grip issues..."
                      className="w-full p-3 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      maxLength={300}
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={registering}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {registering ? (
                        <span>Processing Registration...</span>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Confirm & Submit Application</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-stone-400 text-center mt-2">
                      Masterclass confirmations are generated automatically upon successful enrollment.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
