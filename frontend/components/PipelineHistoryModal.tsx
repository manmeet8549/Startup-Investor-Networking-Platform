'use client';

import React from 'react';
import { History, X, Clock, ArrowRight } from 'lucide-react';
import { PIPELINE_COLUMNS } from './PipelineBoard';

interface PipelineHistoryModalProps {
  startupName: string;
  history: any[];
  loading: boolean;
  onClose: () => void;
}

export function PipelineHistoryModal({
  startupName,
  history,
  loading,
  onClose,
}: PipelineHistoryModalProps) {
  const getColLabel = (status: string | null) => {
    if (!status) return 'Initial';
    const col = PIPELINE_COLUMNS.find((c) => c.id === status);
    return col ? col.label : status.replace('_', ' ');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-forest">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-ink text-base">Pipeline State Audit History</h3>
              <p className="text-xs text-slate-500">{startupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 max-h-[400px] overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No historical status changes recorded yet for this startup.
            </div>
          ) : (
            history.map((h, i) => (
              <div
                key={h.id || i}
                className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:hidden"
              >
                <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-forest bg-white" />
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <span className="text-slate-500">{getColLabel(h.from_status)}</span>
                    <ArrowRight size={12} className="text-forest" />
                    <span className="text-forest">{getColLabel(h.to_status)}</span>
                  </div>
                  {h.notes && (
                    <p className="mt-1 text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60">
                      {h.notes}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    {new Date(h.created_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
