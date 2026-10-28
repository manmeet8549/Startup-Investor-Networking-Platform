'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Send, 
  X, 
  Filter, 
  ExternalLink,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

export interface PublicProgramItem {
  id: string;
  incubator_id: string;
  name?: string;
  title?: string;
  description?: string;
  eligibility?: string;
  benefits: string;
  sectors: string[];
  stages?: string[];
  deadline: string;
  is_active: boolean;
  incubator?: {
    full_name?: string;
    organization?: string;
  } | null;
}

export interface MyFounderApplicationItem {
  id: string;
  program_id: string;
  startup_id: string;
  founder_id: string;
  pitch_summary?: string | null;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected';
  decision_notes?: string | null;
  created_at: string;
  program?: {
    id: string;
    name?: string;
    title?: string;
    deadline?: string;
  } | null;
  startup?: {
    id: string;
    name: string;
  } | null;
}

interface FounderIncubatorsViewProps {
  founderStartups: Array<{ id: string; name: string }>;
  onNotify: (msg: string) => void;
}

export const FounderIncubatorsView: React.FC<FounderIncubatorsViewProps> = ({
  founderStartups,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'Browse Programs' | 'My Applications'>('Browse Programs');
  
  // Programs State
  const [programs, setPrograms] = useState<PublicProgramItem[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('all');

  // Applications State
  const [applications, setApplications] = useState<MyFounderApplicationItem[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Apply Modal State
  const [applyingProgram, setApplyingProgram] = useState<PublicProgramItem | null>(null);
  const [selectedStartupId, setSelectedStartupId] = useState<string>(
    founderStartups[0]?.id || 'e0000000-0000-0000-0000-000000000001'
  );
  const [pitchSummary, setPitchSummary] = useState('');
  const [submittingApplication, setSubmittingApplication] = useState(false);

  // Fetch Public Programs
  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    try {
      const endpoint = selectedSector !== 'all' ? `/programs?sector=${encodeURIComponent(selectedSector)}` : '/programs';
      const res = await apiClient.get<PublicProgramItem[]>(endpoint);
      setPrograms(res.data || []);
    } catch (err: any) {
      console.error('Failed to load programs', err);
    } finally {
      setLoadingPrograms(false);
    }
  }, [selectedSector]);

  // Fetch My Applications
  const fetchMyApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      const res = await apiClient.get<MyFounderApplicationItem[]>('/me/applications');
      setApplications(res.data || []);
    } catch (err: any) {
      console.error('Failed to load applications', err);
    } finally {
      setLoadingApplications(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Browse Programs') {
      fetchPrograms();
    } else {
      fetchMyApplications();
    }
  }, [activeTab, fetchPrograms, fetchMyApplications]);

  // Open Apply Modal
  const handleOpenApplyModal = (p: PublicProgramItem) => {
    setApplyingProgram(p);
    const stName = founderStartups.find((s) => s.id === selectedStartupId)?.name || 'FarmSense';
    setPitchSummary(
      `${stName} is applying to ${p.title || p.name} with pilot traction, working prototype, and local cooperative adoption.`
    );
  };

  // Submit Application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingProgram) return;

    // Check if deadline has passed
    const deadlineDate = new Date(applyingProgram.deadline);
    if (deadlineDate.getTime() < Date.now()) {
      onNotify('Cannot apply: this program application deadline has already passed (422)');
      return;
    }

    setSubmittingApplication(true);
    try {
      await apiClient.post(`/programs/${applyingProgram.id}/apply`, {
        startup_id: selectedStartupId,
        pitch_summary: pitchSummary.trim(),
      });
      onNotify(`Application submitted to ${applyingProgram.title || applyingProgram.name}!`);
      setApplyingProgram(null);
      fetchMyApplications();
    } catch (err: any) {
      if (err.status === 409 || err.code === 'DUPLICATE_APPLICATION') {
        onNotify('Conflict: your startup has already applied to this program (409)');
      } else if (err.status === 422 || err.code === 'DEADLINE_PASSED') {
        onNotify('Validation Error: program application deadline has passed (422)');
      } else {
        onNotify(`Application error: ${err.message || 'Failed to submit application'}`);
      }
    } finally {
      setSubmittingApplication(false);
    }
  };

  const sectorFilters = ['all', 'AgriTech', 'Climate Tech', 'Clean Energy', 'AI', 'EdTech'];

  return (
    <div className="space-y-6">
      {/* Header and Tab switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-forest">Incubation & Acceleration</span>
          <h2 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Incubators & Applications</h2>
          <p className="mt-1 text-sm text-slate-500">
            Apply to university fellowships, government hubs, and grant programs across India.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('Browse Programs')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'Browse Programs' ? 'bg-white text-ink shadow-xs' : 'text-slate-500 hover:text-ink'
            }`}
          >
            Browse Programs
          </button>
          <button
            onClick={() => setActiveTab('My Applications')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'My Applications' ? 'bg-white text-ink shadow-xs' : 'text-slate-500 hover:text-ink'
            }`}
          >
            My Applications {applications.length > 0 && `(${applications.length})`}
          </button>
        </div>
      </div>

      {/* TAB 1: BROWSE PROGRAMS */}
      {activeTab === 'Browse Programs' && (
        <div className="space-y-5">
          {/* Sector Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter size={14} /> Filter by Sector:
            </span>
            {sectorFilters.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSector(sec)}
                className={`rounded-lg px-3 py-1 font-medium transition ${
                  selectedSector === sec
                    ? 'bg-forest text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sec === 'all' ? 'All Sectors' : sec}
              </button>
            ))}
          </div>

          {/* Programs Grid */}
          {loadingPrograms ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
              Loading available programs...
            </div>
          ) : programs.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
              <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-base font-semibold text-ink">No programs found</h3>
              <p className="mt-1 text-xs text-slate-500">Try choosing a different sector filter.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {programs.map((prog) => {
                const deadlineDate = new Date(prog.deadline);
                const isExpired = deadlineDate.getTime() < Date.now();
                const progTitle = prog.title || prog.name || 'Incubation Program';

                // Check if already applied
                const alreadyApplied = applications.some((a) => a.program_id === prog.id);

                return (
                  <div
                    key={prog.id}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft flex flex-col justify-between transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isExpired ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'
                          }`}>
                            {isExpired ? 'Applications Closed' : 'Accepting Applications'}
                          </span>
                          <h3 className="mt-2 text-base font-bold text-ink">{progTitle}</h3>
                        </div>
                        {alreadyApplied && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-forest">
                            <CheckCircle2 size={12} /> Applied
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {prog.description || 'Focused acceleration, grant funding, and mentor support for technology innovators.'}
                      </p>

                      {prog.eligibility && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          <b className="text-slate-600">Eligibility:</b> {prog.eligibility}
                        </p>
                      )}

                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                        <p className="font-semibold text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">
                          Grants & Benefits
                        </p>
                        <p className="text-slate-700 leading-relaxed line-clamp-2">{prog.benefits}</p>
                      </div>

                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {prog.sectors?.map((s) => (
                          <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={13} className={isExpired ? 'text-rose-500' : 'text-slate-400'} />
                        Deadline: <b className="text-slate-700">{deadlineDate.toLocaleDateString()}</b>
                      </span>

                      <button
                        disabled={isExpired || alreadyApplied}
                        onClick={() => handleOpenApplyModal(prog)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition shadow-xs ${
                          isExpired || alreadyApplied
                            ? 'bg-slate-300 cursor-not-allowed opacity-70'
                            : 'bg-forest hover:bg-ink'
                        }`}
                      >
                        <Building2 size={13} />
                        {alreadyApplied ? 'Applied' : isExpired ? 'Closed' : 'Apply to Program'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'My Applications' && (
        <div className="space-y-4">
          {loadingApplications ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
              Loading your applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
              <ClipboardList size={36} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-base font-semibold text-ink">No applications submitted yet</h3>
              <p className="mt-1 text-xs text-slate-500 mb-4">
                Explore open incubator cohorts and submit your startup application.
              </p>
              <button
                onClick={() => setActiveTab('Browse Programs')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white"
              >
                Browse Programs
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((app) => {
                const progTitle = app.program?.name || app.program?.title || 'Incubation Program';
                const stName = app.startup?.name || 'Your Startup';

                return (
                  <div key={app.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-ink text-sm sm:text-base">{progTitle}</h4>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                            {stName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Submitted on {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            app.status === 'accepted'
                              ? 'bg-emerald-50 text-forest'
                              : app.status === 'shortlisted'
                              ? 'bg-sky-50 text-sky-700'
                              : app.status === 'under_review'
                              ? 'bg-indigo-50 text-indigo-700'
                              : app.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {app.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                      <p className="font-semibold text-slate-400 text-[10px] uppercase mb-0.5">Pitch Summary</p>
                      <p>{app.pitch_summary || 'Submitted application'}</p>
                    </div>

                    {app.decision_notes && (
                      <div className="mt-3 rounded-xl bg-emerald-50/50 p-3 text-xs text-emerald-900 border border-emerald-100">
                        <p className="font-semibold text-[10px] uppercase text-emerald-700 mb-0.5">Incubator Feedback / Next Steps</p>
                        <p>{app.decision_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Apply to Program */}
      {applyingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-sky-700">Program Application</span>
                <h3 className="font-bold text-base text-ink">{applyingProgram.title || applyingProgram.name}</h3>
              </div>
              <button onClick={() => setApplyingProgram(null)}>
                <X size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">SELECT YOUR STARTUP</label>
                <select
                  value={selectedStartupId}
                  onChange={(e) => setSelectedStartupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 bg-white"
                >
                  {founderStartups.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">PITCH SUMMARY & COHORT GOALS *</label>
                <textarea
                  required
                  rows={4}
                  value={pitchSummary}
                  onChange={(e) => setPitchSummary(e.target.value)}
                  placeholder="Summarize your product, target customers, traction metrics, and what grant/lab support you need from this cohort..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setApplyingProgram(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApplication}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs disabled:opacity-50"
                >
                  <Send size={13} />
                  {submittingApplication ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
