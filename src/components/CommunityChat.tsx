import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Lock, 
  Crown, 
  ChefHat, 
  ShieldCheck, 
  MessageSquare, 
  Trash2, 
  Flag, 
  Pin, 
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CommunityMessage, CommunitySettings } from '../types';
import { RecipeService } from '../services/recipeService';
import { UserAvatar } from './UserAvatar';
import {
  formatMessageTimeLocal,
  formatMessageFullTooltip,
  getLocalCalendarDayKey,
  getDateSeparatorLabel,
  syncServerClock,
} from '../lib/chatTimestamp';

interface CommunityChatProps {
  chefId: string;
  chefName: string;
  onRequestSubscribe?: () => void;
}

export const CommunityChat: React.FC<CommunityChatProps> = ({
  chefId,
  chefName,
  onRequestSubscribe
}) => {
  const { currentUser, userProfile, isSubscribedToChef } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [reportingMsgId, setReportingMsgId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Spam or inappropriate content');
  const [reportSuccess, setReportSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSubscribed = isSubscribedToChef(chefId);
  const isChefThemself = currentUser?.uid === chefId;
  const isAuthorized = isChefThemself || isSubscribed || (settings?.isPublicGroup ?? false);

  useEffect(() => {
    syncServerClock();
    RecipeService.getCommunitySettings(chefId).then((data) => {
      if (data) setSettings(data);
    });
  }, [chefId]);

  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = RecipeService.listenToCommunityMessages(chefId, (newMessages) => {
      setMessages(newMessages);
    });
    return () => unsubscribe();
  }, [chefId, isAuthorized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group chronologically ordered messages by synchronized local calendar day
  const messageDayGroups = useMemo(() => {
    const groups: { dayKey: string; label: string; items: CommunityMessage[] }[] = [];
    for (const msg of messages) {
      const dayKey = getLocalCalendarDayKey(msg.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.dayKey !== dayKey) {
        groups.push({
          dayKey,
          label: getDateSeparatorLabel(msg.createdAt),
          items: [msg],
        });
      } else {
        lastGroup.items.push(msg);
      }
    }
    return groups;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || sending) return;

    setSending(true);
    try {
      await RecipeService.sendCommunityMessage(chefId, {
        chefId,
        senderId: currentUser.uid,
        senderName: userProfile?.displayName || (isChefThemself ? chefName : 'Cooking Lover'),
        senderPhoto: userProfile?.photoURL || '',
        senderRole: isChefThemself ? 'chef' : 'member',
        text: inputText.trim()
      });
      setInputText('');
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await RecipeService.deleteCommunityMessage(chefId, messageId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleReportMessage = async () => {
    if (!reportingMsgId || !currentUser) return;
    const targetMsg = messages.find(m => m.id === reportingMsgId);
    if (!targetMsg) return;

    try {
      await RecipeService.reportCommunityMessage({
        chefId,
        messageId: reportingMsgId,
        messageText: targetMsg.text,
        senderId: targetMsg.senderId,
        reportedBy: currentUser.uid,
        reason: reportReason
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportingMsgId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to report message:", err);
    }
  };

  // Locked gate for non-members if community is private
  if (!isAuthorized) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center text-white space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-600/20 text-amber-500 ring-1 ring-amber-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="font-serif-display text-xl font-bold tracking-tight">
          Private VIP Kitchen Chat
        </h3>
        <p className="text-xs text-stone-400 leading-relaxed">
          This community is exclusively for members of <strong className="text-white">{chefName}</strong>. Discuss recipes, ask culinary questions, and get real-time feedback directly from the chef.
        </p>
        <button
          type="button"
          onClick={onRequestSubscribe}
          className="py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <Crown className="w-4 h-4" />
          Join VIP Circle to Unlock Chat
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs flex flex-col h-[480px] sm:h-[540px] lg:h-[580px] relative">
      {/* Chat Header */}
      <div className="p-3.5 sm:px-6 bg-stone-900 text-white flex items-center justify-between gap-2 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-serif-display text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{chefName}&apos;s Community Circle</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                {settings?.isPublicGroup ? 'Open Community' : 'VIP Circle'}
              </span>
            </h4>
            <p className="text-[11px] text-stone-400 truncate">
              Direct discussions with {chefName} &amp; fellow cooking enthusiasts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-lg shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isChefThemself ? 'Moderator' : 'Member'}</span>
        </div>
      </div>

      {/* Pinned Announcement */}
      {settings?.pinnedAnnouncement && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2.5 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200 shrink-0">
          <Pin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
              Chef Announcement
            </span>
            <p className="text-xs text-stone-800 dark:text-stone-200 leading-snug">
              {settings.pinnedAnnouncement}
            </p>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 px-3.5 py-4 sm:p-6 overflow-y-auto space-y-5 bg-stone-50/60 dark:bg-stone-950/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <Crown className="w-10 h-10 text-amber-500/60 mb-2" />
            <p className="font-serif-display text-sm font-bold text-stone-700 dark:text-stone-200">
              Community Discussion Room
            </p>
            <p className="text-xs text-stone-500 max-w-xs mt-1">
              Be the first to say hello to {chefName} or ask a cooking question!
            </p>
          </div>
        ) : (
          messageDayGroups.map((group) => (
            <div key={group.dayKey} className="space-y-3.5">
              {/* Synchronized Date Separator */}
              <div className="flex items-center gap-3 py-1 select-none" role="separator" aria-label={group.label}>
                <div className="flex-1 h-px bg-stone-200/90 dark:bg-stone-800" />
                <span className="px-3 py-1 rounded-lg bg-[#FAF7F2] dark:bg-stone-800 border border-stone-200/90 dark:border-stone-700 text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-300 shadow-2xs whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-stone-200/90 dark:bg-stone-800" />
              </div>

              {group.items.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;
                const isChefMsg = msg.senderRole === 'chef';
                const formattedTime = msg.isPendingTimestamp
                  ? 'Sending…'
                  : formatMessageTimeLocal(msg.createdAt);
                const fullTooltip = formatMessageFullTooltip(msg.createdAt);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 sm:gap-3 w-full group ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <UserAvatar
                      src={msg.senderPhoto}
                      seed={msg.senderId || msg.senderName}
                      name={msg.senderName}
                      size="xs"
                      className="mt-0.5 shrink-0"
                      ring={false}
                    />

                    <div
                      className={`flex flex-col min-w-0 max-w-[82%] sm:max-w-[74%] ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender Metadata + Moderation Controls */}
                      <div
                        className={`flex items-center gap-1.5 mb-1 max-w-full ${
                          isMe ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[160px] sm:max-w-[240px]">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        {isChefMsg && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0">
                            <ChefHat className="w-2.5 h-2.5" />
                            <span>Chef</span>
                          </span>
                        )}

                        {/* Moderation Actions (cleanly separated from timestamp below) */}
                        {(isChefThemself || !isMe) && (
                          <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {isChefThemself && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title="Delete message as Chef"
                                aria-label="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => setReportingMsgId(msg.id)}
                                className="p-1 text-stone-400 hover:text-amber-700 rounded transition-colors cursor-pointer"
                                title="Report message"
                                aria-label="Report message"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed break-words max-w-full ${
                          isMe
                            ? 'bg-amber-600 text-white rounded-tr-xs shadow-xs'
                            : isChefMsg
                            ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-stone-900 dark:text-stone-100 rounded-tl-xs shadow-2xs'
                            : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-tl-xs shadow-2xs'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Dedicated Timestamp Directly Beneath Message Bubble */}
                      <div
                        title={fullTooltip}
                        className={`mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 tabular-nums select-none ${
                          isMe ? 'justify-end pr-0.5' : 'justify-start pl-0.5'
                        }`}
                      >
                        <time dateTime={msg.createdAt}>{formattedTime}</time>
                        {isMe && (
                          msg.isPendingTimestamp ? (
                            <Clock className="w-2.5 h-2.5 text-stone-400 shrink-0" aria-hidden="true" />
                          ) : (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${chefName} and the kitchen...`}
          maxLength={1000}
          className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Report Modal */}
      {reportingMsgId && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-serif-display text-base font-bold text-stone-900">Report Message</h4>
              </div>
              <button 
                onClick={() => setReportingMsgId(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you. This report has been submitted to moderation for review.</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-stone-600">
                  Please select why this community message violates DellyChow standards:
                </p>

                <div className="space-y-2">
                  {[
                    'Spam or inappropriate advertisement',
                    'Harassment or disrespectful behavior',
                    'Dangerous or unsafe cooking advice',
                    'Off-topic or disruptive content'
                  ].map((reason) => (
                    <label key={reason} className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer text-xs text-stone-700">
                      <input
                        type="radio"
                        name="reportReason"
                        checked={reportReason === reason}
                        onChange={() => setReportReason(reason)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingMsgId(null)}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReportMessage}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
