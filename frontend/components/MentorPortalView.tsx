'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  HeartHandshake, 
  Lightbulb, 
  UserRound, 
  Star, 
  Check, 
  X, 
  Plus, 
  Clock, 
  MessageCircle, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface MentorshipRequestItem {
  id: string;
  founder_id: string;
  mentor_id: string;
  startup_id?: string | null;
  topic: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'approved' | 'rejected';
  response_note?: string | null;
  created_at: string;
  founder?: {
    id: string;
    full_name: string;
    email: string;
    location?: string;
  } | null;
  startup?: {
    id: string;
    name: string;
    tagline?: string;
    sector?: string;
    stage?: string;
  } | null;
}

interface StartupItem {
  id: string;
  founder_id: string;
  name: string;
  tagline: string;
  description?: string;
  sector: string;
  stage: string;
  location: string;
  funding_ask: number;
}

interface MentorFeedbackItem {
  id: string;
  startup_id: string;
  mentor_id: string;
  feedback: string;
  rating: number;
  strengths?: string[];
  areas_for_improvement?: string[];
  created_at: string;
  mentor?: {
    full_name: string;
  } | null;
}

interface MentorPortalViewProps {
  activeTab: 'Mentorship Requests' | 'Startups to Review' | 'My Expertise Profile';
  onNotify: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const MentorPortalView: React.FC<MentorPortalViewProps> = ({
  activeTab,
  onNotify,
}) => {
  // 1. Mentorship Requests State
  const [requests, setRequests] = useState<MentorshipRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseAction, setResponseAction] = useState<'accept' | 'decline' | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // 2. Startups to Review State
  const [startups, setStartups] = useState<StartupItem[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupItem | null>(null);
  const [feedbackList, setFeedbackList] = useState<MentorFeedbackItem[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  // Feedback Form State
  const [rating, setRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [strengthInput, setStrengthInput] = useState('');
  const [strengths, setStrengths] = useState<string[]>(['Strong market alignment']);
  const [improvementInput, setImprovementInput] = useState('');
  const [improvements, setImprovements] = useState<string[]>(['Unit economics validation']);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // 3. Expertise Profile State
  const [expertiseTags, setExpertiseTags] = useState<string[]>([
    'AgriTech',
    'Rural Distribution',
    'Grant Funding',
    'Field Pilots',
  ]);
  const [tagInput, setTagInput] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(12);
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com/in/kavitamehra-demo');
  const [bioText, setBioText] = useState('12 years advising rural innovators and validating pilot economics in northern India.');
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await apiClient.get<MentorshipRequestItem[]>('/mentorship-requests');
      setRequests(res.data || []);
    } catch (err: any) {
      console.error('Error fetching mentorship requests', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Fetch Startups to Review
  const fetchStartups = useCallback(async () => {
    try {
      const res = await apiClient.get<StartupItem[]>('/startups?limit=20');
      setStartups(res.data || []);
      if (res.data && res.data.length > 0 && !selectedStartup) {
        setSelectedStartup(res.data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching startups to review', err);
    }
  }, [selectedStartup]);

  // Fetch Feedback for Selected Startup
  const fetchFeedbackForStartup = useCallback(async (startupId: string) => {
    setLoadingFeedback(true);
    try {
      const res = await apiClient.get<MentorFeedbackItem[]>(`/startups/${startupId}/feedback`);
      setFeedbackList(res.data || []);
    } catch {
      setFeedbackList([]);
    } finally {
      setLoadingFeedback(false);
    }
  }, []);

  // Fetch Mentor Profile
  const fetchMentorProfile = useCallback(async () => {
    try {
      const meRes = await apiClient.get<any>('/me');
      const mp = meRes.data?.mentor_profile;
      if (mp) {
        if (Array.isArray(mp.expertise) && mp.expertise.length > 0) {
          setExpertiseTags(mp.expertise);
        } else if (Array.isArray(mp.expertise_areas)) {
          setExpertiseTags(mp.expertise_areas);
        }
        if (typeof mp.experience === 'number') {
          setExperienceYears(mp.experience);
        }
        if (mp.linkedin_url) setLinkedinUrl(mp.linkedin_url);
        if (mp.bio) setBioText(mp.bio);
      }
    } catch (err) {
      console.error('Failed to load mentor profile', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Mentorship Requests') {
      fetchRequests();
    } else if (activeTab === 'Startups to Review') {
      fetchStartups();
    } else if (activeTab === 'My Expertise Profile') {
      fetchMentorProfile();
    }
  }, [activeTab, fetchRequests, fetchStartups, fetchMentorProfile]);

  useEffect(() => {
    if (selectedStartup) {
      fetchFeedbackForStartup(selectedStartup.id);
    }
  }, [selectedStartup, fetchFeedbackForStartup]);

  // Handle Respond to Request (Accept / Decline)
  const handleRespondSubmit = async () => {
    if (!respondingId || !responseAction) return;
    setSubmittingResponse(true);
    try {
      const res = await apiClient.patch<{ data: MentorshipRequestItem }>(
        `/mentorship-requests/${respondingId}/respond`,
        {
          status: responseAction === 'accept' ? 'accepted' : 'declined',
          response_note: responseNote.trim() || undefined,
        }
      );
      setRequests((prev) =>
        prev.map((r) =>
          r.id === respondingId
            ? { ...r, status: responseAction === 'accept' ? 'accepted' : 'declined', response_note: responseNote }
            : r
        )
      );
      onNotify(`Mentorship request ${responseAction === 'accept' ? 'accepted' : 'declined'} successfully!`);
      setRespondingId(null);
      setResponseAction(null);
      setResponseNote('');
    } catch (err: any) {
      onNotify(`Error: ${err.message || 'Failed to respond to request'}`);
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Handle Feedback Submission
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStartup) return;
    if (!feedbackText.trim() || feedbackText.trim().length < 5) {
      onNotify('Please provide detailed feedback (at least 5 characters)');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = await apiClient.post<MentorFeedbackItem>(`/startups/${selectedStartup.id}/feedback`, {
        rating,
        feedback: feedbackText.trim(),
        strengths: strengths.length > 0 ? strengths : undefined,
        areas_for_improvement: improvements.length > 0 ? improvements : undefined,
      });
      onNotify('Feedback and rating submitted to founder!');
      setFeedbackText('');
      fetchFeedbackForStartup(selectedStartup.id);
    } catch (err: any) {
      onNotify(`Error: ${err.message || 'Failed to submit feedback'}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle Save Mentor Profile
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiClient.put('/me/mentor-profile', {
        expertise: expertiseTags,
        experience: Number(experienceYears),
        linkedin_url: linkedinUrl,
        bio: bioText,
      });
      onNotify('Expertise profile saved successfully!');
    } catch (err: any) {
      onNotify(`Save error: ${err.message || 'Failed to update profile'}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !expertiseTags.includes(tagInput.trim())) {
      setExpertiseTags([...expertiseTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setExpertiseTags(expertiseTags.filter((x) => x !== t));
  };

  const addStrength = () => {
    if (strengthInput.trim() && !strengths.includes(strengthInput.trim())) {
      setStrengths([...strengths, strengthInput.trim()]);
      setStrengthInput('');
    }
  };

  const removeStrength = (s: string) => {
    setStrengths(strengths.filter((x) => x !== s));
  };

  const addImprovement = () => {
    if (improvementInput.trim() && !improvements.includes(improvementInput.trim())) {
      setImprovements([...improvements, improvementInput.trim()]);
      setImprovementInput('');
    }
  };

  const removeImprovement = (i: string) => {
    setImprovements(improvements.filter((x) => x !== i));
  };

  // ========================================================
  // TAB 1: MENTORSHIP REQUESTS
  // ========================================================
  if (activeTab === 'Mentorship Requests') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">Mentorship Requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review and respond to guidance requests sent by founders in your expertise sectors.
            </p>
          </div>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Refresh
          </button>
        </div>

        {loadingRequests ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">
            Loading mentorship requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-soft">
            <HeartHandshake size={36} className="mx-auto text-emerald-600 opacity-60 mb-3" />
            <h3 className="text-base font-semibold text-ink">No requests pending</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              When founders seek guidance on your advisory topics, their requests will appear here for you to accept or decline.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((r) => {
              const isAccepted = r.status === 'accepted' || r.status === 'approved';
              const isDeclined = r.status === 'declined' || r.status === 'rejected';
              const isPending = r.status === 'pending';
              const founderName = r.founder?.full_name || 'Founder';
              const startupName = r.startup?.name || 'Startup';

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:border-emerald-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-forest font-bold text-sm">
                          {founderName.split(' ').map((x) => x[0]).join('').slice(0, 2)}
                        </span>
                        <div>
                          <h4 className="font-semibold text-ink text-sm sm:text-base">
                            {founderName} <span className="text-slate-400 font-normal">from</span> {startupName}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Topic: <b>{r.topic}</b></span>
                            <span>·</span>
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isPending && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Pending Response
                        </span>
                      )}
                      {isAccepted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-forest">
                          <Check size={12} /> Accepted
                        </span>
                      )}
                      {isDeclined && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          <X size={12} /> Declined
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed border border-slate-100">
                    <p className="font-medium text-slate-500 uppercase text-[10px] tracking-wider mb-1">Message</p>
                    {r.message}
                  </div>

                  {r.response_note && (
                    <div className="mt-3 rounded-xl bg-emerald-50/50 p-3 text-xs text-emerald-900 border border-emerald-100">
                      <p className="font-semibold text-[10px] text-emerald-700 uppercase tracking-wide">Your Note to Founder</p>
                      <p className="mt-0.5">{r.response_note}</p>
                    </div>
                  )}

                  {isPending && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      {respondingId === r.id ? (
                        <div className="w-full space-y-2 animate-in fade-in duration-150">
                          <textarea
                            value={responseNote}
                            onChange={(e) => setResponseNote(e.target.value)}
                            placeholder={`Add an optional note to ${founderName} explaining your ${responseAction} decision...`}
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-500"
                            rows={2}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setRespondingId(null);
                                setResponseAction(null);
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={submittingResponse}
                              onClick={handleRespondSubmit}
                              className={`rounded-xl px-4 py-1.5 text-xs font-semibold text-white transition ${
                                responseAction === 'accept' ? 'bg-forest hover:bg-ink' : 'bg-rose-600 hover:bg-rose-700'
                              }`}
                            >
                              {submittingResponse ? 'Saving...' : `Confirm ${responseAction === 'accept' ? 'Accept' : 'Decline'}`}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setRespondingId(r.id);
                              setResponseAction('accept');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs"
                          >
                            <Check size={14} /> Accept Request
                          </button>
                          <button
                            onClick={() => {
                              setRespondingId(r.id);
                              setResponseAction('decline');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                          >
                            <X size={14} /> Decline
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // TAB 2: STARTUPS TO REVIEW & FEEDBACK
  // ========================================================
  if (activeTab === 'Startups to Review') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Startups to Review</h2>
          <p className="mt-1 text-sm text-slate-500">
            Share structured feedback, ratings, and strategic advice with founders building in your domain.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Startups Selector List */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft space-y-3">
            <h3 className="font-semibold text-sm text-ink mb-2">Select Startup to Review</h3>
            {startups.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading startups...</div>
            ) : (
              startups.map((s) => {
                const isSelected = selectedStartup?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStartup(s)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-ink text-sm">{s.name}</h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {s.stage?.toUpperCase() || 'MVP'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.tagline}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{s.sector}</span>
                      <span>·</span>
                      <span>{s.location}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Feedback Form & Past Reviews */}
          <div className="space-y-5">
            {selectedStartup ? (
              <>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
                  <div className="border-b border-slate-100 pb-4 mb-4">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-forest">Reviewing</span>
                    <h3 className="text-lg font-bold text-ink">{selectedStartup.name}</h3>
                    <p className="text-xs text-slate-600 mt-1">{selectedStartup.description || selectedStartup.tagline}</p>
                  </div>

                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    {/* Rating Stars */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        OVERALL RATING (1 TO 5 STARS)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1 rounded-lg hover:bg-slate-50 transition"
                          >
                            <Star
                              size={22}
                              className={
                                star <= rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300'
                              }
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-bold text-slate-700">
                          {rating} / 5
                        </span>
                      </div>
                    </div>

                    {/* Feedback Textarea */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        STRUCTURED FEEDBACK & ADVISORY
                      </label>
                      <textarea
                        required
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Provide concrete suggestions on go-to-market, pilot validation, pricing, or product readiness..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-500"
                        rows={4}
                      />
                    </div>

                    {/* Strengths Tags */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        NOTABLE STRENGTHS
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {strengths.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-forest font-medium"
                          >
                            {s}
                            <button type="button" onClick={() => removeStrength(s)}>
                              <X size={12} className="hover:text-rose-600" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={strengthInput}
                          onChange={(e) => setStrengthInput(e.target.value)}
                          placeholder="e.g. Founder domain expertise"
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addStrength();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addStrength}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Improvement Areas */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        AREAS FOR IMPROVEMENT
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {improvements.map((imp) => (
                          <span
                            key={imp}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 font-medium"
                          >
                            {imp}
                            <button type="button" onClick={() => removeImprovement(imp)}>
                              <X size={12} className="hover:text-rose-600" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={improvementInput}
                          onChange={(e) => setImprovementInput(e.target.value)}
                          placeholder="e.g. Unit economics validation"
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addImprovement();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addImprovement}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink transition shadow-xs disabled:opacity-50"
                    >
                      <Send size={14} />
                      {submittingFeedback ? 'Submitting...' : 'Submit Mentor Feedback'}
                    </button>
                  </form>
                </div>

                {/* Prior Feedback on this Startup */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
                  <h4 className="text-sm font-semibold text-ink mb-3">Feedback History</h4>
                  {loadingFeedback ? (
                    <p className="text-xs text-slate-400">Loading reviews...</p>
                  ) : feedbackList.length === 0 ? (
                    <p className="text-xs text-slate-400">No feedback submitted yet for this startup.</p>
                  ) : (
                    <div className="space-y-3">
                      {feedbackList.map((fb) => (
                        <div key={fb.id} className="rounded-xl border border-slate-100 p-3 text-xs bg-slate-50/50">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={13}
                                  className={
                                    i < fb.rating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-300'
                                  }
                                />
                              ))}
                              <span className="font-bold text-slate-700 ml-1">{fb.rating}/5</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(fb.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{fb.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-xs text-slate-400">
                Select a startup from the left to begin review.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // TAB 3: MY EXPERTISE PROFILE
  // ==========================================
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">My Expertise Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Curate the skills, sectors, and pilot experience you mentor founders on.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft max-w-2xl space-y-5">
        {/* Expertise Tags Editor */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            AREAS OF EXPERTISE & ADVISORY
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {expertiseTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-forest"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-emerald-700 hover:text-rose-600 transition"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. Pricing Strategy, B2B Sales, Agritech"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-ink transition shadow-xs"
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Years of Experience */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            YEARS OF OPERATIONAL / FOUNDER EXPERIENCE
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            className="w-full sm:w-48 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        {/* LinkedIn URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            LINKEDIN / PORTFOLIO URL
          </label>
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        {/* Mentor Bio */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            MENTOR BIO & ADVISORY THESIS
          </label>
          <textarea
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-500"
            placeholder="Summarize your background, notable career achievements, and how you mentor founders..."
          />
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-white hover:bg-ink transition shadow-xs disabled:opacity-50"
        >
          <Check size={14} />
          {savingProfile ? 'Saving...' : 'Save Expertise Profile'}
        </button>
      </div>
    </div>
  );
};
