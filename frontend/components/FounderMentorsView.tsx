'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  HeartHandshake, 
  Search, 
  Filter, 
  Send, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  X,
  ExternalLink
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

export interface MentorItem {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  bio?: string;
  location?: string;
  organization?: string;
  expertise: string[];
  experience: number;
  linkedin_url?: string | null;
}

export interface MentorshipRequestItem {
  id: string;
  mentor_id: string;
  founder_id: string;
  startup_id?: string | null;
  topic: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'approved' | 'rejected';
  response_note?: string | null;
  created_at: string;
  mentor?: {
    full_name: string;
    organization?: string;
  } | null;
  startup?: {
    name: string;
  } | null;
}

interface FounderMentorsViewProps {
  founderStartups: Array<{ id: string; name: string }>;
  onNotify: (msg: string) => void;
}

export const FounderMentorsView: React.FC<FounderMentorsViewProps> = ({
  founderStartups,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'Browse Mentors' | 'My Requests'>('Browse Mentors');
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mentorship Requests List
  const [myRequests, setMyRequests] = useState<MentorshipRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Request Modal State
  const [modalMentor, setModalMentor] = useState<MentorItem | null>(null);
  const [selectedStartupId, setSelectedStartupId] = useState<string>(
    founderStartups[0]?.id || 'e0000000-0000-0000-0000-000000000001'
  );
  const [requestTopic, setRequestTopic] = useState('Go-to-market advisory');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Fetch Mentors
  const fetchMentors = useCallback(async () => {
    setLoadingMentors(true);
    try {
      const endpoint = selectedExpertise !== 'all' ? `/mentors?expertise=${encodeURIComponent(selectedExpertise)}` : '/mentors';
      const res = await apiClient.get<MentorItem[]>(endpoint);
      setMentors(res.data || []);
    } catch (err: any) {
      console.error('Failed to load mentors', err);
    } finally {
      setLoadingMentors(false);
    }
  }, [selectedExpertise]);

  // Fetch My Mentorship Requests
  const fetchMyRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await apiClient.get<MentorshipRequestItem[]>('/mentorship-requests');
      setMyRequests(res.data || []);
    } catch (err: any) {
      console.error('Failed to load mentorship requests', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Browse Mentors') {
      fetchMentors();
    } else {
      fetchMyRequests();
    }
  }, [activeTab, fetchMentors, fetchMyRequests]);

  const handleOpenRequestModal = (m: MentorItem) => {
    setModalMentor(m);
    setRequestTopic('Product & Pilot Guidance');
    setRequestMessage(`Hi ${m.full_name}, I am building ${founderStartups[0]?.name || 'our startup'} and would appreciate your advice on field trials and scaling.`);
    if (founderStartups.length > 0) {
      setSelectedStartupId(founderStartups[0].id);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMentor) return;
    setSubmittingRequest(true);
    try {
      await apiClient.post('/mentorship-requests', {
        mentor_id: modalMentor.user_id || modalMentor.id,
        startup_id: selectedStartupId || undefined,
        topic: requestTopic.trim(),
        message: requestMessage.trim(),
      });
      onNotify(`Mentorship request sent to ${modalMentor.full_name}!`);
      setModalMentor(null);
      fetchMyRequests();
    } catch (err: any) {
      onNotify(`Request error: ${err.message || 'Failed to submit'}`);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const allExpertiseOptions = ['all', 'AgriTech', 'SaaS Growth', 'Rural Distribution', 'Product Management', 'Grant Funding'];

  const filteredMentors = mentors.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q) ||
      m.expertise?.some((e) => e.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Tab switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-forest">Founders Den Mentorship</span>
          <h2 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Find Your Mentor</h2>
          <p className="mt-1 text-sm text-slate-500">
            Connect with seasoned operators and domain specialists to validate your unit economics and strategy.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('Browse Mentors')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'Browse Mentors' ? 'bg-white text-ink shadow-xs' : 'text-slate-500 hover:text-ink'
            }`}
          >
            Browse Mentors
          </button>
          <button
            onClick={() => setActiveTab('My Requests')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'My Requests' ? 'bg-white text-ink shadow-xs' : 'text-slate-500 hover:text-ink'
            }`}
          >
            My Requests {myRequests.length > 0 && `(${myRequests.length})`}
          </button>
        </div>
      </div>

      {/* TAB 1: BROWSE MENTORS */}
      {activeTab === 'Browse Mentors' && (
        <div className="space-y-5">
          {/* Controls: Search and Expertise Badges */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mentors by name, topic, or keyword..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1 text-[11px] font-semibold">Expertise:</span>
              {allExpertiseOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelectedExpertise(opt)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition font-medium ${
                    selectedExpertise === opt
                      ? 'bg-forest text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt}
                </button>
              ))}
            </div>
          </div>

          {/* Mentors Grid */}
          {loadingMentors ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
              Loading mentors directory...
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
              <HeartHandshake size={36} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-base font-semibold text-ink">No mentors match your search</h3>
              <p className="mt-1 text-xs text-slate-500">Try choosing a different expertise filter or keyword.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMentors.map((m) => {
                const initials = m.full_name?.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'M';
                return (
                  <div
                    key={m.id || m.user_id}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft flex flex-col justify-between transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-forest font-bold text-sm">
                            {initials}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-ink text-sm sm:text-base">{m.full_name}</h3>
                              <span title="Verified Mentor">
                                <ShieldCheck size={16} className="text-emerald-700" />
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{m.organization || 'Founders Den Mentor'}</p>
                            {m.location && <p className="text-[11px] text-slate-400">{m.location}</p>}
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {m.experience ? `${m.experience}+ yrs` : 'Expert'}
                        </span>
                      </div>

                      <p className="mt-3.5 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {m.bio || 'Advising early-stage founders on strategy, distribution, and product architecture.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {m.expertise?.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-forest"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
                      {m.linkedin_url ? (
                        <a
                          href={m.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-slate-500 hover:text-ink flex items-center gap-1"
                        >
                          LinkedIn <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={() => handleOpenRequestModal(m)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs"
                      >
                        <HeartHandshake size={14} /> Request Mentorship
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY REQUESTS */}
      {activeTab === 'My Requests' && (
        <div className="space-y-4">
          {loadingRequests ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
              Loading your sent requests...
            </div>
          ) : myRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
              <HeartHandshake size={36} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-base font-semibold text-ink">No mentorship requests sent yet</h3>
              <p className="mt-1 text-xs text-slate-500 mb-4">
                Browse our verified mentor directory and request guidance from leading experts.
              </p>
              <button
                onClick={() => setActiveTab('Browse Mentors')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white"
              >
                Browse Mentors
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myRequests.map((req) => {
                const mentorName = req.mentor?.full_name || 'Mentor';
                const isAccepted = req.status === 'accepted' || req.status === 'approved';
                const isDeclined = req.status === 'declined' || req.status === 'rejected';

                return (
                  <div key={req.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-ink text-sm sm:text-base">
                            Request to {mentorName}
                          </h4>
                          {req.startup?.name && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                              For {req.startup.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Topic: <b>{req.topic}</b> · Sent {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        {isAccepted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-forest">
                            <CheckCircle2 size={13} /> Accepted
                          </span>
                        ) : isDeclined ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                            <XCircle size={13} /> Declined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            <Clock size={13} /> Awaiting Mentor Response
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                      <p className="font-semibold text-slate-400 text-[10px] uppercase mb-0.5">Your Message</p>
                      <p>{req.message}</p>
                    </div>

                    {req.response_note && (
                      <div className="mt-3 rounded-xl bg-emerald-50/50 p-3 text-xs text-emerald-900 border border-emerald-100">
                        <p className="font-semibold text-[10px] uppercase text-emerald-700 mb-0.5">Mentor Response Note</p>
                        <p>{req.response_note}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Request Mentorship */}
      {modalMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-forest">Connect With Mentor</span>
                <h3 className="font-bold text-base text-ink">{modalMentor.full_name}</h3>
              </div>
              <button onClick={() => setModalMentor(null)}>
                <X size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4">
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">MENTORSHIP TOPIC / CHALLENGE *</label>
                <input
                  required
                  value={requestTopic}
                  onChange={(e) => setRequestTopic(e.target.value)}
                  placeholder="e.g. Field trials & farmer pilot adoption"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">MESSAGE & WHAT YOU SEEK GUIDANCE ON *</label>
                <textarea
                  required
                  rows={4}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Introduce your startup's current status and describe what specific advice you need..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setModalMentor(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs disabled:opacity-50"
                >
                  <Send size={13} />
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
