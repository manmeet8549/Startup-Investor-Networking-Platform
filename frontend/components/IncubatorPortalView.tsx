'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit3, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Check, 
  Filter,
  Eye,
  Send
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

export interface IncubatorProgramItem {
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
  created_at: string;
}

export interface ApplicationItem {
  id: string;
  program_id: string;
  startup_id: string;
  founder_id: string;
  pitch_summary?: string | null;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected';
  decision_notes?: string | null;
  created_at: string;
  startup?: {
    id: string;
    name: string;
    tagline?: string;
    sector?: string;
    stage?: string;
    funding_ask?: number;
  } | null;
  founder?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  program?: {
    id: string;
    name?: string;
    title?: string;
  } | null;
}

interface IncubatorPortalViewProps {
  activeTab: 'My Programs' | 'Applications Received';
  onNotify: (msg: string) => void;
}

export const IncubatorPortalView: React.FC<IncubatorPortalViewProps> = ({
  activeTab,
  onNotify,
}) => {
  // Programs State
  const [programs, setPrograms] = useState<IncubatorProgramItem[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<IncubatorProgramItem | null>(null);

  // Program Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEligibility, setFormEligibility] = useState('');
  const [formBenefits, setFormBenefits] = useState('');
  const [formSectors, setFormSectors] = useState<string[]>(['AgriTech']);
  const [sectorInput, setSectorInput] = useState('');
  const [formDeadline, setFormDeadline] = useState('2027-03-31');
  const [submittingProgram, setSubmittingProgram] = useState(false);

  // Applications State
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all');
  const [decisionNotesModalApp, setDecisionNotesModalApp] = useState<ApplicationItem | null>(null);
  const [targetTransitionStatus, setTargetTransitionStatus] = useState<string>('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch Programs
  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    try {
      const res = await apiClient.get<IncubatorProgramItem[]>('/programs');
      setPrograms(res.data || []);
    } catch (err: any) {
      console.error('Failed to load programs', err);
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      const res = await apiClient.get<ApplicationItem[]>('/applications');
      setApplications(res.data || []);
    } catch (err: any) {
      console.error('Failed to load applications', err);
    } finally {
      setLoadingApplications(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'My Programs') {
      fetchPrograms();
    } else {
      fetchApplications();
      fetchPrograms();
    }
  }, [activeTab, fetchPrograms, fetchApplications]);

  // Open Create/Edit Program Modal
  const openCreateModal = () => {
    setEditingProgram(null);
    setFormTitle('');
    setFormDescription('');
    setFormEligibility('');
    setFormBenefits('₹5 Lakh prototype grant, lab access, and mentor network.');
    setFormSectors(['AgriTech', 'Climate Tech']);
    setFormDeadline('2027-03-31');
    setProgramModalOpen(true);
  };

  const openEditModal = (prog: IncubatorProgramItem) => {
    setEditingProgram(prog);
    setFormTitle(prog.title || prog.name || '');
    setFormDescription(prog.description || '');
    setFormEligibility(prog.eligibility || '');
    setFormBenefits(prog.benefits || '');
    setFormSectors(prog.sectors || ['General']);
    setFormDeadline(prog.deadline?.slice(0, 10) || '2027-03-31');
    setProgramModalOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onNotify('Program title is required');
      return;
    }
    setSubmittingProgram(true);
    try {
      const payload = {
        title: formTitle.trim(),
        name: formTitle.trim(),
        description: formDescription.trim() || undefined,
        eligibility: formEligibility.trim() || undefined,
        benefits: formBenefits.trim(),
        sectors: formSectors.length > 0 ? formSectors : ['General'],
        deadline: new Date(formDeadline).toISOString(),
      };

      if (editingProgram) {
        await apiClient.patch(`/programs/${editingProgram.id}`, payload);
        onNotify('Program updated successfully!');
      } else {
        await apiClient.post('/programs', payload);
        onNotify('New incubator program launched!');
      }
      setProgramModalOpen(false);
      fetchPrograms();
    } catch (err: any) {
      onNotify(`Error: ${err.message || 'Failed to save program'}`);
    } finally {
      setSubmittingProgram(false);
    }
  };

  const handleDeleteProgram = async (progId: string) => {
    if (!confirm('Are you sure you want to delete this incubator program?')) return;
    try {
      await apiClient.delete(`/programs/${progId}`);
      setPrograms((prev) => prev.filter((p) => p.id !== progId));
      onNotify('Program deleted successfully');
    } catch (err: any) {
      onNotify(`Delete error: ${err.message || 'Failed'}`);
    }
  };

  // Status Machine Update Handler
  const promptStatusChange = (app: ApplicationItem, newStatus: string) => {
    setDecisionNotesModalApp(app);
    setTargetTransitionStatus(newStatus);
    setDecisionNotes(
      newStatus === 'accepted'
        ? 'Congratulations! Accepted into cohort.'
        : newStatus === 'shortlisted'
        ? 'Shortlisted for interview batch.'
        : newStatus === 'under_review'
        ? 'Under technical review.'
        : 'Thank you for applying. We are unable to proceed at this time.'
    );
  };

  const confirmStatusChange = async () => {
    if (!decisionNotesModalApp || !targetTransitionStatus) return;
    setUpdatingStatus(true);
    try {
      await apiClient.patch(`/applications/${decisionNotesModalApp.id}/status`, {
        status: targetTransitionStatus,
        decision_notes: decisionNotes.trim() || undefined,
      });
      setApplications((prev) =>
        prev.map((a) =>
          a.id === decisionNotesModalApp.id
            ? { ...a, status: targetTransitionStatus as any, decision_notes: decisionNotes }
            : a
        )
      );
      onNotify(`Application moved to ${targetTransitionStatus.replace('_', ' ')}!`);
      setDecisionNotesModalApp(null);
    } catch (err: any) {
      onNotify(`Status update error: ${err.message || 'Invalid transition'}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const addSector = () => {
    if (sectorInput.trim() && !formSectors.includes(sectorInput.trim())) {
      setFormSectors([...formSectors, sectorInput.trim()]);
      setSectorInput('');
    }
  };

  const removeSector = (s: string) => {
    setFormSectors(formSectors.filter((x) => x !== s));
  };

  // Filtered Applications
  const filteredApplications = applications.filter((a) => {
    if (selectedStatusFilter !== 'all' && a.status !== selectedStatusFilter) return false;
    if (selectedProgramFilter !== 'all' && a.program_id !== selectedProgramFilter) return false;
    return true;
  });

  // ========================================================
  // TAB 1: MY PROGRAMS
  // ========================================================
  if (activeTab === 'My Programs') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">My Incubator Programs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your acceleration cohorts, grant opportunities, and deadlines.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink transition shadow-xs"
          >
            <Plus size={15} /> Create Program
          </button>
        </div>

        {loadingPrograms ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
            Loading incubator programs...
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
            <Building2 size={36} className="mx-auto text-sky-600 opacity-60 mb-3" />
            <h3 className="text-base font-semibold text-ink">No programs published yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Launch your first incubator or accelerator cohort to start receiving startup applications.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus size={14} /> New Program
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {programs.map((p) => {
              const deadlineDate = new Date(p.deadline);
              const isExpired = deadlineDate.getTime() < Date.now();
              const progTitle = p.title || p.name || 'Incubation Program';

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft flex flex-col justify-between transition hover:border-sky-200"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 uppercase tracking-wide">
                          {isExpired ? 'Deadline Passed' : 'Active Cohort'}
                        </span>
                        <h3 className="mt-2 text-base font-bold text-ink">{progTitle}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Edit program"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(p.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete program"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {p.description || 'Pre-incubation and acceleration cohort for early-stage founders.'}
                    </p>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                      <p className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide mb-0.5">Benefits</p>
                      <p className="text-slate-700 line-clamp-2">{p.benefits}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.sectors?.map((sec) => (
                        <span key={sec} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className={isExpired ? 'text-rose-500' : 'text-slate-400'} />
                      Deadline: <b className="text-slate-700">{deadlineDate.toLocaleDateString()}</b>
                    </span>
                    <button
                      onClick={() => onNotify(`Viewing applications for ${progTitle}`)}
                      className="text-xs font-semibold text-forest hover:text-ink transition flex items-center gap-1"
                    >
                      Applications <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create / Edit Program */}
        {programModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-base text-ink">
                  {editingProgram ? 'Edit Program' : 'Create New Program'}
                </h3>
                <button onClick={() => setProgramModalOpen(false)}>
                  <X size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSaveProgram} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">PROGRAM TITLE *</label>
                  <input
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Agri-Innovation Fellowship 2027"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">DESCRIPTION / SUMMARY</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Cohort duration, goals, and focus areas..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ELIGIBILITY CRITERIA</label>
                  <input
                    value={formEligibility}
                    onChange={(e) => setFormEligibility(e.target.value)}
                    placeholder="e.g. Must have working MVP and registered in India"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">PROGRAM BENEFITS & GRANTS *</label>
                  <textarea
                    required
                    rows={2}
                    value={formBenefits}
                    onChange={(e) => setFormBenefits(e.target.value)}
                    placeholder="e.g. ₹5L prototype grant, mentorship sessions, corporate demo day"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Sectors */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">FOCUS SECTORS</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formSectors.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                        {s}
                        <button type="button" onClick={() => removeSector(s)}>
                          <X size={12} className="hover:text-rose-600" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={sectorInput}
                      onChange={(e) => setSectorInput(e.target.value)}
                      placeholder="Add sector..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={addSector}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">APPLICATION DEADLINE *</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setProgramModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProgram}
                    className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs disabled:opacity-50"
                  >
                    {submittingProgram ? 'Saving...' : editingProgram ? 'Save Changes' : 'Publish Program'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // TAB 2: APPLICATIONS RECEIVED & REVIEW ACTIONS
  // ========================================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Applications Received</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review submissions, evaluate pitch summaries, and advance candidates through the selection funnel.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft text-xs">
        <span className="font-semibold text-slate-500 flex items-center gap-1">
          <Filter size={14} /> Filter by Status:
        </span>
        {['all', 'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatusFilter(st)}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              selectedStatusFilter === st
                ? 'bg-forest text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st === 'all' ? 'All Applications' : st.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {loadingApplications ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
          Loading applications table...
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
          <ClipboardList size={36} className="mx-auto text-slate-400 opacity-60 mb-3" />
          <h3 className="text-base font-semibold text-ink">No applications found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {selectedStatusFilter !== 'all'
              ? `No applications currently in '${selectedStatusFilter}' status.`
              : 'Startups applying to your incubator programs will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Startup & Founder</th>
                  <th className="py-3 px-4">Program Applied</th>
                  <th className="py-3 px-4">Pitch Summary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const startupName = app.startup?.name || 'Startup';
                  const founderName = app.founder?.full_name || 'Founder';
                  const progTitle = app.program?.name || app.program?.title || 'Program';

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ink">{startupName}</p>
                        <p className="text-[11px] text-slate-500">{founderName}</p>
                        {app.startup?.stage && (
                          <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-600">
                            {app.startup.stage}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {progTitle}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-slate-600">
                        <p className="line-clamp-2">{app.pitch_summary || 'No pitch summary provided'}</p>
                        {app.decision_notes && (
                          <p className="mt-1 text-[10px] text-emerald-800 font-medium">
                            Note: {app.decision_notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Valid transition buttons */}
                          {app.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => promptStatusChange(app, 'under_review')}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => promptStatusChange(app, 'rejected')}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => promptStatusChange(app, 'shortlisted')}
                                className="rounded-lg bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100 transition"
                              >
                                Shortlist
                              </button>
                              <button
                                onClick={() => promptStatusChange(app, 'rejected')}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.status === 'shortlisted' && (
                            <>
                              <button
                                onClick={() => promptStatusChange(app, 'accepted')}
                                className="rounded-lg bg-forest px-3 py-1 font-semibold text-white hover:bg-ink transition shadow-xs"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => promptStatusChange(app, 'rejected')}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.status === 'rejected' && (
                            <button
                              onClick={() => promptStatusChange(app, 'under_review')}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-500 hover:bg-slate-50 transition"
                            >
                              Re-open
                            </button>
                          )}

                          {app.status === 'accepted' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest">
                              <CheckCircle2 size={13} /> Cohort Member
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision Note Modal */}
      {decisionNotesModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-ink mb-1">
              Transition Application to <span className="uppercase text-forest">{targetTransitionStatus.replace('_', ' ')}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add decision notes to be sent to {decisionNotesModalApp.founder?.full_name || 'the founder'}.
            </p>

            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Reason or feedback for this status update..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionNotesModalApp(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={confirmStatusChange}
                className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
