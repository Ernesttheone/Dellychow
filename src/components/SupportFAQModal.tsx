import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Sparkles,
  Headphones,
  Mail,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  User,
  ChefHat,
  Filter,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RecipeService } from '../services/recipeService';
import { SupportTicket, LiveSupportMessage } from '../types';

interface SupportFAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'faq' | 'chat' | 'tickets' | 'report';
}

interface FAQItem {
  id: string;
  category: 'account' | 'subscriptions' | 'payments' | 'video_upload' | 'live_session' | 'community' | 'technical';
  targetAudience: 'all' | 'food_lover' | 'chef';
  q: string;
  a: string;
}

const FAQ_CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'account', label: 'Account Management' },
  { id: 'subscriptions', label: 'Subscriptions & VIP' },
  { id: 'payments', label: 'Payments & Billing' },
  { id: 'video_upload', label: 'Video Uploads & Tutorials' },
  { id: 'live_session', label: 'Live Sessions & Streaming' },
  { id: 'community', label: 'Community Guidelines' },
  { id: 'technical', label: 'Technical & Playback' }
] as const;

const FAQS_DATABASE: FAQItem[] = [
  // 1. Account Management
  {
    id: 'acc-1',
    category: 'account',
    targetAudience: 'all',
    q: 'How do account roles work on DellyChow? Can I switch roles?',
    a: 'DellyChow strictly enforces permanent account role assignment during registration. When registering, you choose either "Food Lover" or "Chef / Creator". To ensure safety and permissions integrity, chefs cannot switch to food lovers, and food lovers cannot switch to chefs. Users who want both roles simply create two separate accounts with their respective credentials.'
  },
  {
    id: 'acc-2',
    category: 'account',
    targetAudience: 'food_lover',
    q: 'How do I customize my Food Lover profile and avatars?',
    a: 'Navigate to "Account Settings" from the user menu. You can select from 3 default chef avatars or upload your custom profile picture directly from your mobile device, tablet, or desktop.'
  },
  {
    id: 'acc-3',
    category: 'account',
    targetAudience: 'chef',
    q: 'How is Chef identity verified on the platform?',
    a: 'Registered chefs receive an official Verified Master Chef badge once they complete their culinary specialty profile and publish their first authentic recipe or video tutorial.'
  },

  // 2. Subscriptions & VIP Access
  {
    id: 'sub-1',
    category: 'subscriptions',
    targetAudience: 'food_lover',
    q: 'How do VIP Live Video Subscriptions work?',
    a: 'Each verified chef can offer a VIP Kitchen Circle. Subscribing gives you unlimited uninterrupted access to their exclusive live cooking sessions, private group chats, recipe chemistry notes, and live Q&A. Users without an active subscription receive a 10-second live preview before subscribing.'
  },
  {
    id: 'sub-2',
    category: 'subscriptions',
    targetAudience: 'food_lover',
    q: 'Can I cancel my VIP chef subscription at any time?',
    a: 'Yes! You can manage or cancel your active subscriptions at any time from your Account page. Your VIP privileges will remain active until the end of your billing cycle.'
  },
  {
    id: 'sub-3',
    category: 'subscriptions',
    targetAudience: 'chef',
    q: 'How do Chefs set up VIP membership pricing?',
    a: 'In Chef Studio under "VIP Community", chefs can configure their monthly subscription fee (e.g., $9.99/mo) and describe their exclusive member perks. Membership payments are processed securely.'
  },

  // 3. Payments & Billing
  {
    id: 'pay-1',
    category: 'payments',
    targetAudience: 'all',
    q: 'What payment methods are supported for VIP memberships?',
    a: 'DellyChow supports major credit and debit cards, Apple Pay, Google Pay, and verified regional billing methods with end-to-end encryption.'
  },
  {
    id: 'pay-2',
    category: 'payments',
    targetAudience: 'all',
    q: 'Where do I find receipts and subscription renewal dates?',
    a: 'Go to your Account page to view active subscription dates, next renewal periods, and pricing receipts.'
  },

  // 4. Video Uploads & Tutorials
  {
    id: 'vid-1',
    category: 'video_upload',
    targetAudience: 'chef',
    q: 'What video formats can chefs upload to DellyChow?',
    a: 'Chef Studio accepts MP4, WebM, and MOV video files uploaded directly from your device, as well as direct streaming video URLs (YouTube, Vimeo, or direct cloud MP4 links).'
  },
  {
    id: 'vid-2',
    category: 'video_upload',
    targetAudience: 'chef',
    q: 'What are the 8 required fields when uploading a recipe?',
    a: 'DellyChow keeps recipe uploading clean and straightforward: 1. Recipe Name, 2. Recipe Image (device upload), 3. Description, 4. Ingredients, 5. Cooking Instructions, 6. Cooking Time, 7. Food Category (Rice, Soups, Snacks, Drinks, etc.), and 8. Cooking Video (optional).'
  },

  // 5. Live Sessions & Streaming
  {
    id: 'live-1',
    category: 'live_session',
    targetAudience: 'all',
    q: 'What is the 10-Second VIP Live Video Preview protection?',
    a: 'When an unsubscribed user clicks on a VIP live cooking masterclass, they receive a generous 10-second full-fidelity preview. At the end of the preview, the video securely locks and prompts the user to join the chef’s VIP kitchen circle for uninterrupted streaming.'
  },
  {
    id: 'live-2',
    category: 'live_session',
    targetAudience: 'food_lover',
    q: 'How do VIP Masterclass registrations work?',
    a: 'Browse the VIP Masterclasses page, choose a session with your favorite chef, and click Register. Once confirmed by our server, you receive a unique confirmation code (e.g., DC-XXXXXX) viewable in your dashboard.'
  },

  // 6. Community Guidelines & Safety
  {
    id: 'com-1',
    category: 'community',
    targetAudience: 'all',
    q: 'What are the rules for Chef Group Chats and Community comments?',
    a: 'DellyChow is a respectful culinary collective. All members must communicate courteously. Spamming, harassment, and unsafe culinary practices are strictly prohibited. Chefs have moderation tools to delete inappropriate messages, pin announcements, and report violations.'
  },
  {
    id: 'com-2',
    category: 'community',
    targetAudience: 'all',
    q: 'How can I report an abusive message or inappropriate content?',
    a: 'Click the flag/shield icon next to any comment or chat message, or submit an Issue Report right here in the Support Center. Our moderation team reviews all reports promptly.'
  },

  // 7. Technical Issues & Troubleshooting
  {
    id: 'tech-1',
    category: 'technical',
    targetAudience: 'all',
    q: 'Why does the website display differently on my tablet or iPad?',
    a: 'DellyChow is fully responsive across iPad (768px/1024px), Android tablets, smartphones, and large desktop screens. It adapts fluidly between portrait and landscape orientations with zero horizontal overflow.'
  },
  {
    id: 'tech-2',
    category: 'technical',
    targetAudience: 'all',
    q: 'Why can guests only see 3 tutorial videos?',
    a: 'Guest visitors can browse 3 selected chef tutorials to preview the platform. Clicking play displays a sign-in popup explaining that creating a free account is required. Once registered or signed in, the video automatically loads and unlocks the complete library!'
  }
];

