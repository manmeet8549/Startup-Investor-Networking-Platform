'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  Clock, 
  CheckCheck, 
  ShieldAlert, 
  User, 
  Building2, 
  RefreshCw, 
  Lock,
  MessageCircle,
  AlertCircle
} from 'lucide-react';

interface MessagesViewProps {
  conversations: any[];
  activeUserId: string | null;
  messages: any[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  currentUserId: string;
  onSelectConversation: (userId: string) => void;
  onSendMessage: (recipientId: string, content: string) => Promise<void>;
  onRefresh: () => void;
  lastPolledAt: Date | null;
}

export function MessagesView({
  conversations,
  activeUserId,
  messages,
  loadingConversations,
  loadingMessages,
  currentUserId,
  onSelectConversation,
  onSendMessage,
  onRefresh,
  lastPolledAt,
}: MessagesViewProps) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const activeConversation = conversations.find(
    (c) => c.other_user?.id === activeUserId || c.partner?.id === activeUserId
  );
  const otherUser = activeConversation?.other_user || activeConversation?.partner;

  const filteredConversations = conversations.filter((c) => {
    const name = (c.other_user?.full_name || c.partner?.full_name || '').toLowerCase();
    const org = (c.other_user?.organization || c.partner?.organization || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || org.includes(q);
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeUserId || sending) return;

    setErrorNotice(null);
    const content = draft.trim();
    setDraft('');
    setSending(true);

    try {
      await onSendMessage(activeUserId, content);
    } catch (err: any) {
      setErrorNotice(
        err.message || 'Messaging is allowed only between connected users or accepted pitch requests.'
      );
      setDraft(content); // restore draft on error
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with live polling indicator */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">
            Secure Communications
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Messages
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Private conversations between verified and connected partners. No websockets; lightweight polling every 15s.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Polling active (15s)</span>
          </span>

          <button
            onClick={onRefresh}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-ink shadow-soft transition"
            title="Poll now"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main 2-Pane Chat Box */}
      <div className="grid min-h-[580px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft md:grid-cols-[300px_1fr]">
        {/* Left Pane: Conversations List */}
        <div className="flex flex-col border-b border-slate-100 md:border-b-0 md:border-r">
          {/* Search Bar */}
          <div className="border-b border-slate-100 p-3.5">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-forest transition"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConversations && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {conversations.length === 0
                  ? 'No conversations yet. Connect with members or accept a pitch meeting to start messaging.'
                  : 'No matches found.'}
              </div>
            ) : (
              filteredConversations.map((c) => {
                const partner = c.other_user || c.partner || {};
                const isSelected = partner.id === activeUserId;
                const initials = (partner.full_name || 'User')
                  .split(' ')
                  .map((x: string) => x[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={partner.id || c.id}
                    onClick={() => onSelectConversation(partner.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                      isSelected
                        ? 'bg-emerald-50 text-forest'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-forest">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-semibold text-ink">{partner.full_name}</p>
                        {c.unread_count > 0 && (
                          <span className="rounded-full bg-forest px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {c.last_message?.content || partner.organization || `${partner.role} profile`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread */}
        <div className="flex flex-col bg-slate-50/40">
          {otherUser ? (
            <>
              {/* Partner Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-forest">
                    {(otherUser.full_name || 'User').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{otherUser.full_name}</h3>
                    <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <span>{otherUser.organization || otherUser.role}</span>
                      <span>•</span>
                      <span>Connected</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Notice (e.g. Unconnected blocked) */}
              {errorNotice && (
                <div className="m-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{errorNotice}</span>
                </div>
              )}

              {/* Message History */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-400">
                    <MessageCircle size={32} className="text-slate-300 mb-2" />
                    <p>No messages yet in this conversation.</p>
                    <p className="mt-1 text-[11px]">Say hello and share what you are working on!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                            isMine
                              ? 'rounded-tr-sm bg-forest text-white'
                              : 'rounded-tl-sm border border-slate-100 bg-white text-ink'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isMine ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {m.created_at
                                ? new Date(m.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Just now'}
                            </span>
                            {isMine && m.read_at && <CheckCheck size={12} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-3">
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type your message..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-forest transition"
                  />
                  <button
                    disabled={!draft.trim() || sending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink disabled:opacity-50 transition"
                  >
                    <Send size={14} /> Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <MessageCircle size={24} />
              </div>
              <h4 className="font-semibold text-slate-700">Select a conversation</h4>
              <p className="mt-1 max-w-xs text-slate-400">
                Choose a connected member from the left to read previous updates or send a direct message.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
