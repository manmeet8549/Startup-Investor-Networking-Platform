'use client';

import React, { useState } from 'react';
import { 
  Bookmark, 
  Trash2, 
  Lock, 
  Edit3, 
  Check, 
  X, 
  CalendarDays, 
  ArrowRight, 
  Compass, 
  ShieldCheck, 
  Tag, 
  MapPin, 
  ExternalLink,
  Inbox
} from 'lucide-react';
import { PIPELINE_COLUMNS } from './PipelineBoard';

interface WatchlistSectionProps {
  watchlistItems: any[];
  loading: boolean;
  onRemove: (startupId: string) => Promise<void>;
  onSaveNote: (startupId: string, noteText: string) => Promise<void>;
  onDeleteNote: (startupId: string) => Promise<void>;
  onRequestMeeting: (startup: any) => void;
  onMoveToPipeline: (startupId: string, status: string) => Promise<void>;
  navTo: (page: string) => void;
}

export function WatchlistSection({
  watchlistItems,
  loading,
  onRemove,
  onSaveNote,
  onDeleteNote,
  onRequestMeeting,
  onMoveToPipeline,
  navTo,
}: WatchlistSectionProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const startEditNote = (startupId: string, currentNote: string | null) => {
    setEditingNoteId(startupId);
    setNoteDraft(currentNote || '');
  };

  const handleSaveNote = async (startupId: string) => {
    try {
      setSavingNote(true);
      await onSaveNote(startupId, noteDraft);
      setEditingNoteId(null);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (startupId: string) => {
    try {
      setSavingNote(true);
      await onDeleteNote(startupId);
      setEditingNoteId(null);
      setNoteDraft('');
    } finally {
      setSavingNote(false);
    }
  };

  const handleRemove = async (startupId: string) => {
    try {
      setRemovingId(startupId);
      await onRemove(startupId);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">
            Investor Portfolio
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Watchlist & Private Notes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Shortlisted startups and confidential notes. Notes are private and never visible to founders or other investors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navTo('Discover Startups')}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-ink transition"
          >
            <Compass size={14} /> Browse Startups
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 text-xs text-emerald-950">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-forest">
          <Lock size={16} />
        </span>
        <div className="flex-1">
          <span className="font-semibold">Private & Confidential Workspace:</span> All notes and watchlist entries are strictly isolated using PostgreSQL row-level security.
        </div>
      </div>

      {/* Content */}
      {loading && watchlistItems.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">Loading your saved startups...</p>
          </div>
        </div>
      ) : watchlistItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-soft">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-forest">
            <Bookmark size={22} />
          </div>
          <h3 className="mt-4 font-semibold text-ink">No startups in your watchlist yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Click the bookmark icon on any startup profile in Discover or Recommendations to track it here.
          </p>
          <div className="mt-5">
            <button
              onClick={() => navTo('Discover Startups')}
              className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-ink transition"
            >
              Discover Startups <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {watchlistItems.map((item) => {
            const st = item.startup || {};
            const isEditingNote = editingNoteId === st.id;
            const isRemoving = removingId === st.id;

            const askDisplay = st.funding_ask
              ? typeof st.funding_ask === 'number'
                ? st.funding_ask >= 10000000
                  ? `₹${(st.funding_ask / 10000000).toFixed(1)} Cr`
                  : `₹${(st.funding_ask / 100000).toFixed(0)} Lakh`
                : st.funding_ask
              : '₹15L';

            const currentPipelineCol = PIPELINE_COLUMNS.find((c) => c.id === item.pipeline_status);

            return (
              <div
                key={item.id || st.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:border-emerald-200 hover:shadow-md"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {st.logo ? (
                        <img
                          src={st.logo}
                          alt={st.name}
                          className="h-12 w-12 rounded-xl object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-sm font-semibold text-forest">
                          {(st.name || 'ST').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-ink">{st.name}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {Array.isArray(st.sectors) ? st.sectors.join(', ') : st.sector || 'AgriTech'}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isRemoving}
                      onClick={() => handleRemove(st.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Remove from watchlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Tagline */}
                  <p className="mt-3 text-xs leading-5 text-slate-600 line-clamp-2">
                    {st.tagline || st.description}
                  </p>

                  {/* Metrics Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {(st.stage || 'MVP').toUpperCase()}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {st.location || 'India'}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                      Ask: {askDisplay}
                    </span>
                    {currentPipelineCol ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${currentPipelineCol.tone}`}>
                        Pipeline: {currentPipelineCol.label}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        Not in Pipeline
                      </span>
                    )}
                  </div>

                  {/* Private Notes Section */}
                  <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Lock size={12} className="text-emerald-700" />
                        <span>Private Note (Investor Only)</span>
                      </div>
                      {!isEditingNote && (
                        <button
                          onClick={() => startEditNote(st.id, item.note)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-forest hover:underline"
                        >
                          <Edit3 size={11} /> {item.note ? 'Edit' : 'Add Note'}
                        </button>
                      )}
                    </div>

                    {isEditingNote ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          rows={3}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Confidential investment thesis, traction notes, pilot questions..."
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-forest"
                        />
                        <div className="flex items-center justify-between">
                          <button
                            disabled={savingNote}
                            onClick={() => handleDeleteNote(st.id)}
                            className="text-[11px] font-medium text-rose-600 hover:underline"
                          >
                            Delete note
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={savingNote}
                              onClick={() => setEditingNoteId(null)}
                              className="rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={savingNote}
                              onClick={() => handleSaveNote(st.id)}
                              className="rounded-lg bg-forest px-3 py-1 text-xs font-semibold text-white hover:bg-ink"
                            >
                              {savingNote ? 'Saving...' : 'Save Note'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : item.note ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {item.note}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] italic text-slate-400">
                        No private notes written yet. Click 'Add Note' to capture your diligence thoughts.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-500 font-medium">Pipeline:</label>
                    <select
                      value={item.pipeline_status || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          onMoveToPipeline(st.id, e.target.value);
                        }
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-forest"
                    >
                      <option value="">Set status...</option>
                      {PIPELINE_COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => onRequestMeeting(st)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink transition"
                  >
                    <CalendarDays size={13} /> Request Pitch Meeting
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