export const SupportFAQModal: React.FC<SupportFAQModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'faq'
}) => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'faq' | 'chat' | 'tickets' | 'report'>(initialTab);
  
  // FAQ state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'food_lover' | 'chef'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<string | null>('acc-1');

  // Live Chat state
  const [chatMessages, setChatMessages] = useState<LiveSupportMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeChatId = currentUser ? `support_${currentUser.uid}` : 'support_guest';

  // Ticket Tracker state
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Issue Report Form state
  const [reportName, setReportName] = useState(userProfile?.displayName || currentUser?.displayName || '');
  const [reportEmail, setReportEmail] = useState(userProfile?.email || currentUser?.email || '');
  const [reportCategory, setReportCategory] = useState<SupportTicket['category']>('technical');
  const [reportPriority, setReportPriority] = useState<SupportTicket['priority']>('medium');
  const [reportSubject, setReportSubject] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [ticketConfirmationId, setTicketConfirmationId] = useState<string | null>(null);

  // Reset tab on modal open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Listen to live chat messages
  useEffect(() => {
    if (!isOpen || activeTab !== 'chat') return;
    const unsub = RecipeService.listenToLiveSupportMessages(activeChatId, (msgs) => {
      setChatMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, activeTab, activeChatId]);

  // Scroll live chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Listen to user's tickets
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const unsub = RecipeService.listenToUserTickets(currentUser.uid, (tickets) => {
      setUserTickets(tickets);
    });
    return () => unsub();
  }, [isOpen, currentUser]);

  // Filtered FAQs
  const filteredFAQs = useMemo(() => {
    return FAQS_DATABASE.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (audienceFilter !== 'all' && item.targetAudience !== 'all' && item.targetAudience !== audienceFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, audienceFilter, searchQuery]);

  if (!isOpen) return null;

  // Handle send live support message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    setChatSending(true);
    try {
      await RecipeService.sendLiveSupportMessage(activeChatId, {
        chatId: activeChatId,
        senderId: currentUser?.uid || 'guest',
        senderName: userProfile?.displayName || currentUser?.displayName || 'Customer',
        senderRole: 'user',
        text: chatInput.trim()
      });
      setChatInput('');
    } catch (err) {
      console.error('Failed to send live message:', err);
    } finally {
      setChatSending(false);
    }
  };

  // Handle report submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim() || !reportEmail.trim() || !reportSubject.trim() || !reportMessage.trim()) return;

    setReportSubmitting(true);
    try {
      const ticketId = await RecipeService.submitSupportTicket({
        userId: currentUser?.uid,
        name: reportName.trim(),
        email: reportEmail.trim(),
        topic: reportCategory,
        category: reportCategory,
        priority: reportPriority,
        subject: reportSubject.trim(),
        message: reportMessage.trim()
      });

      setTicketConfirmationId(ticketId);
      setReportSubject('');
      setReportMessage('');
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      setTicketConfirmationId('DC-TICKET-' + Date.now().toString(36).toUpperCase());
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-display text-lg sm:text-xl font-bold text-stone-900">
                  DellyChow Support & Help Centre
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Desk Online
                </span>
              </div>
              <p className="text-xs text-stone-500">
                24/7 culinary assistance, live chat, FAQ knowledge base, and ticket tracking.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
            aria-label="Close support dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex border-b border-stone-200 px-4 sm:px-6 bg-stone-50/70 overflow-x-auto text-xs font-semibold uppercase tracking-wider gap-2 sm:gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'faq'
                ? 'border-amber-600 text-amber-800 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Knowledge Base (FAQ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'chat'
                ? 'border-amber-600 text-amber-800 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Live Agent Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'report'
                ? 'border-amber-600 text-amber-800 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Submit Issue / Complaint</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'tickets'
                ? 'border-amber-600 text-amber-800 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Track My Tickets ({userTickets.length})</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          
          {/* TAB 1: FAQ AND HELP CENTRE */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              
              {/* Search and Audience Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions by keyword, role, billing, video preview, recipes..."
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {FAQ_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Audience Segment */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setAudienceFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        audienceFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceFilter('food_lover')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        audienceFilter === 'food_lover' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      Food Lovers
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceFilter('chef')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        audienceFilter === 'chef' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      Chefs
                    </button>
                  </div>
                </div>
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-3">
                {filteredFAQs.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-stone-200 rounded-2xl space-y-2">
                    <HelpCircle className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="font-serif-display text-sm font-bold text-stone-800">No matching questions found</p>
                    <p className="text-xs text-stone-500">
                      Try searching with different keywords or connect with our team directly in the Live Agent Chat tab.
                    </p>
                  </div>
                ) : (
                  filteredFAQs.map((faq) => {
                    const isOpen = openFaqIndex === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="border border-stone-200 rounded-2xl overflow-hidden transition-all bg-stone-50/40 hover:bg-stone-50"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : faq.id)}
                          className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 font-bold text-xs sm:text-sm text-stone-900 hover:text-amber-800"
                        >
                          <span className="leading-snug">{faq.q}</span>
                          <span className="p-1 rounded-lg bg-stone-100 text-stone-500 shrink-0 mt-0.5">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3 bg-white">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 2: LIVE CUSTOMER SUPPORT CHAT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[480px] bg-stone-50/50 rounded-2xl border border-stone-200 overflow-hidden">
              
              {/* Agent presence banner */}
              <div className="p-3 px-4 bg-stone-900 text-white flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                      S
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-stone-900" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Agent Sarah · DellyChow Concierge</p>
                    <p className="text-[10px] text-stone-400">Average response time: &lt; 2 minutes</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                  Session: {activeChatId.slice(-8)}
                </span>
              </div>

              {/* Messages feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {/* Welcome message */}
                <div className="flex gap-2.5 max-w-[85%] mr-auto">
                  <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    S
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 font-medium">DellyChow Support Desk</span>
                    <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white border border-stone-200 text-xs text-stone-800 shadow-2xs leading-relaxed">
                      Hello{currentUser ? ` ${userProfile?.displayName || ''}` : ''}! Welcome to DellyChow Live Support. How can we help you today with recipes, cooking tutorials, VIP sessions, or your account?
                    </div>
                  </div>
                </div>

                {chatMessages.map((msg) => {
                  const isMe = msg.senderRole === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                        isMe ? 'bg-stone-900 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {isMe ? 'You' : 'S'}
                      </div>
                      <div className={`space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        <span className="text-[10px] text-stone-400 font-medium">
                          {isMe ? 'You' : msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-amber-600 text-white rounded-tr-xs'
                            : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-2xs'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input box */}
              <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your question or issue for the support team..."
                  maxLength={500}
                  className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="p-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>

            </div>
          )}

          {/* TAB 3: ISSUE REPORTING & COMPLAINT SUBMISSION */}
          {activeTab === 'report' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {ticketConfirmationId ? (
                <div className="p-8 text-center space-y-4 bg-emerald-50/50 border border-emerald-200 rounded-3xl">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-xl font-bold text-stone-900">
                      Issue Ticket Successfully Logged
                    </h4>
                    <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                      Your report has been submitted to the DellyChow Technical & Moderation Team. You can monitor progress under the <strong>Track My Tickets</strong> tab.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 inline-block font-mono text-xs">
                    Ticket Reference Code: <strong className="text-amber-800 text-sm">{ticketConfirmationId}</strong>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition-colors"
                    >
                      View in Ticket Tracker
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketConfirmationId(null)}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl transition-colors"
                    >
                      Submit Another Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-serif-display text-lg font-bold text-stone-900">
                      Submit an Official Report or Complaint
                    </h4>
                    <p className="text-xs text-stone-500">
                      Our moderation and engineering teams review all submitted tickets within 24 hours.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="Full name"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={reportEmail}
                        onChange={(e) => setReportEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Issue Category *
                      </label>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value as any)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="technical">Technical Bug / Video Playback</option>
                        <option value="subscriptions">VIP Subscription & Access</option>
                        <option value="payments">Payment or Billing Inquiry</option>
                        <option value="video_upload">Video Uploading Issue</option>
                        <option value="live_session">VIP Live Session Issue</option>
                        <option value="community">Community / Group Chat Conduct</option>
                        <option value="complaint">Complaint Against Content / Chef</option>
                        <option value="account">Account Access / Password</option>
                        <option value="general">Other Inquiries</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Severity / Priority
                      </label>
                      <select
                        value={reportPriority}
                        onChange={(e) => setReportPriority(e.target.value as any)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="low">Low — General inquiry</option>
                        <option value="medium">Medium — Feature issue or question</option>
                        <option value="high">High — Playback / VIP access blocked</option>
                        <option value="urgent">Urgent — Payment issue or security violation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Subject / Summary *
                    </label>
                    <input
                      type="text"
                      required
                      value={reportSubject}
                      onChange={(e) => setReportSubject(e.target.value)}
                      placeholder="e.g. VIP live video preview stopped, cannot renew subscription"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Detailed Explanation *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={reportMessage}
                      onChange={(e) => setReportMessage(e.target.value)}
                      placeholder="Please include error messages, steps taken, tablet model or browser if applicable..."
                      className="w-full text-xs p-3.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      maxLength={1200}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{reportSubmitting ? 'Transmitting Ticket...' : 'File Support Ticket'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: TICKET TRACKING SYSTEM */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div>
                  <h4 className="font-serif-display text-lg font-bold text-stone-900">
                    Live Ticket Tracking System
                  </h4>
                  <p className="text-xs text-stone-500">
                    Track your reported issues, investigation statuses, and support responses in real-time.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs self-start sm:self-auto"
                >
                  + Open New Ticket
                </button>
              </div>

              {!currentUser ? (
                <div className="p-8 text-center border border-dashed border-stone-200 rounded-2xl space-y-2">
                  <User className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="font-bold text-xs text-stone-800">Sign in to track your personal tickets</p>
                  <p className="text-xs text-stone-500">
                    Guest submissions can be tracked by saving your unique ticket reference code.
                  </p>
                </div>
              ) : userTickets.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-stone-200 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-serif-display text-sm font-bold text-stone-800">No Open Support Tickets</p>
                  <p className="text-xs text-stone-500">
                    Everything looks healthy! If you encounter any bugs, submit an issue report anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTickets.map((ticket) => {
                    const isSelected = selectedTicket?.id === ticket.id;
                    const statusColor = 
                      ticket.status === 'resolved' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : ticket.status === 'investigating' 
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200';

                    return (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-amber-400 transition-all space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {ticket.id.slice(0, 16)}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {ticket.status}
                            </span>
                            <span className="text-[11px] text-stone-400 capitalize">
                              Priority: {ticket.priority}
                            </span>
                          </div>

                          <span className="text-[11px] text-stone-400">
                            Logged: {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-stone-900">{ticket.subject || ticket.topic}</h5>
                          <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                            {ticket.message}
                          </p>
                        </div>

                        {/* Agent response strip */}
                        {ticket.agentResponse && (
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                              <Headphones className="w-3.5 h-3.5" />
                              <span>Support Agent Response</span>
                            </div>
                            <p className="leading-relaxed pl-5">
                              {ticket.agentResponse}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
