'use client';

import React, { useState } from 'react';
import { CalendarDays, X, Send, Building2 } from 'lucide-react';

interface PitchRequestModalProps {
  startup: any;
  onClose: () => void;
  onSubmit: (startupId: string, proposedDate: string, message: string) => Promise<void>;
}

export function PitchRequestModal({
  startup,
  onClose,
  onSubmit,
}: PitchRequestModalProps) {
  const [proposedDate, setProposedDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedDate) {
      setError('Please choose a proposed meeting date.');
      return;
    }
    if (!message.trim()) {
      setError('Please include a brief message or meeting agenda.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(startup.id, proposedDate, message.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit pitch meeting request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-forest">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-ink text-base">Request Pitch Meeting</h3>
              <p className="text-xs text-slate-500">Startup: {startup?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Proposed Date *
            </label>
            <input
              required
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Introductory Message / Agenda *
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! We were impressed by your traction in Northern India and would love to schedule a 30-min intro pitch call to discuss your seed ask..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-forest"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 leading-relaxed">
            <b>Note:</b> Submitting this request will automatically place {startup?.name} into your Deal Pipeline under <b>Meeting Requested</b>. The founder can accept, decline, or counter with another date.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-white hover:bg-ink disabled:opacity-50 transition"
            >
              <Send size={13} /> {submitting ? 'Sending Request...' : 'Send Meeting Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
