'use client';

import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'startup' | 'user' | 'document' | 'message' | 'program' | 'other';
  targetId: string;
  targetName?: string;
  onSuccess?: (msg: string) => void;
}

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState('Misleading or inaccurate claims');
  const [customReason, setCustomReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const standardReasons = [
    'Misleading or inaccurate claims',
    'Suspicious or fraudulent activity',
    'Copyright or intellectual property violation',
    'Spam or unwanted solicitation',
    'Harassment or abusive behavior',
    'Other reason',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalReason = reason === 'Other reason' ? customReason.trim() : reason;
    if (!finalReason) {
      setError('Please provide a reason for this report.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/reports', {
        target_type: targetType,
        target_id: targetId,
        reason: finalReason,
        details: details.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess('Report submitted to platform administration for review.');
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Flag size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Report content or profile</h3>
            <p className="text-xs text-slate-500">
              Reporting: <b className="text-slate-800">{targetName || targetId}</b> ({targetType})
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
            >
              {standardReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Other reason' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Specify reason
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the issue..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Additional context or evidence (optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide specific details or links to help our moderation team review this item..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-500"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
            Reports are confidential and reviewed directly by verified platform administrators. False or abusive reporting may result in account suspension.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
            >
              <Flag size={14} />
              {submitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
