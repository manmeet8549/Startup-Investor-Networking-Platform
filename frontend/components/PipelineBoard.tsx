'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  CalendarDays, 
  ArrowRight, 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Sparkles,
  Inbox,
  AlertCircle
} from 'lucide-react';

export const PIPELINE_TRANSITIONS: Record<string, string[]> = {
  interested: ['meeting_requested', 'follow_up', 'passed'],
  meeting_requested: ['in_discussion', 'follow_up', 'passed'],
  in_discussion: ['follow_up', 'passed', 'meeting_requested'],
  follow_up: ['meeting_requested', 'in_discussion', 'passed'],
  passed: ['interested', 'follow_up'],
};

export const PIPELINE_COLUMNS: Array<{ id: string; label: string; desc: string; tone: string; border: string }> = [
  { id: 'interested', label: 'Interested', desc: 'Evaluating & shortlisting', tone: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200' },
  { id: 'meeting_requested', label: 'Meeting Requested', desc: 'Pitch date proposed', tone: 'bg-amber-50 text-amber-800', border: 'border-amber-200' },
  { id: 'in_discussion', label: 'In Discussion', desc: 'Due diligence & deck review', tone: 'bg-sky-50 text-sky-800', border: 'border-sky-200' },
  { id: 'follow_up', label: 'Follow Up', desc: 'Monitoring next milestone', tone: 'bg-purple-50 text-purple-800', border: 'border-purple-200' },
  { id: 'passed', label: 'Passed', desc: 'Not a fit for this cycle', tone: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
];

interface PipelineBoardProps {
  pipelineGroups: Record<string, any[]>;
  loading: boolean;
  onUpdateStatus: (startupId: string, newStatus: string, notes?: string) => Promise<void>;
  onViewHistory: (startupId: string, startupName: string) => void;
  onRequestMeeting: (startup: any) => void;
  onEditNote: (startupId: string, currentNote: string | null, startupName: string) => void;
  navTo: (page: string) => void;
}

export function PipelineBoard({
  pipelineGroups,
  loading,
  onUpdateStatus,
  onViewHistory,
  onRequestMeeting,
  onEditNote,
  navTo,
}: PipelineBoardProps) {
  const [movingId, setMovingId] = useState<string | null>(null);

  const totalInPipeline = Object.values(pipelineGroups || {}).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  const handleMove = async (startupId: string, toStatus: string) => {
    try {
      setMovingId(startupId);
      await onUpdateStatus(startupId, toStatus);
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">
            Investor Dealflow
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Deal Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track startups through a validated state machine. Transitions maintain a full audit history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft">
            Total active deals: <b className="text-ink">{totalInPipeline}</b>
          </span>
          <button
            onClick={() => navTo('Recommended Startups')}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-ink transition"
          >
            <Sparkles size={14} /> Add from Recommendations
          </button>
        </div>
      </div>

      {loading && totalInPipeline === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">Loading your deal pipeline...</p>
          </div>
        </div>
      ) : totalInPipeline === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-soft">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-forest">
            <Inbox size={22} />
          </div>
          <h3 className="mt-4 font-semibold text-ink">Your pipeline is empty</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Shortlist startups from Discover or Recommended Startups to start tracking diligence and meeting requests.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => navTo('Discover Startups')}
              className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-ink transition"
            >
              Discover Startups <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navTo('Watchlist & Notes')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-soft hover:bg-slate-50 transition"
            >
              View Watchlist
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {PIPELINE_COLUMNS.map((col) => {
            const items = (pipelineGroups && pipelineGroups[col.id]) || [];
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3"
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">{col.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.tone}`}>
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{col.desc}</p>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs text-slate-400">
                      No startups
                    </div>
                  ) : (
                    items.map((item) => {
                      const st = item.startup || {};
                      const allowedTransitions = PIPELINE_TRANSITIONS[col.id] || [];
                      const isBusy = movingId === st.id;

                      const askDisplay = st.funding_ask
                        ? typeof st.funding_ask === 'number'
                          ? st.funding_ask >= 10000000
                            ? `₹${(st.funding_ask / 10000000).toFixed(1)} Cr`
                            : `₹${(st.funding_ask / 100000).toFixed(0)} Lakh`
                          : st.funding_ask
                        : '₹15L';

                      return (
                        <div
                          key={item.id || st.id}
                          className={`group rounded-xl border bg-white p-3.5 shadow-soft transition hover:shadow-md ${col.border}`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-semibold text-sm text-ink group-hover:text-forest transition">
                                {st.name}
                              </h4>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {Array.isArray(st.sectors) ? st.sectors.join(', ') : st.sector || 'AgriTech'}
                              </p>
                            </div>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {(st.stage || 'MVP').toUpperCase()}
                            </span>
                          </div>

                          {/* Ask and Location */}
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Ask: <b className="text-ink">{askDisplay}</b></span>
                            <span className="truncate max-w-[100px] text-slate-400">{st.location || 'India'}</span>
                          </div>

                          {/* Private Note Snippet */}
                          {item.note && (
                            <div className="mt-2.5 rounded-lg bg-emerald-50/60 p-2 text-[11px] text-slate-600 line-clamp-2 border border-emerald-100">
                              <span className="font-semibold text-emerald-800">Note: </span>
                              {item.note}
                            </div>
                          )}

                          {/* Action Row */}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                            <button
                              onClick={() => onEditNote(st.id, item.note, st.name)}
                              className="text-[11px] font-medium text-slate-500 hover:text-forest transition"
                            >
                              {item.note ? 'Edit note' : '+ Add note'}
                            </button>

                            <button
                              onClick={() => onViewHistory(st.id, st.name)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition"
                              title="View status audit history"
                            >
                              <History size={12} />
                              <span>{item.history_count || 1}</span>
                            </button>
                          </div>

                          {/* State Transition Actions */}
                          <div className="mt-2 border-t border-slate-100 pt-2">
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                              Move status to:
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {allowedTransitions.map((nextStatus) => {
                                const nextCol = PIPELINE_COLUMNS.find((c) => c.id === nextStatus);
                                return (
                                  <button
                                    key={nextStatus}
                                    disabled={isBusy}
                                    onClick={() => handleMove(st.id, nextStatus)}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-forest hover:bg-emerald-50 hover:text-forest disabled:opacity-50 transition"
                                  >
                                    <ChevronRight size={10} />
                                    {nextCol?.label || nextStatus}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick pitch meeting action */}
                          {col.id === 'interested' && (
                            <button
                              onClick={() => onRequestMeeting(st)}
                              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-[11px] font-semibold text-forest hover:bg-emerald-100 transition"
                            >
                              <CalendarDays size={12} /> Request pitch meeting
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
