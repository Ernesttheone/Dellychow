import React, { useState } from 'react';
import { X, Crown, Check, ShieldCheck, Sparkles, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chefId: string;
  chefName: string;
  chefPhoto?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  chefId,
  chefName,
  chefPhoto
}) => {
  const { currentUser, subscribeToChef, isSubscribedToChef } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const alreadySubscribed = isSubscribedToChef(chefId);

  const perks = [
    'Private VIP Chef Community Group Chat with real-time replies',
    'Unrestricted access to all Masterclass & exclusive cooking videos',
    'Secret family ingredient ratios & downloadable chef notes',
    'Monthly live cooking Q&A & personalized kitchen troubleshooting'
  ];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const price = selectedPlan === 'annual' ? 89.99 : 9.99;
      await subscribeToChef(chefId, chefName, selectedPlan, price);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xl max-w-lg w-full flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-800 text-white p-6 sm:p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-amber-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-white/10 ring-4 ring-white/20 mx-auto flex items-center justify-center mb-3">
            <Crown className="w-8 h-8 text-amber-200" />
          </div>

          <h3 className="font-serif-display text-2xl font-bold tracking-tight mb-1">
            Join {chefName}&apos;s VIP Circle
          </h3>
          <p className="text-xs text-amber-100 max-w-sm mx-auto">
            Elevate your culinary repertoire with direct access, exclusive tutorials, and private community discussions.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {alreadySubscribed ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">You Are Already a VIP Member!</h4>
              <p className="text-xs text-emerald-700">
                You have active, full VIP privileges for {chefName}&apos;s kitchen, masterclass tutorials, and group chat.
              </p>
            </div>
          ) : success ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-serif-display text-lg font-bold text-emerald-900">
                Welcome to the VIP Kitchen!
              </h4>
              <p className="text-xs text-emerald-700">
                Your subscription is active. All exclusive videos and the private group chat are now unlocked!
              </p>
            </div>
          ) : (
            <>
              {/* Plan Choice Tabs */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedPlan === 'monthly'
                      ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1">
                    Monthly
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif-display text-2xl font-bold text-stone-900">$9.99</span>
                    <span className="text-xs text-stone-500">/ mo</span>
                  </div>
                  <span className="text-[11px] text-stone-500 block mt-1">Billed monthly, cancel anytime</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('annual')}
                  className={`p-4 rounded-2xl border text-left relative transition-all ${
                    selectedPlan === 'annual'
                      ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <span className="absolute -top-2 right-3 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Save 25%
                  </span>
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1">
                    Annual
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif-display text-2xl font-bold text-stone-900">$89.99</span>
                    <span className="text-xs text-stone-500">/ yr</span>
                  </div>
                  <span className="text-[11px] text-stone-500 block mt-1">Equivalent to $7.49/mo</span>
                </button>
              </div>

              {/* VIP Perks List */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Included Privileges:
                </p>
                {perks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-stone-700">
                    <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                disabled={loading}
                onClick={handleSubscribe}
                className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Activating Membership...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Start Membership & Unlock Access</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-stone-400">
                🔒 Instant mock checkout. No actual credit card charge required.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
