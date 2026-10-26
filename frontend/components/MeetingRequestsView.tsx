'use client';

import React, { useState } from 'react';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Send, 
  ArrowRight, 
  Plus, 
  HelpCircle,
  Inbox,
  User,
  Building2,
  Calendar
} from 'lucide-react';

interface MeetingRequestsViewProps {
  role: 'Founder' | 'Investor' | string;
  requests: any[];
  loading: boolean;
  onRespond: (
    requestId: string,
    action: 'accept' | 'decline' | 'date_proposed',
    counterDate?: string,
    message?: string
  ) => Promise<void>;
  onOpenNewMeeting?: () => void;
  onNavigateToMessages: (partnerId: string) => void;
  onSendTypedMessage: (
    requestId: string,
    content: string,
    messageType: 'info_request' | 'info_response' | 'general'
  ) => Promise<void>;
  onRefresh: () => void;
}

export function MeetingRequestsView({
  role,
  requests,
  loading,
  onRespond,
  onOpenNewMeeting,
  onNavigateToMessages,
  onSendTypedMessage,
  onRefresh,
}: MeetingRequestsViewProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [counterDateDraft, setCounterDateDraft] = useState('');
  const [counterMsgDraft, setCounterMsgDraft] = useState('');
  const [isCountering, setIsCountering] = useState<string | null>(null);
  const [typedMsgDraft, setTypedMsgDraft] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const handleAction = async (
    requestId: string,
    action: 'accept' | 'decline' | 'date_proposed'
  ) => {
    try {
      setSubmittingAction(true);
      await onRespond(
        requestId,
        action,
        action === 'date_proposed' ? counterDateDraft : undefined,
        action === 'date_proposed' ? counterMsgDraft : undefined
      );
      setIsCountering(null);
      setCounterDateDraft('');
      setCounterMsgDraft('');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSendQuery = async (requestId: string) => {
    if (!typedMsgDraft.trim()) return;
    try {
      setSubmittingAction(true);
      const mType = role === 'Founder' ? 'info_response' : 'info_request';
      await onSendTypedMessage(requestId, typedMsgDraft, mType);
      setTypedMsgDraft('');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">
            {role === 'Founder' ? 'Founder Workspace' : 'Investor Engagement'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Pitch Meeting Requests
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'Founder'
              ? 'Review meeting proposals from interested investors, accept dates, or propose alternatives.'
              : 'Track pitch invites sent to founders, propose dates, and ask diligence questions.'}
          </p>
        </div>

        {role === 'Investor' && onOpenNewMeeting && (
          <button
            onClick={onOpenNewMeeting}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-ink transition"
          >
            <Plus size={15} /> Request New Pitch Meeting
          </button>
        )}
      </div>

      {/* Main List */}
      {loading && requests.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">Loading meeting requests...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-soft">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-forest">
            <CalendarDays size={22} />
          </div>
          <h3 className="mt-4 font-semibold text-ink">No meeting requests found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            {role === 'Founder'
              ? 'When investors express interest in your pitch deck, their meeting invites will appear here.'
              : 'Send pitch meeting invites from your Watchlist, Pipeline, or Discover tabs.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Requests Column */}
          <div className="space-y-3 lg:col-span-2">
            {requests.map((r) => {
              const isSelected = selectedRequestId === r.id;
              const isPending = r.status === 'pending';
              const isAccepted = r.status === 'accepted';
              const isDeclined = r.status === 'declined';
              const isCountered = r.status === 'date_proposed';

              const badgeTone = isAccepted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDeclined
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isCountered
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

              const partnerName =
                role === 'Founder'
                  ? r.investor?.full_name || r.investor_profile?.firm_name || 'Northstar Ventures'
                  : r.startup?.name || 'Startup';

              const partnerSub =
                role === 'Founder'
                  ? r.investor_profile?.firm_name || 'Verified Seed Fund'
                  : r.startup?.tagline || 'Pitch Meeting Proposal';

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border bg-white p-5 shadow-soft transition ${
                    isSelected ? 'border-forest ring-1 ring-forest/20' : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-forest">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink text-sm sm:text-base">{partnerName}</h3>
                        <p className="text-xs text-slate-500">{partnerSub}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeTone}`}>
                      {isAccepted && <CheckCircle2 size={12} />}
                      {isDeclined && <XCircle size={12} />}
                      {isPending && <Clock size={12} />}
                      {isCountered && <Calendar size={12} />}
                      {r.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Proposed Date & Message */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-500">Proposed Meeting Date:</span>
                      <span className="font-bold text-ink">
                        {r.proposed_date ? new Date(r.proposed_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Flexible'}
                      </span>
                    </div>

                    {r.message && (
                      <div className="border-t border-slate-200/60 pt-2 text-slate-600">
                        <span className="font-semibold text-slate-500">Initial Note: </span>
                        {r.message}
                      </div>
                    )}

                    {r.counter_date && (
                      <div className="border-t border-slate-200/60 pt-2 text-sky-900 bg-sky-50/70 p-2 rounded-lg">
                        <span className="font-semibold">Counter Date Proposed by Founder: </span>
                        <b>{new Date(r.counter_date).toLocaleDateString()}</b>
                        {r.response_message && <p className="mt-1">{r.response_message}</p>}
                      </div>
                    )}
                  </div>

                  {/* Actions for Founder */}
                  {role === 'Founder' && (isPending || isCountered) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <button
                        disabled={submittingAction}
                        onClick={() => handleAction(r.id, 'accept')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-white hover:bg-ink transition"
                      >
                        <CheckCircle2 size={13} /> Accept Meeting
                      </button>

                      <button
                        disabled={submittingAction}
                        onClick={() => setIsCountering(isCountering === r.id ? null : r.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Calendar size={13} /> Propose Another Date
                      </button>

                      <button
                        disabled={submittingAction}
                        onClick={() => handleAction(r.id, 'decline')}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <XCircle size={13} /> Decline
                      </button>

                      <button
                        onClick={() => setSelectedRequestId(isSelected ? null : r.id)}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-forest transition"
                      >
                        <MessageSquare size={13} />
                        <span>Query Thread ({r.messages?.length || 0})</span>
                      </button>
                    </div>
                  )}

                  {/* Counter Date Form */}
                  {isCountering === r.id && (
                    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-xs space-y-2">
                      <p className="font-semibold text-sky-950">Propose an alternate meeting date:</p>
                      <input
                        type="date"
                        value={counterDateDraft}
                        onChange={(e) => setCounterDateDraft(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-forest"
                      />
                      <input
                        type="text"
                        placeholder="Optional note: (e.g. Free Thursday afternoon after 3 PM)"
                        value={counterMsgDraft}
                        onChange={(e) => setCounterMsgDraft(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-forest"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setIsCountering(null)}
                          className="rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!counterDateDraft || submittingAction}
                          onClick={() => handleAction(r.id, 'date_proposed')}
                          className="rounded-lg bg-sky-600 px-3 py-1 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                        >
                          Send Counter Date
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions for Accepted Requests: Direct Messaging */}
                  {isAccepted && (
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-medium text-emerald-800">
                        ✓ Meeting confirmed! You can now exchange direct messages.
                      </span>
                      <button
                        onClick={() =>
                          onNavigateToMessages(
                            role === 'Founder' ? r.investor_id : r.startup?.founder_id || ''
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ink transition"
                      >
                        <Send size={12} /> Message in Chat
                      </button>
                    </div>
                  )}

                  {/* If not founder or request is declined, show thread button */}
                  {(!isPending && !isCountered && !isAccepted) || role === 'Investor' ? (
                    <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
                      <button
                        onClick={() => setSelectedRequestId(isSelected ? null : r.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-forest transition"
                      >
                        <MessageSquare size={13} />
                        <span>Diligence & Clarification Thread ({r.messages?.length || 0})</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Right Column: Typed Message & Information Request Drawer */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-ink text-sm sm:text-base flex items-center gap-2">
              <MessageSquare size={16} className="text-forest" />
              <span>Diligence & Clarification Thread</span>
            </h3>

            {selectedRequest ? (
              <div className="mt-4 flex flex-col h-[480px]">
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs text-slate-400">Thread regarding:</p>
                  <p className="font-semibold text-sm text-ink">
                    {selectedRequest.startup?.name || 'Startup Pitch'}
                  </p>
                </div>

                {/* Messages List */}
                <div className="flex-1 space-y-3 overflow-y-auto py-3 pr-1">
                  {selectedRequest.messages && selectedRequest.messages.length > 0 ? (
                    selectedRequest.messages.map((m: any) => {
                      const isFounderMsg = m.message_type === 'info_response';
                      return (
                        <div
                          key={m.id}
                          className={`rounded-xl p-3 text-xs leading-5 ${
                            isFounderMsg
                              ? 'bg-emerald-50/70 border border-emerald-100 text-emerald-950 ml-4'
                              : 'bg-slate-50 border border-slate-100 text-slate-800 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold text-[10px] text-slate-400 mb-1">
                            <span>{m.sender?.full_name || (isFounderMsg ? 'Founder' : 'Investor')}</span>
                            <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200">
                              {m.message_type === 'info_request' ? 'Info Request' : 'Clarification'}
                            </span>
                          </div>
                          <p>{m.content}</p>
                          <p className="mt-1 text-[10px] text-slate-400 text-right">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-xs text-slate-400 p-6">
                      No additional info requests yet. Use the input below to ask diligence questions before the meeting.
                    </div>
                  )}
                </div>

                {/* Send Input */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={typedMsgDraft}
                      onChange={(e) => setTypedMsgDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendQuery(selectedRequest.id);
                      }}
                      placeholder={
                        role === 'Founder'
                          ? 'Reply to information request...'
                          : 'Ask for specific diligence metrics...'
                      }
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-forest"
                    />
                    <button
                      disabled={!typedMsgDraft.trim() || submittingAction}
                      onClick={() => handleSendQuery(selectedRequest.id)}
                      className="rounded-xl bg-forest px-3 py-2 text-xs font-semibold text-white hover:bg-ink disabled:opacity-50 transition"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {role === 'Founder'
                      ? 'Categorized as Information Response'
                      : 'Categorized as Additional Info Request'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex h-[350px] items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Select a meeting request on the left to view or post information requests and deck clarification questions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
