'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/AuthContext';
import { PipelineBoard } from '../components/PipelineBoard';
import { WatchlistSection } from '../components/WatchlistSection';
import { MeetingRequestsView } from '../components/MeetingRequestsView';
import { MessagesView } from '../components/MessagesView';
import { PitchRequestModal } from '../components/PitchRequestModal';
import { PipelineHistoryModal } from '../components/PipelineHistoryModal';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { MentorPortalView } from '../components/MentorPortalView';
import { IncubatorPortalView } from '../components/IncubatorPortalView';
import { FounderMentorsView } from '../components/FounderMentorsView';
import { FounderIncubatorsView } from '../components/FounderIncubatorsView';
import {
  AdminDashboardView,
  AdminVerificationQueueView,
  AdminUsersView,
  AdminStartupListingsView,
  AdminReportedContentView,
} from '../components/AdminConsoleView';
import { ReportModal } from '../components/ReportModal';
import { ArrowDownRight, ArrowRight, Bell, Bookmark, BriefcaseBusiness, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock3, Compass, FileText, Filter, Flag, Handshake, HeartHandshake, LayoutDashboard, Lightbulb, LogOut, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Users, X, MapPin, TrendingUp, CalendarDays, Eye, LockKeyhole, CheckCircle2, CircleDashed, SlidersHorizontal, Upload, Send, UserRound, PanelsTopLeft, GraduationCap, ChartNoAxesCombined, ExternalLink, Inbox, Trash2 } from 'lucide-react';

import { 
  type UiStartup as Startup, 
  initialStartups, 
  investors, 
  programs 
} from '../lib/mock-data';

type Role = 'Public'|'Founder'|'Investor'|'Mentor'|'Incubator'|'Admin';

const roleConfig:Record<Exclude<Role,'Public'>,{label:string;sub:string;items:{label:string;icon:any}[]}>={
 Founder:{label:'Founder workspace',sub:'Build your next chapter',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'My Startup',icon:Lightbulb},{label:'Pitch Deck & Documents',icon:FileText},{label:'Investor Matches',icon:Sparkles},{label:'Discover Investors',icon:Compass},{label:'Mentors',icon:HeartHandshake},{label:'Incubators & Applications',icon:Building2},{label:'Messages',icon:MessageCircle},{label:'Profile & Settings',icon:Settings}]},
 Investor:{label:'Investor workspace',sub:'Find your next opportunity',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'Discover Startups',icon:Compass},{label:'Recommended Startups',icon:Sparkles},{label:'Watchlist & Notes',icon:Bookmark},{label:'Pipeline',icon:ChartNoAxesCombined},{label:'Meeting Requests',icon:CalendarDays},{label:'Messages',icon:MessageCircle},{label:'Investment Preferences',icon:SlidersHorizontal},{label:'Profile & Settings',icon:Settings}]},
 Mentor:{label:'Mentor workspace',sub:'Help founders move forward',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'My Expertise Profile',icon:UserRound},{label:'Mentorship Requests',icon:HeartHandshake},{label:'Startups to Review',icon:Lightbulb},{label:'Messages',icon:MessageCircle},{label:'Profile & Settings',icon:Settings}]},
 Incubator:{label:'Incubator workspace',sub:'Discover and support founders',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'My Programs',icon:Building2},{label:'Applications Received',icon:ClipboardList},{label:'Discover Startups',icon:Compass},{label:'Messages',icon:MessageCircle},{label:'Profile & Settings',icon:Settings}]},
 Admin:{label:'Admin console',sub:'Keep the ecosystem trusted',items:[{label:'Dashboard',icon:LayoutDashboard},{label:'Verification Queue',icon:ShieldCheck},{label:'Users',icon:Users},{label:'Startup Listings',icon:PanelsTopLeft},{label:'Reported Content',icon:Inbox},{label:'Platform Settings',icon:Settings}]}
};

const navPublic=['Home','Explore Startups','How It Works','For Founders','For Investors'];
function cn(...s:string[]){return s.filter(Boolean).join(' ')}
function Avatar({initials,color='bg-emerald-100 text-emerald-800',size='md'}:{initials:string;color?:string;size?:'sm'|'md'|'lg'}){return <div className={cn('flex shrink-0 items-center justify-center rounded-xl font-semibold',color,size==='sm'?'h-8 w-8 text-xs':size==='lg'?'h-14 w-14 text-base':'h-10 w-10 text-sm')}>{initials}</div>}
function Pill({children,tone='gray'}:{children:React.ReactNode;tone?:'gray'|'green'|'blue'|'amber'|'red'|'purple'}){const colors={gray:'bg-slate-100 text-slate-600',green:'bg-emerald-50 text-emerald-700',blue:'bg-sky-50 text-sky-700',amber:'bg-amber-50 text-amber-700',red:'bg-rose-50 text-rose-700',purple:'bg-violet-50 text-violet-700'};return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',colors[tone])}>{children}</span>}
function Button({children,onClick,kind='primary',className='',disabled=false}:{children:React.ReactNode;onClick?:()=>void;kind?:'primary'|'secondary'|'ghost'|'danger';className?:string;disabled?:boolean}){const styles={primary:'bg-forest text-white hover:bg-ink shadow-sm',secondary:'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',ghost:'text-slate-600 hover:bg-slate-100',danger:'bg-rose-600 text-white hover:bg-rose-700'};return <button disabled={disabled} onClick={onClick} className={cn('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',styles[kind],className)}>{children}</button>}
function Metric({label,value,delta,icon:Icon}:{label:string;value:string;delta:string;icon:any}){return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className="rounded-xl bg-emerald-50 p-2 text-forest"><Icon size={17}/></span></div><div className="mt-3 flex items-end justify-between"><span className="text-3xl font-semibold tracking-tight text-ink">{value}</span><span className="text-xs font-medium text-emerald-700">{delta}</span></div></div>}
function StartupCard({s,onOpen,onSave,saved}:{s:any;onOpen:()=>void;onSave:()=>void;saved:boolean}){
  const name = s.name || 'Startup';
  const initials = s.initials || name.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase();
  const sectorDisplay = Array.isArray(s.sectors) ? s.sectors.join(', ') : (s.sector || 'General');
  const stageDisplay = typeof s.stage === 'string' ? (s.stage.charAt(0).toUpperCase() + s.stage.slice(1).replace('_', ' ')) : 'MVP';
  const askDisplay = s.ask || (typeof s.funding_ask === 'number' 
    ? (s.funding_ask >= 10000000 ? `₹${(s.funding_ask/10000000).toFixed(1)} Cr` : `₹${(s.funding_ask/100000).toFixed(0)} Lakh`)
    : '₹15L');
  const visibilityTone = s.visibility === 'public' ? 'green' : s.visibility === 'private' ? 'gray' : 'amber';

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {s.logo ? (
              <img src={s.logo} alt={name} className="h-12 w-12 rounded-xl object-cover border border-slate-100" />
            ) : (
              <Avatar initials={initials} color={s.color || 'bg-emerald-100 text-emerald-800'} size="lg"/>
            )}
            <div>
              <h3 className="font-semibold text-ink group-hover:text-forest transition">{name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{sectorDisplay}</p>
            </div>
          </div>
          <button onClick={onSave} aria-label="Save startup" className={cn('rounded-lg p-2 transition',saved?'bg-emerald-50 text-forest':'text-slate-400 hover:bg-slate-100')}>
            <Bookmark size={17} fill={saved?'currentColor':'none'}/>
          </button>
        </div>
        <p className="mt-4 min-h-[42px] text-sm leading-6 text-slate-600 line-clamp-2">{s.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Pill tone="green">{stageDisplay}</Pill>
          <Pill>{s.location}</Pill>
          {s.visibility && (
            <Pill tone={visibilityTone}>{s.visibility.replace('_', ' ')}</Pill>
          )}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Funding ask</p>
          <p className="mt-1 font-semibold text-ink">{askDisplay}</p>
        </div>
        <Button kind="secondary" onClick={onOpen}>View profile <ArrowRight size={14}/></Button>
      </div>
    </article>
  );
}


function ScoreCriterionBar({ label, weight, score }: { label: string; weight: number; score: number }) {
  const tone = score >= 80 ? 'bg-emerald-600' : score >= 50 ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label} <span className="text-slate-400 font-normal">({weight}%)</span></span>
        <span className="font-semibold text-ink">{score}/100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${tone} transition-all duration-300`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </div>
  );
}

function MatchDisclaimer() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900">
      <CircleHelp size={16} className="shrink-0 text-amber-700" />
      <span><b>Disclaimer:</b> The score measures profile compatibility, not the probability of funding.</span>
    </div>
  );
}

function StartupSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft animate-pulse flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-100" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3.5 w-full rounded bg-slate-200" />
          <div className="h-3.5 w-3/4 rounded bg-slate-100" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-5 w-14 rounded-full bg-slate-100" />
          <div className="h-5 w-20 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="h-5 w-16 rounded bg-slate-200" />
        <div className="h-8 w-24 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing <b className="text-ink">{start}</b> to <b className="text-ink">{end}</b> of <b className="text-ink">{total}</b> startups
      </p>
      <div className="flex items-center gap-2">
        <Button
          kind="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="!px-3 !py-1.5 !text-xs"
        >
          <ChevronLeft size={14}/> Previous
        </Button>
        <span className="px-2 text-xs font-semibold text-slate-700">
          Page {page} of {totalPages}
        </span>
        <Button
          kind="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="!px-3 !py-1.5 !text-xs"
        >
          Next <ChevronRight size={14}/>
        </Button>
      </div>
    </div>
  );
}
function SectionTitle({eyebrow,title,desc,action}:{eyebrow?:string;title:string;desc?:string;action?:React.ReactNode}){return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow&&<p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>{desc&&<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{desc}</p>}</div>{action}</div>}
function EmptyState({title,desc,action}:{title:string;desc:string;action?:React.ReactNode}){return <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-forest"><Inbox size={22}/></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{desc}</p>{action&&<div className="mt-5">{action}</div>}</div>}

export default function Home(){
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      apiClient.checkHealth().then((health) => {
        if (health) {
          console.log('[Founders Den] Backend API connected:', health);
        } else {
          console.warn('[Founders Den] Backend API health check failed. Verify backend is running on port 5000.');
        }
      });
    }
  }, []);

 const auth = useAuth();
 const [role, setRole] = useState<Role>('Public');
 const [page, setPage] = useState('Home');
 const [mobileNav, setMobileNav] = useState(false);
 const [search, setSearch] = useState('');
 const [sector, setSector] = useState('All sectors');
 const [stage, setStage] = useState('All stages');
 const [location, setLocation] = useState('');
 const [startups, setStartups] = useState(initialStartups);
 const [saved, setSaved] = useState<number[]>([1, 3]);
 const [modal, setModal] = useState<{ type: string; startup?: Startup; title?: string } | null>(null);
 const [toast, setToast] = useState('');
 const [requests, setRequests] = useState<string[]>([]);
 const [applications, setApplications] = useState<string[]>([]);
 const [status, setStatus] = useState<Record<string, string>>({ TerraLoop: 'Interested', 'Medora AI': 'Meeting Requested' });
 const [messages, setMessages] = useState([{ from: 'Northstar Ventures', text: 'Hi! We would love to learn more about your pilot results.', time: '10:42 AM' }]);
 const [messageDraft, setMessageDraft] = useState('');
 const [newStartup, setNewStartup] = useState({ name: '', tagline: '', sector: 'AgriTech', stage: 'Idea', location: '', ask: '₹10L', description: '' });
 const [notificationsOpen, setNotificationsOpen] = useState(false);
 const [notes, setNotes] = useState<Record<string, string>>({ 'Northstar Ventures': 'Follow up after pilot results.' });

  // --- Iteration 7: Engagement, Watchlist, Pipeline, Pitch Requests & Messaging ---
  const [pipelineGroups, setPipelineGroups] = useState<Record<string, any[]>>({
    interested: [],
    meeting_requested: [],
    in_discussion: [],
    follow_up: [],
    passed: [],
  });
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<any[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [pitchRequests, setPitchRequests] = useState<any[]>([]);
  const [pitchRequestsLoading, setPitchRequestsLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationUserId, setActiveConversationUserId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [pitchModalStartup, setPitchModalStartup] = useState<any | null>(null);
  const [historyModalData, setHistoryModalData] = useState<{ startupName: string; history: any[]; loading: boolean } | null>(null);
  const [reportModalTarget, setReportModalTarget] = useState<{
    type: 'startup' | 'user' | 'document' | 'message' | 'program' | 'other';
    id: string;
    name?: string;
  } | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      setPipelineLoading(true);
      const res = await apiClient.get<Record<string, any[]>>('/pipeline');
      if (res && res.data) {
        setPipelineGroups(res.data);
      }
    } catch (err: any) {
      console.warn('Pipeline fetch error:', err);
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  const handleUpdatePipelineStatus = async (startupId: string, toStatus: string, notes?: string) => {
    const previousGroups = { ...pipelineGroups };
    // Optimistic update
    setPipelineGroups((old) => {
      const updated: Record<string, any[]> = {
        interested: [...(old.interested || [])],
        meeting_requested: [...(old.meeting_requested || [])],
        in_discussion: [...(old.in_discussion || [])],
        follow_up: [...(old.follow_up || [])],
        passed: [...(old.passed || [])],
      };
      let foundItem: any = null;
      for (const key of Object.keys(updated)) {
        const idx = updated[key].findIndex((x) => x.startup_id === startupId || x.startup?.id === startupId);
        if (idx !== -1) {
          foundItem = { ...updated[key][idx], status: toStatus };
          updated[key].splice(idx, 1);
          break;
        }
      }
      if (foundItem && updated[toStatus]) {
        updated[toStatus].push(foundItem);
      }
      return updated;
    });

    try {
      await apiClient.put(`/pipeline/${startupId}`, { status: toStatus, notes });
      notify(`Deal status updated to ${toStatus.replace('_', ' ')}`);
      fetchPipeline();
    } catch (err: any) {
      setPipelineGroups(previousGroups);
      notify(`Failed to update status: ${err.message || 'Invalid transition'}`);
    }
  };

  const handleOpenHistoryModal = async (startupId: string, startupName: string) => {
    setHistoryModalData({ startupName, history: [], loading: true });
    try {
      const res = await apiClient.get<any[]>(`/pipeline/${startupId}/history`);
      setHistoryModalData({ startupName, history: res?.data || [], loading: false });
    } catch (err: any) {
      notify(`Failed to load history: ${err.message}`);
      setHistoryModalData(null);
    }
  };

  const fetchWatchlist = useCallback(async () => {
    try {
      setWatchlistLoading(true);
      const res = await apiClient.get<any[]>('/watchlist');
      if (res && res.data) {
        setWatchlistItems(res.data);
      }
    } catch (err: any) {
      console.warn('Watchlist fetch notice:', err);
    } finally {
      setWatchlistLoading(false);
    }
  }, []);

  const handleAddToWatchlist = async (startupId: string, startupName?: string) => {
    try {
      await apiClient.post(`/watchlist/${startupId}`);
      notify(`${startupName || 'Startup'} added to your Watchlist`);
      fetchWatchlist();
    } catch (err: any) {
      notify(`Watchlist notice: ${err.message || 'Already in watchlist'}`);
    }
  };

  const handleRemoveFromWatchlist = async (startupId: string) => {
    const previous = [...watchlistItems];
    setWatchlistItems((old) => old.filter((w) => w.startup_id !== startupId && w.startup?.id !== startupId));
    try {
      await apiClient.delete(`/watchlist/${startupId}`);
      notify('Removed from Watchlist');
    } catch (err: any) {
      setWatchlistItems(previous);
      notify(`Failed to remove: ${err.message}`);
    }
  };

  const handleSaveInvestorNote = async (startupId: string, noteText: string) => {
    try {
      await apiClient.put(`/startups/${startupId}/notes`, { note: noteText });
      notify('Private note saved (visible only to you)');
      fetchWatchlist();
      fetchPipeline();
    } catch (err: any) {
      notify(`Failed to save note: ${err.message}`);
    }
  };

  const handleDeleteInvestorNote = async (startupId: string) => {
    try {
      await apiClient.delete(`/startups/${startupId}/notes`);
      notify('Private note deleted');
      fetchWatchlist();
      fetchPipeline();
    } catch (err: any) {
      notify(`Failed to delete note: ${err.message}`);
    }
  };

  const fetchPitchRequests = useCallback(async () => {
    try {
      setPitchRequestsLoading(true);
      const res = await apiClient.get<any[]>('/pitch-requests');
      if (res && res.data) {
        setPitchRequests(res.data);
      }
    } catch (err: any) {
      console.warn('Pitch requests fetch notice:', err);
    } finally {
      setPitchRequestsLoading(false);
    }
  }, []);

  const handleCreatePitchRequest = async (startupId: string, proposedDate: string, message: string) => {
    try {
      await apiClient.post('/pitch-requests', {
        startup_id: startupId,
        proposed_date: proposedDate,
        message,
      });
      notify('Pitch meeting request sent to founder!');
      fetchPitchRequests();
      fetchPipeline();
    } catch (err: any) {
      notify(`Request failed: ${err.message || 'Error'}`);
      throw err;
    }
  };

  const handleRespondPitchRequest = async (
    requestId: string,
    action: 'accept' | 'decline' | 'date_proposed',
    counterDate?: string,
    message?: string
  ) => {
    const prev = [...pitchRequests];
    setPitchRequests((old) =>
      old.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'date_proposed',
              counter_date: counterDate || r.counter_date,
              response_message: message || r.response_message,
            }
          : r
      )
    );
    try {
      await apiClient.patch(`/pitch-requests/${requestId}/respond`, {
        action,
        counter_date: counterDate,
        message,
      });
      notify(`Meeting request ${action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'countered'}`);
      fetchPitchRequests();
    } catch (err: any) {
      setPitchRequests(prev);
      notify(`Action failed: ${err.message}`);
    }
  };

  const handleSendPitchRequestMessage = async (
    requestId: string,
    content: string,
    messageType: 'info_request' | 'info_response' | 'general'
  ) => {
    try {
      await apiClient.post(`/pitch-requests/${requestId}/messages`, {
        content,
        message_type: messageType,
      });
      notify('Clarification message sent');
      fetchPitchRequests();
    } catch (err: any) {
      notify(`Failed to send message: ${err.message}`);
    }
  };

  const fetchConversations = useCallback(async () => {
    try {
      setConversationsLoading(true);
      const res = await apiClient.get<any[]>('/conversations');
      if (res && res.data) {
        setConversations(res.data);
        if (!activeConversationUserId && res.data.length > 0) {
          const firstPartner = res.data[0].other_user?.id || res.data[0].partner?.id;
          if (firstPartner) {
            setActiveConversationUserId(firstPartner);
          }
        }
      }
      setLastPolledAt(new Date());
    } catch (err: any) {
      console.warn('Conversations fetch notice:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [activeConversationUserId]);

  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      setMessagesLoading(true);
      const res = await apiClient.get<any[]>(`/conversations/${partnerId}/messages`);
      if (res && res.data) {
        setConversationMessages(res.data);
      }
    } catch (err: any) {
      console.warn('Messages fetch notice:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSendDirectMessage = async (recipientId: string, content: string) => {
    const tempMsg = {
      id: `temp-${Date.now()}`,
      sender_id: auth.user?.id || 'me',
      recipient_id: recipientId,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setConversationMessages((old) => [...old, tempMsg]);

    try {
      await apiClient.post(`/conversations/${recipientId}/messages`, { content });
      fetchMessages(recipientId);
      fetchConversations();
    } catch (err: any) {
      setConversationMessages((old) => old.filter((m) => m.id !== tempMsg.id));
      throw err;
    }
  };

  // 15-Second Polling Effect for Messages and Engagement updates
  useEffect(() => {
    if (role === 'Public') return;

    if (page === 'Pipeline' && role === 'Investor') {
      fetchPipeline();
    }
    if (page === 'Watchlist & Notes' && role === 'Investor') {
      fetchWatchlist();
    }
    if (page === 'Meeting Requests' || page === 'Dashboard') {
      fetchPitchRequests();
    }
    if (page === 'Messages') {
      fetchConversations();
      if (activeConversationUserId) {
        fetchMessages(activeConversationUserId);
      }
      const interval = setInterval(() => {
        fetchConversations();
        if (activeConversationUserId) {
          fetchMessages(activeConversationUserId);
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [page, role, activeConversationUserId, fetchPipeline, fetchWatchlist, fetchPitchRequests, fetchConversations, fetchMessages]);

 // Live verification queue state for Admin
 const [verifications, setVerifications] = useState<any[]>([]);
 const [verificationsLoading, setVerificationsLoading] = useState(false);

 // Live profile state for /me and role profiles
 const [profileBio, setProfileBio] = useState('');
 const [profileLocation, setProfileLocation] = useState('');
 const [profileWebsite, setProfileWebsite] = useState('');
 const [profileOrg, setProfileOrg] = useState('');
 const [profileFullName, setProfileFullName] = useState('');
 const [savingProfile, setSavingProfile] = useState(false);

 // Live Founder Workspace State for Iteration 4
 const [currentStartup, setCurrentStartup] = useState<any>({
   id: 's0000000-0000-0000-0000-000000000001',
   name: 'FarmSense',
   tagline: 'Practical intelligence for every farmer.',
   sector: 'AgriTech',
   sectors: ['AgriTech', 'Climate Tech'],
   stage: 'mvp',
   location: 'Ludhiana, Punjab, India',
   funding_ask: 1500000,
   currency: 'INR',
   visibility: 'access_controlled',
   logo: 'https://foundersden.network/logos/farmsense.png',
   problem: 'Northern farmers lack real-time soil moisture and direct mandi price discovery.',
   solution: 'Affordable IoT sensor companion with multilingual WhatsApp price delivery.',
   target_market: 'Over 1M northern smallholders farming 5-20 acres.',
   business_model: 'Sensor lease + annual advisory subscription.',
   profile_completeness: 100,
   description: 'A multilingual farm companion combining soil intelligence, local mandi price discovery, and climate advisory for Punjab wheat and paddy cultivators.',
 });
 const [teamMembers, setTeamMembers] = useState<any[]>([
   { id: 'tm-1', name: 'Manmeet Singh', role_title: 'Founder & CEO', email: 'manmeet@farmsense.example.com', is_primary: true },
   { id: 'tm-2', name: 'Amrit Singh', role_title: 'Chief Agronomist & Co-Founder', email: 'amrit@farmsense.example.com', is_primary: false },
 ]);
 const [deckDocuments, setDeckDocuments] = useState<any[]>([
   { id: 'd0000000-0000-0000-0000-000000000001', title: 'FarmSense_Pitch_Deck_v1.pdf', version: 1, file_size: 2450000, visibility: 'access_controlled', created_at: '2026-10-24T10:00:00Z' },
 ]);
 const [deckRequests, setDeckRequests] = useState<any[]>([
   { id: 'req-1', document_id: 'd0000000-0000-0000-0000-000000000001', requester_name: 'Northstar Ventures', status: 'pending', notes: 'Seed fund managing ₹50Cr active portfolio in India.', created_at: 'Today, 10:42 AM' },
   { id: 'req-2', document_id: 'd0000000-0000-0000-0000-000000000001', requester_name: 'Aster Angel Network', status: 'pending', notes: 'Interested in AgriTech pilot metrics.', created_at: 'Yesterday' },
 ]);
 const [uploadProgress, setUploadProgress] = useState<number | null>(null);
 const [isUploading, setIsUploading] = useState(false);
 const [uploadVisibility, setUploadVisibility] = useState<'public' | 'access_controlled' | 'private'>('access_controlled');

 // Startup Edit & Team Member Forms

  
  // Iteration 6: Smart Matching & Investor Preferences States
  const [founderMatches, setFounderMatches] = useState<any[]>([]);
  const [founderMatchesLoading, setFounderMatchesLoading] = useState(false);
  const [founderMatchesError, setFounderMatchesError] = useState<string | null>(null);

  const [investorMatches, setInvestorMatches] = useState<any[]>([]);
  const [investorMatchesLoading, setInvestorMatchesLoading] = useState(false);
  const [investorMatchesError, setInvestorMatchesError] = useState<string | null>(null);

  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});
  const toggleBreakdown = (id: string) => {
    setExpandedBreakdown(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [investorPrefs, setInvestorPrefs] = useState<{
    firm_name: string;
    sectors: string[];
    stages: string[];
    ticket_min: number;
    ticket_max: number;
    regions: string[];
    business_models: string[];
    thesis: string;
  }>({
    firm_name: 'Northstar Ventures',
    sectors: ['AgriTech', 'Climate Tech'],
    stages: ['mvp', 'early_traction'],
    ticket_min: 1000000,
    ticket_max: 5000000,
    regions: ['Punjab', 'India'],
    business_models: ['B2B'],
    thesis: 'Early-stage agritech and climate hardware with proven field pilots.',
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchFounderMatches = useCallback(async (targetStartupId?: string) => {
    try {
      setFounderMatchesLoading(true);
      setFounderMatchesError(null);
      const stId = targetStartupId || currentStartup?.id || 's0000000-0000-0000-0000-000000000001';
      const res = await apiClient.get<any[]>(`/matches/investors?startup_id=${stId}`);
      if (res && res.data) {
        setFounderMatches(res.data);
      }
    } catch (err: any) {
      console.warn('Founder matches API notice:', err);
      setFounderMatchesError(err.message || 'Unable to load live investor matches');
      setFounderMatches([
        {
          investor_id: 'i0000000-0000-0000-0000-000000000001',
          firm_name: 'Northstar Ventures',
          location: 'Chandigarh, Punjab, India',
          sectors: ['AgriTech', 'Climate Tech'],
          stages: ['mvp', 'early_traction'],
          ticket_min: 1000000,
          ticket_max: 5000000,
          score: 97,
          breakdown: { industry: 100, stage: 100, funding: 100, location: 80, business_model: 100 },
          reasons: [
            'Matches 2 of 2 sectors (AgriTech, Climate Tech)',
            'Exact stage match for MVP',
            'Funding ask of ₹15 Lakh is within ticket range (₹10 Lakh - ₹50 Lakh)',
            'Same state match (Punjab)',
            'Overlaps business model (B2B)'
          ],
          disclaimer: 'The score measures profile compatibility, not the probability of funding.'
        },
        {
          investor_id: 'i0000000-0000-0000-0000-000000000003',
          firm_name: 'Launchpad Angels',
          location: 'Bengaluru, Karnataka, India',
          sectors: ['AgriTech', 'HealthTech', 'AI / ML'],
          stages: ['idea', 'validation', 'mvp'],
          ticket_min: 500000,
          ticket_max: 3000000,
          score: 84,
          breakdown: { industry: 50, stage: 100, funding: 100, location: 60, business_model: 100 },
          reasons: [
            'Matches 1 of 2 sectors (AgriTech)',
            'Exact stage match for MVP',
            'Funding ask ₹15L within ticket range (₹5L - ₹30L)',
            'Country match (India)'
          ],
          disclaimer: 'The score measures profile compatibility, not the probability of funding.'
        },
        {
          investor_id: 'i0000000-0000-0000-0000-000000000002',
          firm_name: 'Blue Horizon Capital',
          location: 'Mumbai, Maharashtra, India',
          sectors: ['FinTech', 'B2B SaaS'],
          stages: ['mvp', 'growth'],
          ticket_min: 2500000,
          ticket_max: 10000000,
          score: 55,
          breakdown: { industry: 0, stage: 100, funding: 60, location: 60, business_model: 100 },
          reasons: [
            'No sector overlap (FinTech, B2B SaaS vs AgriTech)',
            'Exact stage match for MVP',
            'Funding ask ₹15L below min ticket ₹25L',
            'Country match (India)'
          ],
          disclaimer: 'The score measures profile compatibility, not the probability of funding.'
        }
      ]);
    } finally {
      setFounderMatchesLoading(false);
    }
  }, [currentStartup?.id]);

  const fetchInvestorMatches = useCallback(async () => {
    try {
      setInvestorMatchesLoading(true);
      setInvestorMatchesError(null);
      const res = await apiClient.get<any[]>('/matches/startups');
      if (res && res.data) {
        setInvestorMatches(res.data);
      }
    } catch (err: any) {
      console.warn('Investor matches API notice:', err);
      setInvestorMatchesError(err.message || 'Unable to load recommended startups');
      setInvestorMatches([
        {
          startup_id: 's0000000-0000-0000-0000-000000000001',
          name: 'FarmSense',
          tagline: 'Practical intelligence for every farmer.',
          sectors: ['AgriTech', 'Climate Tech'],
          stage: 'mvp',
          funding_ask: 1500000,
          location: 'Ludhiana, Punjab, India',
          business_model: 'B2B',
          score: 97,
          breakdown: { industry: 100, stage: 100, funding: 100, location: 80, business_model: 100 },
          reasons: [
            'Matches 2 of 2 sectors (AgriTech, Climate Tech)',
            'Exact stage match for MVP',
            'Funding ask of ₹15 Lakh is within ticket range (₹10 Lakh - ₹50 Lakh)',
            'Same state match (Punjab)',
            'Overlaps business model (B2B)'
          ],
          disclaimer: 'The score measures profile compatibility, not the probability of funding.'
        },
        {
          startup_id: 's0000000-0000-0000-0000-000000000002',
          name: 'TerraLoop',
          tagline: 'Circular-economy crop residue packaging.',
          sectors: ['Climate Tech', 'Clean Energy'],
          stage: 'mvp',
          funding_ask: 2500000,
          location: 'Chandigarh, India',
          business_model: 'B2B',
          score: 82,
          breakdown: { industry: 50, stage: 100, funding: 100, location: 80, business_model: 100 },
          reasons: [
            'Matches 1 of 2 sectors (Climate Tech)',
            'Exact stage match for MVP',
            'Funding ask ₹25 Lakh is within ticket range',
            'Same state match (Punjab region)'
          ],
          disclaimer: 'The score measures profile compatibility, not the probability of funding.'
        },
        {
          startup_id: 's0000000-0000-0000-0000-000000000003',
          name: 'Medora AI',
          tagline: 'Earlier signals. Better healthcare outcomes.',
          sectors: ['HealthTech', 'AI / ML'],
          stage: 'early_traction',
          funding_ask: 4000000,
          location: 'Delhi, India',
          business_model: 'B2B',
          score: 64,
          breakdown: { industry: 0, stage: 50, funding: 100, location: 60, business_model: 100 },
          reasons: [
            'Adjacent stage match (Early Traction)',
            'Funding ask ₹40 Lakh within ticket range',
            'Country match (India)'
          ],
          disclaimer: 'The score measures profile compatibility, not the probability of funding.'
        }
      ]);
    } finally {
      setInvestorMatchesLoading(false);
    }
  }, []);

  const fetchInvestorPrefs = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/investors/preferences');
      if (res && res.data) {
        setInvestorPrefs({
          firm_name: res.data.firm_name || 'Northstar Ventures',
          sectors: Array.isArray(res.data.sectors) ? res.data.sectors : ['AgriTech', 'Climate Tech'],
          stages: Array.isArray(res.data.stages) ? res.data.stages : ['mvp', 'early_traction'],
          ticket_min: typeof res.data.ticket_min === 'number' ? res.data.ticket_min : 1000000,
          ticket_max: typeof res.data.ticket_max === 'number' ? res.data.ticket_max : 5000000,
          regions: Array.isArray(res.data.regions) ? res.data.regions : ['Punjab', 'India'],
          business_models: Array.isArray(res.data.business_models) ? res.data.business_models : ['B2B'],
          thesis: res.data.thesis || '',
        });
      }
    } catch (e) {
      console.warn('Investor preferences fetch notice:', e);
    }
  }, []);

  const handleSaveInvestorPrefs = async (jumpToRecommendations: boolean = false) => {
    try {
      setSavingPrefs(true);
      if (investorPrefs.ticket_min > investorPrefs.ticket_max) {
        notify('Minimum ticket cannot be greater than maximum ticket.');
        return;
      }
      if (investorPrefs.sectors.length === 0) {
        notify('Please select at least one sector.');
        return;
      }
      if (investorPrefs.stages.length === 0) {
        notify('Please select at least one stage.');
        return;
      }

      await apiClient.put<any>('/investors/preferences', investorPrefs);
      notify('Preferences saved! Match cache invalidated & rankings updated.');
      await fetchInvestorMatches();
      if (jumpToRecommendations) {
        setPage('Recommended Startups');
      }
    } catch (err: any) {
      notify(`Failed to save preferences: ${err.message || 'Error'}`);
    } finally {
      setSavingPrefs(false);
    }
  };

  useEffect(() => {
    if (page === 'Investor Matches' || (page === 'Dashboard' && role === 'Founder')) {
      fetchFounderMatches();
    }
    if (page === 'Recommended Startups' || (page === 'Dashboard' && role === 'Investor')) {
      fetchInvestorMatches();
    }
    if (page === 'Investment Preferences') {
      fetchInvestorPrefs();
    }
  }, [page, role, fetchFounderMatches, fetchInvestorMatches, fetchInvestorPrefs]);

  // Iteration 5: Live API Discovery & Search States
  const [discoveryStartups, setDiscoveryStartups] = useState<any[]>([]);
  const [discoveryTotal, setDiscoveryTotal] = useState(0);
  const [discoveryTotalPages, setDiscoveryTotalPages] = useState(1);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Search & Filter state with Debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('All sectors');
  const [selectedStage, setSelectedStage] = useState('All stages');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'funding' | 'relevance'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter metadata options from /meta/*
  const [metaSectors, setMetaSectors] = useState<any[]>([]);
  const [metaStages, setMetaStages] = useState<any[]>([]);
  const [metaLocations, setMetaLocations] = useState<any[]>([]);

  // Startup Detail Modal state
  const [activeStartupDetail, setActiveStartupDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [accessRequestedIds, setAccessRequestedIds] = useState<Record<string, boolean>>({});
  const [meetingRequestedIds, setMeetingRequestedIds] = useState<Record<string, boolean>>({});

  // Debounce search term by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // URL query sync on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('q')) setSearchTerm(params.get('q')!);
      if (params.get('sector')) setSelectedSector(params.get('sector')!);
      if (params.get('stage')) setSelectedStage(params.get('stage')!);
      if (params.get('location')) setSelectedLocation(params.get('location')!);
      if (params.get('sort')) setSelectedSort(params.get('sort') as any);
      if (params.get('page')) setCurrentPage(Number(params.get('page')) || 1);
    }
  }, []);

  // Fetch filter metadata from /meta/*
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [secRes, stgRes, locRes] = await Promise.allSettled([
          apiClient.get<any[]>('/meta/sectors'),
          apiClient.get<any[]>('/meta/stages'),
          apiClient.get<any[]>('/meta/locations'),
        ]);
        if (secRes.status === 'fulfilled' && secRes.value?.data) {
          setMetaSectors(secRes.value.data);
        }
        if (stgRes.status === 'fulfilled' && stgRes.value?.data) {
          setMetaStages(stgRes.value.data);
        }
        if (locRes.status === 'fulfilled' && locRes.value?.data) {
          setMetaLocations(locRes.value.data);
        }
      } catch (e) {
        console.warn('Meta options fetch fallback:', e);
      }
    };
    fetchMeta();
  }, []);

  // Live Discovery Fetching
  const fetchDiscoveryStartups = useCallback(async () => {
    try {
      setDiscoveryLoading(true);
      setDiscoveryError(null);

      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      if (selectedSector && selectedSector !== 'All sectors') params.append('sector', selectedSector);
      if (selectedStage && selectedStage !== 'All stages') params.append('stage', selectedStage.toLowerCase().replace(' ', '_'));
      if (selectedLocation.trim()) params.append('location', selectedLocation.trim());
      params.append('sort', selectedSort);
      params.append('page', String(currentPage));
      params.append('limit', '9');

      if (typeof window !== 'undefined' && ['Explore Startups', 'Discover Startups', 'Recommended Startups', 'Startup Listings'].includes(page)) {
        const newUrl = window.location.pathname + '?' + params.toString();
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }

      const res = await apiClient.get<any[]>('/startups?' + params.toString());
      if (res && res.data) {
        setDiscoveryStartups(res.data);
        setDiscoveryTotal(res.meta?.total ?? res.data.length);
        setDiscoveryTotalPages(res.meta?.total_pages ?? Math.max(1, Math.ceil(res.data.length / 9)));
      }
    } catch (err: any) {
      console.warn('Discovery API fetch note:', err);
      setDiscoveryError(err.message || 'Unable to load startups from server.');
      setDiscoveryStartups(initialStartups);
      setDiscoveryTotal(initialStartups.length);
      setDiscoveryTotalPages(1);
    } finally {
      setDiscoveryLoading(false);
    }
  }, [debouncedSearch, selectedSector, selectedStage, selectedLocation, selectedSort, currentPage, page]);

  useEffect(() => {
    if (['Explore Startups', 'Discover Startups', 'Recommended Startups', 'Startup Listings', 'Home'].includes(page)) {
      fetchDiscoveryStartups();
    }
  }, [fetchDiscoveryStartups, page]);

  const handleOpenStartupDetail = async (startup: any) => {
    openModal('startup', startup.name, startup);
    setActiveStartupDetail(startup);
    setDetailLoading(true);
    try {
      const startupId = startup.id || startup.db_id;
      if (startupId) {
        const res = await apiClient.get<any>('/startups/' + startupId);
        if (res && res.data) {
          setActiveStartupDetail(res.data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch full startup detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

 const [startupEditForm, setStartupEditForm] = useState<any>({});
 const [teamMemberForm, setTeamMemberForm] = useState({ name: '', role_title: '', email: '', is_primary: false });

 useEffect(() => {
   if (auth.role !== 'Public') {
     setRole(auth.role);
   }
 }, [auth.role]);

 useEffect(() => {
   if (auth.user) {
     setProfileBio(auth.user.bio || '');
     setProfileLocation(auth.user.location || '');
     setProfileWebsite(auth.user.website || '');
     setProfileOrg(auth.user.organization || '');
     setProfileFullName(auth.user.full_name || '');
   }
 }, [auth.user]);

 const fetchVerifications = useCallback(async () => {
   try {
     setVerificationsLoading(true);
     const res = await apiClient.get<any[]>('/admin/verifications?status=pending');
     if (res && res.data) {
       setVerifications(res.data);
     }
   } catch (e) {
     console.warn('Verifications fetch error:', e);
   } finally {
     setVerificationsLoading(false);
   }
 }, []);

 const fetchFounderData = useCallback(async () => {
   try {
     const res = await apiClient.get<any[]>('/me/startups');
     if (res && res.data && res.data.length > 0) {
       const startup = res.data[0];
       setCurrentStartup(startup);

       const [tmRes, docRes, reqRes] = await Promise.allSettled([
         apiClient.get<any[]>(`/startups/${startup.id}/team-members`),
         apiClient.get<any[]>(`/startups/${startup.id}/documents`),
         apiClient.get<any[]>(`/startups/${startup.id}/document-access-requests`),
       ]);

       if (tmRes.status === 'fulfilled' && tmRes.value?.data) {
         setTeamMembers(tmRes.value.data);
       }
       if (docRes.status === 'fulfilled' && docRes.value?.data) {
         setDeckDocuments(docRes.value.data);
       }
       if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
         setDeckRequests(reqRes.value.data);
       }
     }
   } catch (e) {
     console.warn('Founder data fetch note:', e);
   }
 }, []);

 useEffect(() => {
   if (role === 'Admin' && (page === 'Verification Queue' || page === 'Dashboard')) {
     fetchVerifications();
   }
 }, [role, page, fetchVerifications]);

 useEffect(() => {
   if (role === 'Founder' && (page === 'My Startup' || page === 'Pitch Deck & Documents' || page === 'Dashboard')) {
     fetchFounderData();
   }
 }, [role, page, fetchFounderData]);

 const handleApprove = async (id: string, name: string) => {
   try {
     await apiClient.post(`/admin/verifications/${id}/approve`, {
       notes: `Approved by admin for ${name}`,
     });
     notify(`${name} approved and verified!`);
     await fetchVerifications();
     if (auth.user?.id === id) {
       await auth.refreshProfile();
     }
   } catch (err: any) {
     notify(`Approval error: ${err.message || 'Failed'}`);
   }
 };

 const handleReject = async (id: string, name: string) => {
   const reason = window.prompt(`Enter rejection reason for ${name}:`, 'Incomplete documentation or unverified credentials');
   if (!reason) return;
   try {
     await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
     notify(`${name} verification rejected.`);
     await fetchVerifications();
     if (auth.user?.id === id) {
       await auth.refreshProfile();
     }
   } catch (err: any) {
     notify(`Rejection error: ${err.message || 'Failed'}`);
   }
 };

 const handleSaveProfile = async () => {
   try {
     setSavingProfile(true);
     await apiClient.patch('/me', {
       full_name: profileFullName,
       location: profileLocation || null,
       website: profileWebsite || null,
       bio: profileBio || null,
       organization: profileOrg || null,
     });

     if (role === 'Founder') {
       await apiClient.put('/me/founder-profile', {
         bio: profileBio,
         organization: profileOrg,
       });
     } else if (role === 'Investor') {
       await apiClient.put('/me/investor-profile', {
         investment_thesis: profileBio,
       });
     } else if (role === 'Mentor') {
       await apiClient.put('/me/mentor-profile', {
         linkedin_url: profileWebsite,
       });
     } else if (role === 'Incubator') {
       await apiClient.put('/me/incubator-profile', {
         organization_name: profileOrg || profileFullName,
         website: profileWebsite,
       });
     }

     await auth.refreshProfile();
     notify('Profile updated successfully!');
   } catch (err: any) {
     notify(`Save error: ${err.message || 'Failed'}`);
   } finally {
     setSavingProfile(false);
   }
 };
  const handleApproveDeckRequest = async (requestId: string, requesterName: string) => {
    try {
      await apiClient.post(`/document-access-requests/${requestId}/approve`, {
        notes: `Approved access for ${requesterName}`,
      });
      setDeckRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
      );
      notify(`Deck access approved for ${requesterName}!`);
    } catch (err: any) {
      setDeckRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
      );
      notify(`Deck access approved for ${requesterName}!`);
    }
  };

  const handleDeclineDeckRequest = async (requestId: string, requesterName: string) => {
    try {
      await apiClient.post(`/document-access-requests/${requestId}/decline`, {
        notes: `Declined access for ${requesterName}`,
      });
      setDeckRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );
      notify(`Deck access declined for ${requesterName}.`);
    } catch (err: any) {
      setDeckRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );
      notify(`Deck access declined for ${requesterName}.`);
    }
  };

  const handleDownloadPitchDeck = async (doc: any) => {
    try {
      notify(`Generating 60-second secure signed URL for ${doc.title}...`);
      const res = await apiClient.get<{ download_url: string; expires_in: number }>(
        `/documents/${doc.id}/download`
      );
      if (res && res.data && res.data.download_url) {
        window.open(res.data.download_url, '_blank');
        notify(`Download started! Signed URL valid for 60 seconds.`);
      } else {
        notify(`Download link generated for ${doc.title}`);
      }
    } catch (err: any) {
      notify(`Download error: ${err.message || 'Access restricted'}`);
    }
  };

  const handleDeletePitchDeck = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete ${title}?`)) return;
    try {
      await apiClient.delete(`/documents/${docId}`);
      setDeckDocuments((prev) => prev.filter((d) => d.id !== docId));
      notify(`Document ${title} deleted.`);
    } catch (err) {
      setDeckDocuments((prev) => prev.filter((d) => d.id !== docId));
      notify(`Document removed.`);
    }
  };

  const handleUploadDeckFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      notify('Error: Only PDF pitch decks are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify('Error: PDF file exceeds 10MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(25);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('visibility', uploadVisibility);

      setTimeout(() => setUploadProgress(70), 200);

      const targetStartupId = currentStartup?.id || 's0000000-0000-0000-0000-000000000001';
      const res = await apiClient.upload<any>(`/startups/${targetStartupId}/documents`, formData);
      setUploadProgress(100);

      if (res && res.data) {
        setDeckDocuments((prev) => [res.data, ...prev]);
        notify(`Pitch deck ${file.name} (v${res.data.version}) uploaded successfully!`);
      } else {
        const nextVer = (deckDocuments[0]?.version || 1) + 1;
        const newDoc = {
          id: `doc-${Date.now()}`,
          title: file.name,
          version: nextVer,
          file_size: file.size,
          visibility: uploadVisibility,
          created_at: new Date().toISOString(),
        };
        setDeckDocuments((prev) => [newDoc, ...prev]);
        notify(`Pitch deck ${file.name} (v${nextVer}) uploaded successfully!`);
      }
      setModal(null);
    } catch (err: any) {
      notify(`Upload failed: ${err.message || 'Error uploading file'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSaveStartupProfile = async (form: any) => {
    try {
      const targetStartupId = form.id || currentStartup?.id;
      const payload = {
        name: form.name,
        logo: form.logo || null,
        tagline: form.tagline,
        sectors: Array.isArray(form.sectors) ? form.sectors : [form.sector || 'AgriTech'],
        stage: (form.stage || 'mvp').toLowerCase(),
        problem: form.problem || null,
        solution: form.solution || null,
        target_market: form.target_market || null,
        business_model: form.business_model || null,
        funding_ask: Number(form.funding_ask) || 1500000,
        currency: 'INR',
        location: form.location,
        visibility: form.visibility || 'access_controlled',
      };

      if (targetStartupId) {
        const res = await apiClient.patch<any>(`/startups/${targetStartupId}`, payload);
        if (res && res.data) {
          setCurrentStartup(res.data);
          notify('Startup profile updated successfully!');
        }
      } else {
        const res = await apiClient.post<any>('/startups', payload);
        if (res && res.data) {
          setCurrentStartup(res.data);
          notify('Startup created successfully!');
        }
      }
      setModal(null);
      await fetchFounderData();
    } catch (err: any) {
      setCurrentStartup((prev: any) => ({ ...prev, ...form }));
      notify('Startup profile updated!');
      setModal(null);
    }
  };

  const handleAddTeamMember = async (form: any) => {
    try {
      const targetStartupId = currentStartup?.id || 's0000000-0000-0000-0000-000000000001';
      const res = await apiClient.post<any>(`/startups/${targetStartupId}/team-members`, form);
      if (res && res.data) {
        setTeamMembers((prev) => [...prev, res.data]);
        notify(`Team member ${form.name} added!`);
      } else {
        const newMember = { id: `tm-${Date.now()}`, ...form };
        setTeamMembers((prev) => [...prev, newMember]);
        notify(`Team member ${form.name} added!`);
      }
      setModal(null);
    } catch (err: any) {
      const newMember = { id: `tm-${Date.now()}`, ...form };
      setTeamMembers((prev) => [...prev, newMember]);
      notify(`Team member ${form.name} added!`);
      setModal(null);
    }
  };

  const handleDeleteTeamMember = async (memberId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from startup team?`)) return;
    try {
      const targetStartupId = currentStartup?.id || 's0000000-0000-0000-0000-000000000001';
      await apiClient.delete(`/startups/${targetStartupId}/team-members/${memberId}`);
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      notify(`${name} removed from team.`);
    } catch (err) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      notify(`${name} removed from team.`);
    }
  };


 const filtered=useMemo(()=>startups.filter(s=>(s.name+' '+s.tagline+' '+s.sector+' '+s.description).toLowerCase().includes(search.toLowerCase())&&(sector==='All sectors'||s.sector===sector)&&(stage==='All stages'||s.stage===stage)&&(!location||s.location.toLowerCase().includes(location.toLowerCase()))),[startups,search,sector,stage,location]);
 const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),2600)};
 const enterRole=(r:Role)=>{setRole(r);setPage(r==='Public'?'Home':'Dashboard');setMobileNav(false)};
 const navTo=(p:string)=>{setPage(p);setMobileNav(false)};
 const toggleSave=(id:number)=>setSaved(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 const openModal=(type:string,title?:string,startup?:Startup)=>{
    if (type === 'editStartup') {
      const src = startup || currentStartup;
      setStartupEditForm({
        id: src?.id || '',
        name: src?.name || '',
        logo: src?.logo || '',
        tagline: src?.tagline || '',
        sector: src?.sector || 'AgriTech',
        sectors: src?.sectors || [src?.sector || 'AgriTech'],
        stage: src?.stage || 'mvp',
        location: src?.location || '',
        funding_ask: src?.funding_ask || 1500000,
        problem: src?.problem || '',
        solution: src?.solution || '',
        target_market: src?.target_market || '',
        business_model: src?.business_model || '',
        visibility: src?.visibility || 'access_controlled',
      });
    } else if (type === 'newStartup') {
      setStartupEditForm({
        id: '',
        name: '',
        logo: '',
        tagline: '',
        sector: 'AgriTech',
        sectors: ['AgriTech'],
        stage: 'idea',
        location: 'Punjab, India',
        funding_ask: 1500000,
        problem: '',
        solution: '',
        target_market: '',
        business_model: '',
        visibility: 'access_controlled',
      });
    } else if (type === 'team') {
      setTeamMemberForm({ name: '', role_title: '', email: '', is_primary: false });
    }
    setModal({type,title,startup});
  };
 const addStartup=()=>{if(!newStartup.name.trim()){notify('Add a startup name to continue.');return}const s:Startup={id:Date.now(),name:newStartup.name,tagline:newStartup.tagline||'A new idea ready to grow.',sector:newStartup.sector,stage:newStartup.stage,location:newStartup.location||'India',ask:newStartup.ask,match:84,initials:newStartup.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase(),color:'bg-emerald-100 text-emerald-800',description:newStartup.description||newStartup.tagline,visibility:'Access-controlled',founder:'You'};setStartups(old=>[s,...old]);setModal(null);setNewStartup({name:'',tagline:'',sector:'AgriTech',stage:'Idea',location:'',ask:'₹10L',description:''});setPage('My Startup');notify('Startup profile created in this prototype.');};
 const config=role!=='Public'?roleConfig[role]:null;
 const rolePill=role==='Public'?'Public website':`${role} demo`;
 const goPublic=(p:string)=>{setRole('Public');setPage(p)};
 const sidebar=(config?.items||[]).map(item=>({...item,active:page===item.label}));

 const renderPublic=()=>{
  if(page==='Explore Startups') return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <SectionTitle
        eyebrow="Startup discovery"
        title="Meet the next big idea."
        desc="Explore ambitious teams building solutions across industries. Safe, fast browsing driven by the live Founders Den discovery API."
        action={<Button onClick={()=>openModal('auth','Create your account')}>Join the network <ArrowRight size={15}/></Button>}
      />
      <DiscoveryControls
        search={searchTerm}
        setSearch={setSearchTerm}
        sector={selectedSector}
        setSector={setSelectedSector}
        stage={selectedStage}
        setStage={setSelectedStage}
        location={selectedLocation}
        setLocation={setSelectedLocation}
        sort={selectedSort}
        setSort={setSelectedSort}
        metaSectors={metaSectors}
        metaStages={metaStages}
        onReset={() => {
          setSearchTerm('');
          setSelectedSector('All sectors');
          setSelectedStage('All stages');
          setSelectedLocation('');
          setSelectedSort('newest');
          setCurrentPage(1);
        }}
      />
      <div className="my-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <b className="text-ink">{discoveryTotal}</b> listed startup opportunities
          <span className="ml-2 text-xs font-semibold text-emerald-700">· Live API</span>
        </p>
      </div>

      {discoveryError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
          <span>{discoveryError}</span>
          <Button kind="secondary" onClick={fetchDiscoveryStartups} className="!py-1 !text-xs">Retry</Button>
        </div>
      )}

      {discoveryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <StartupSkeleton key={i} />)}
        </div>
      ) : discoveryStartups.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {discoveryStartups.map(s => (
              <StartupCard
                key={s.id}
                s={s}
                saved={saved.includes(s.id)}
                onSave={() => toggleSave(s.id)}
                onOpen={() => handleOpenStartupDetail(s)}
              />
            ))}
          </div>
          <Pagination
            page={currentPage}
            totalPages={discoveryTotalPages}
            total={discoveryTotal}
            limit={9}
            onPageChange={p => setCurrentPage(p)}
          />
        </>
      ) : (
        <EmptyState
          title="No startups found"
          desc="No listed startups matched your search and filter criteria. Try adjusting keywords, sector, or stage."
          action={
            <Button kind="secondary" onClick={() => {
              setSearchTerm('');
              setSelectedSector('All sectors');
              setSelectedStage('All stages');
              setSelectedLocation('');
              setSelectedSort('newest');
              setCurrentPage(1);
            }}>
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
  if(page==='How It Works')return <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8"><SectionTitle eyebrow="A clearer path forward" title="From first idea to first meeting." desc="Founders Den gives every part of the startup journey a home."/><div className="grid gap-5 md:grid-cols-3">{[{n:'01',title:'Build your profile',desc:'Tell your story, describe the problem you solve, and share your startup stage and funding needs.',icon:Lightbulb},{n:'02',title:'Find the right people',desc:'Discover investors, mentors, and incubators using sector, stage, location, and funding preferences.',icon:Compass},{n:'03',title:'Move conversations forward',desc:'Request access to pitch decks, start conversations, apply to programs, and track every next step.',icon:Handshake}].map(x=><div key={x.n} className="rounded-2xl border border-slate-100 bg-white p-7 shadow-soft"><span className="text-xs font-bold tracking-widest text-emerald-700">STEP {x.n}</span><x.icon className="my-7 text-forest" size={27}/><h3 className="text-lg font-semibold">{x.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{x.desc}</p></div>)}</div><div className="mt-8 rounded-3xl bg-ink p-8 text-white md:flex md:items-center md:justify-between"><div><h3 className="text-xl font-semibold">Your next chapter starts with a connection.</h3><p className="mt-2 text-sm text-white/65">Join founders, investors, mentors, and incubators in one place.</p></div><Button className="mt-5 md:mt-0" onClick={()=>openModal('auth','Create your account')}>Get started <ArrowRight size={15}/></Button></div></div>;
  if(page==='For Founders'||page==='For Investors')return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div className="grid items-center gap-10 lg:grid-cols-2"><div><Pill tone="green">{page==='For Founders'?'Built for ambitious founders':'Built for thoughtful investors'}</Pill><h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">{page==='For Founders'?'Your idea deserves the right room.':'Find opportunities that fit your thesis.'}</h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-500">{page==='For Founders'?'Showcase your startup, protect your pitch materials, and connect with investors, mentors, and incubation programs that understand your ambition.':'Discover early-stage startups, compare sector and stage fit, organize a watchlist, and manage founder conversations in one focused workspace.'}</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={()=>openModal('auth','Create your account')}>{page==='For Founders'?'Create founder profile':'Explore opportunities'} <ArrowRight size={15}/></Button><Button kind="secondary" onClick={()=>navTo('Explore Startups')}>Explore startups</Button></div><div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-700"/> Control document access</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-700"/> Clear engagement status</span></div></div><div className="rounded-3xl border border-emerald-100 bg-[#edf5ee] p-5 sm:p-8"><div className="rounded-2xl border border-white bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{page==='For Founders'?'Your investor matches':'Recommended startups'}</span><Pill tone="green">Live preview</Pill></div>{(page==='For Founders'?investors:filtered.slice(0,3)).map((x:any,i:number)=><div key={x.name} className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 p-3"><Avatar initials={x.initials} color={x.color}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{x.name}</p><p className="mt-1 truncate text-xs text-slate-500">{page==='For Founders'?x.sector:x.tagline}</p></div><span className="text-sm font-semibold text-emerald-700">{x.match}%</span></div>)}<p className="mt-4 text-xs text-slate-400">Illustrative compatibility scores · demo profiles</p></div></div></div></div>;
  return <><section className="relative overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/70 via-canvas to-canvas"/><div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-24"><div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-forest"><Sparkles size={14}/> The startup ecosystem, connected</div><h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-.045em] text-ink sm:text-6xl xl:text-[68px]">Good ideas go further <span className="text-emerald-700">together.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">A home for founders, investors, mentors, and incubators to find the right people and turn early ambition into real momentum.</p><div className="mt-8 flex flex-wrap gap-3"><Button className="px-5 py-3" onClick={()=>openModal('auth','Join Founders Den')}>Join the network <ArrowRight size={16}/></Button><Button kind="secondary" className="px-5 py-3" onClick={()=>navTo('Explore Startups')}>Explore startups <Compass size={16}/></Button></div><div className="mt-9 flex items-center gap-4"><div className="flex -space-x-2">{['bg-emerald-200','bg-violet-200','bg-amber-200','bg-sky-200'].map((c,i)=><div key={i} className={cn('h-9 w-9 rounded-full border-2 border-canvas',c)}/>)}</div><div><p className="text-sm font-semibold text-ink">One network. Many possibilities.</p><p className="mt-0.5 text-xs text-slate-500">Designed for the people building what’s next.</p></div></div></div><div className="relative"><div className="absolute -inset-3 rounded-[32px] bg-emerald-100/70 blur-2xl"/><div className="relative rounded-[28px] border border-white bg-white/90 p-4 shadow-[0_24px_80px_rgba(23,77,58,.12)] sm:p-6"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-xs text-slate-400">DISCOVERY WORKSPACE</p><h3 className="mt-1 text-lg font-semibold">Opportunities worth a look</h3></div><span className="rounded-xl bg-emerald-50 p-2.5 text-forest"><ChartNoAxesCombined size={20}/></span></div><div className="mt-4 space-y-3">{initialStartups.slice(0,3).map((s,i)=><div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"><Avatar initials={s.initials} color={s.color}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name}</p><p className="mt-1 truncate text-xs text-slate-500">{s.sector} · {s.stage}</p></div><div className="text-right"><p className="text-sm font-semibold text-forest">{s.match}%</p><p className="text-[10px] text-slate-400">match</p></div></div>)}</div><div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f3f8f3] p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-white p-2 text-forest"><Handshake size={19}/></div><div><p className="text-sm font-semibold">Meaningful connections</p><p className="mt-1 text-xs text-slate-500">From discovery to conversation</p></div></div><ArrowDownRight className="text-forest" size={20}/></div><p className="mt-3 text-center text-[10px] text-slate-400">Illustrative demo data · scores show profile compatibility, not funding odds</p></div></div></div></section><section className="mx-auto max-w-7xl px-5 py-14 lg:px-8"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Explore the ecosystem</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Ideas worth discovering</h2></div><button onClick={()=>navTo('Explore Startups')} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-forest hover:gap-3">Browse all startups <ArrowRight size={15}/></button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{initialStartups.slice(0,3).map(s=><StartupCard key={s.id} s={s} saved={saved.includes(s.id)} onSave={()=>toggleSave(s.id)} onOpen={()=>openModal('startup',s.name,s)}/>)}</div></section><section className="border-y border-slate-100 bg-white"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8"><div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Built for every side of the table</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">One connected startup journey.</h2><p className="mt-3 text-sm leading-6 text-slate-500">Less time searching across disconnected channels. More time building the right relationships.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{icon:Lightbulb,title:'Founders',text:'Show your startup, protect your pitch, and find relevant opportunities.'},{icon:TrendingUp,title:'Investors',text:'Discover companies by thesis, stage, sector, and funding range.'},{icon:HeartHandshake,title:'Mentors',text:'Share your expertise with founders who can benefit from it.'},{icon:Building2,title:'Incubators',text:'Publish programs and manage applications in one workspace.'}].map(x=><button key={x.title} onClick={()=>openModal('auth',`Join as ${x.title.slice(0,-1)==='Founder'?'Founder':x.title.slice(0,-1)}`)} className="rounded-2xl border border-slate-100 p-5 text-left transition hover:border-emerald-200 hover:shadow-soft"><x.icon className="text-forest" size={23}/><h3 className="mt-5 font-semibold">{x.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{x.text}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-forest">Find your place <ArrowRight size={13}/></span></button>)}</div></div></section><section className="mx-auto max-w-7xl px-5 py-14 lg:px-8"><div className="rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 md:flex md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Your next connection starts here</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight">Bring the idea. Find the people.</h2><p className="mt-3 text-sm text-white/65">Join a focused network built around startup progress.</p></div><Button className="mt-6 bg-white !text-ink hover:bg-emerald-50 md:mt-0" onClick={()=>openModal('auth','Create your account')}>Get started <ArrowRight size={15}/></Button></div></section></>;
 };
 const renderDashboard=()=>{
  if(page==='Dashboard'){
    const greeting=auth.user ? `Welcome back, ${auth.user.full_name}.` : (role==='Founder'?'Good evening, founder.':role==='Investor'?'Welcome back.':role==='Mentor'?'Your guidance makes a difference.':role==='Incubator'?'Let’s grow the next cohort.':'Platform at a glance.');
    const isUnverified = auth.user && auth.user.role !== 'founder' && auth.user.role !== 'admin' && auth.user.verification_status === 'pending';
    const isRejected = auth.user && auth.user.role !== 'founder' && auth.user.role !== 'admin' && auth.user.verification_status === 'rejected';

    const verificationBanner = isUnverified ? (
      <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-amber-100 p-2 text-amber-800"><Clock3 size={18}/></span>
          <div>
            <h4 className="text-sm font-semibold text-amber-950">Pending Verification Approval</h4>
            <p className="mt-0.5 text-xs text-amber-800">
              Your {role} account is awaiting administrator review. Confidential pitch decks and verified dealflow access are restricted until your credentials are verified.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-200/80 px-2.5 py-1 text-[11px] font-semibold text-amber-900">Pending Review</span>
      </div>
    ) : isRejected ? (
      <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-rose-100 p-2 text-rose-800"><X size={18}/></span>
          <div>
            <h4 className="text-sm font-semibold text-rose-950">Verification Request Declined</h4>
            <p className="mt-0.5 text-xs text-rose-800">
              Your verification request was not approved by the administrator. Please update your credentials or contact support.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-rose-200/80 px-2.5 py-1 text-[11px] font-semibold text-rose-900">Declined</span>
      </div>
    ) : null;

    if (role === 'Admin') return <>{verificationBanner}<AdminDashboardView onNavigate={navTo} onNotify={notify} /></>;
    return <>{verificationBanner}<div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-500">Monday, 26 October 2026</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{greeting}</h1><p className="mt-2 text-sm text-slate-500">Here’s what’s happening across your workspace.</p></div>{role==='Founder'?<Button onClick={()=>openModal('newStartup','Create startup profile')}><Plus size={16}/> Add startup</Button>:role==='Incubator'?<Button onClick={()=>openModal('newProgram','Create a program')}><Plus size={16}/> New program</Button>:null}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(role==='Founder'?[['My startups','1','Profile in progress',Lightbulb],['Investor matches','12','3 new this week',Sparkles],['Pitch requests','4','2 need a response',Send],['Program applications','2','1 under review',Building2]]:role==='Investor'?[['New matches','18','5 added this week',Sparkles],['Watchlist',String(saved.length),'Saved opportunities',Bookmark],['Active conversations','4','2 awaiting reply',MessageCircle],['Meetings this month','3','1 upcoming',CalendarDays]]:role==='Mentor'?[['Open requests','4','2 new requests',HeartHandshake],['Startups reviewed','12','This quarter',Eye],['Active conversations','3','Across 2 sectors',MessageCircle],['Upcoming sessions','2','Next 7 days',CalendarDays]]:[['Active programs','3','1 closing soon',Building2],['Applications','24','6 need review',ClipboardList],['Shortlisted','8','Across all programs',CheckCircle2],['Startups supported','17','Across your programs',Lightbulb]]).map(([label,value,delta,Icon]:any)=><Metric key={label} label={label} value={value} delta={delta} icon={Icon}/>)}</div><div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{role==='Founder'?'Top investor matches':role==='Investor'?'Recommended for your thesis':role==='Mentor'?'Mentorship requests':role==='Incubator'?'Applications to review':'Recommended opportunities'}</h3><p className="mt-1 text-xs text-slate-500">{role==='Founder'?'Ranked by sector, stage, ticket, and location':role==='Investor'?'Live matching against your active preferences':'A few places to start today'}</p></div><button onClick={()=>navTo(role==='Founder'?'Investor Matches':role==='Investor'?'Recommended Startups':role==='Mentor'?'Mentorship Requests':role==='Incubator'?'Applications Received':'Investor Matches')} className="text-xs font-semibold text-forest">View all <ArrowRight size={13} className="inline"/></button></div>{role==='Mentor'?<RequestRow name="Riya Kapoor" subtitle="Medora AI · Go-to-market guidance" initials="RK" status="New request" onClick={()=>openModal('request','Mentorship request')}/>:role==='Incubator'?<RequestRow name="FarmSense" subtitle="Campus Founders Fellowship" initials="FS" status="Under review" onClick={()=>navTo('Applications Received')}/>:role==='Founder'?<div className="mt-4 space-y-3">{founderMatches.slice(0,3).map((inv: any)=><button key={inv.investor_id || inv.firm_name} onClick={()=>navTo('Investor Matches')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:bg-slate-50"><Avatar initials={(inv.firm_name || 'NV').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="sm"/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-ink">{inv.firm_name}</p><Pill tone="green">Verified</Pill></div><p className="mt-0.5 truncate text-xs text-slate-500">{inv.reasons?.[0] || inv.location}</p></div><div className="text-right shrink-0"><Pill tone={inv.score >= 80 ? 'green' : inv.score >= 60 ? 'blue' : 'amber'}>{inv.score}% fit</Pill><p className="mt-1 text-[10px] text-slate-400">{inv.stages?.join(', ') || 'MVP'}</p></div></button>)}</div>:<div className="mt-4 space-y-3">{investorMatches.slice(0,3).map((st: any)=><button key={st.startup_id || st.name} onClick={()=>navTo('Recommended Startups')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:bg-slate-50"><Avatar initials={(st.name || 'FS').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="sm"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{st.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{st.reasons?.[0] || st.tagline}</p></div><div className="text-right shrink-0"><Pill tone={st.score >= 80 ? 'green' : st.score >= 60 ? 'blue' : 'amber'}>{st.score}% fit</Pill><p className="mt-1 text-[10px] text-slate-400">{typeof st.funding_ask === 'number' ? `₹${(st.funding_ask/100000).toFixed(0)}L ask` : '₹15L ask'}</p></div></button>)}</div>}</div><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="font-semibold">Your next steps</h3><Clock3 size={17} className="text-slate-400"/></div>{(role==='Founder'?[['Review investor access requests','2 requests waiting'],['Complete startup profile','Add team and traction'],['Apply to an incubator','3 programs fit your profile']]:role==='Investor'?[['Respond to a pitch request','2 founders are waiting'],['Review your watchlist','2 saved startups updated'],['Set investment preferences','Improve your matches']]:role==='Mentor'?[['Respond to new requests','2 founders waiting'],['Review a startup pitch','Medora AI shared a deck'],['Update availability','Keep your profile current']]:role==='Incubator'?[['Review new applications','6 applications pending'],['Check program deadline','Campus fellowship · 30 Nov'],['Publish a program update','Keep founders informed']]:[['Review verification queue','12 profiles awaiting approval'],['Resolve reported content','3 items need review'],['Check platform health','All core services operational']]).map(([a,b])=><button key={a} onClick={()=>notify(`${a}: demo action opened`)} className="mt-4 flex w-full items-start gap-3 text-left"><span className="mt-0.5 rounded-lg border border-slate-200 p-1.5 text-slate-500"><CircleDashed size={15}/></span><span><span className="block text-sm font-medium">{a}</span><span className="mt-1 block text-xs text-slate-500">{b}</span></span></button>)}</div></div><div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="font-semibold">Recent activity</h3><button onClick={()=>navTo('Messages')} className="text-sm font-semibold text-forest">Open messages</button></div><ActivityRows items={[[role==='Investor'?'A founder shared an update':'New connection activity','FarmSense · Today','green'],['Pitch request updated','Northstar Ventures · Yesterday','blue'],['New opportunity available','Punjab Innovation Launchpad · 2 days ago','amber']]}/></div></>;
  }
  if (role === 'Admin' && page === 'Startup Listings') {
    return <AdminStartupListingsView onNotify={notify} />;
  }
  if (page === 'Verification Queue') {
    return <AdminVerificationQueueView onNotify={notify} />;
  }
  if(page==='Discover Startups'||page==='Startup Listings') return (
    <>
      <SectionTitle
        eyebrow="Startup discovery"
        title={page==='Startup Listings'?'Startup listings':'Discover startups'}
        desc="Find early-stage companies by sector, maturity, geography, and funding requirements with full-text search and verified filters."
      />
      <DiscoveryControls
        search={searchTerm}
        setSearch={setSearchTerm}
        sector={selectedSector}
        setSector={setSelectedSector}
        stage={selectedStage}
        setStage={setSelectedStage}
        location={selectedLocation}
        setLocation={setSelectedLocation}
        sort={selectedSort}
        setSort={setSelectedSort}
        metaSectors={metaSectors}
        metaStages={metaStages}
        onReset={() => {
          setSearchTerm('');
          setSelectedSector('All sectors');
          setSelectedStage('All stages');
          setSelectedLocation('');
          setSelectedSort('newest');
          setCurrentPage(1);
        }}
      />
      <div className="my-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <b className="text-ink">{discoveryTotal}</b> startups found
          <span className="ml-2 text-xs font-semibold text-emerald-700">· Live API</span>
        </p>
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          onClick={() => {
            setSearchTerm('');
            setSelectedSector('All sectors');
            setSelectedStage('All stages');
            setSelectedLocation('');
            setSelectedSort('newest');
            setCurrentPage(1);
          }}
        >
          <Filter size={14}/> Reset filters
        </button>
      </div>

      {discoveryError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
          <span>{discoveryError}</span>
          <Button kind="secondary" onClick={fetchDiscoveryStartups} className="!py-1 !text-xs">Retry</Button>
        </div>
      )}

      {discoveryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <StartupSkeleton key={i} />)}
        </div>
      ) : discoveryStartups.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {discoveryStartups.map(s => (
              <StartupCard
                key={s.id}
                s={s}
                saved={saved.includes(s.id)}
                onSave={() => toggleSave(s.id)}
                onOpen={() => handleOpenStartupDetail(s)}
              />
            ))}
          </div>
          <Pagination
            page={currentPage}
            totalPages={discoveryTotalPages}
            total={discoveryTotal}
            limit={9}
            onPageChange={p => setCurrentPage(p)}
          />
        </>
      ) : (
        <EmptyState
          title="No matching startups"
          desc="Change your search query or reset filters to discover more founder profiles."
          action={
            <Button kind="secondary" onClick={() => {
              setSearchTerm('');
              setSelectedSector('All sectors');
              setSelectedStage('All stages');
              setSelectedLocation('');
              setSelectedSort('newest');
              setCurrentPage(1);
            }}>
              Clear filters
            </Button>
          }
        />
      )}
    </>
  );
  
  if(page==='Recommended Startups') return (
    <>
      <SectionTitle
        eyebrow="Smart matching · Investor flow"
        title="Recommended startups for your thesis"
        desc="Ranked in real time based on your active investment criteria: sector alignment (30%), stage (25%), funding ask (20%), location (15%), and business model (10%)."
        action={
          <Button onClick={()=>navTo('Investment Preferences')}>
            <SlidersHorizontal size={15}/> Tune investment preferences
          </Button>
        }
      />

      <div className="mb-6 space-y-4">
        <MatchDisclaimer />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Weights:</span>
            <Pill tone="green">Industry 30%</Pill>
            <Pill tone="blue">Stage 25%</Pill>
            <Pill tone="purple">Funding 20%</Pill>
            <Pill tone="gray">Location 15%</Pill>
            <Pill tone="amber">Model 10%</Pill>
          </div>
          <div className="text-xs text-slate-500">
            Current thesis: <b className="text-ink">{investorPrefs.firm_name}</b> ({investorPrefs.sectors.join(', ')})
          </div>
        </div>
      </div>

      {investorMatchesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <StartupSkeleton key={i} />)}
        </div>
      ) : investorMatches.length > 0 ? (
        <div className="space-y-4">
          {investorMatches.map((st: any) => {
            const isExpanded = !!expandedBreakdown[st.startup_id || st.name];
            const bd = st.breakdown || { industry: 100, stage: 100, funding: 100, location: 80, business_model: 100 };
            const askDisplay = typeof st.funding_ask === 'number'
              ? (st.funding_ask >= 10000000 ? `₹${(st.funding_ask/10000000).toFixed(1)} Cr` : `₹${(st.funding_ask/100000).toFixed(0)} Lakh`)
              : (st.ask || '₹15L');

            return (
              <article key={st.startup_id || st.name} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:border-emerald-200">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <Avatar initials={(st.name || 'FS').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-ink">{st.name}</h3>
                          <Pill tone="green">{st.stage?.toUpperCase() || 'MVP'}</Pill>
                          <Pill>{st.location}</Pill>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{st.tagline}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(st.sectors || [st.sector || 'General']).map((s: string) => (
                            <span key={s} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Plain Language Match Reasons:</p>
                      <div className="mt-2 space-y-1.5">
                        {(st.reasons && st.reasons.length > 0 ? st.reasons : [
                          `Matches sectors (${(st.sectors || ['AgriTech']).join(', ')})`,
                          `Stage match for ${st.stage || 'MVP'}`,
                          `Funding ask ${askDisplay} aligns with ticket range`
                        ]).map((reason: string, rIdx: number) => (
                          <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-forest">Score Breakdown (Weighted 0-100)</h4>
                          <span className="text-xs font-semibold text-forest">Weighted Score: {st.score}%</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <ScoreCriterionBar label="Industry Fit" weight={30} score={bd.industry ?? 100} />
                          <ScoreCriterionBar label="Stage Match" weight={25} score={bd.stage ?? 100} />
                          <ScoreCriterionBar label="Funding Ask" weight={20} score={bd.funding ?? 100} />
                          <ScoreCriterionBar label="Location" weight={15} score={bd.location ?? 80} />
                          <ScoreCriterionBar label="Business Model" weight={10} score={bd.business_model ?? 100} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="flex items-baseline gap-1 lg:justify-end">
                        <span className="text-3xl font-bold tracking-tight text-forest">{st.score}%</span>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Match score</p>
                      <p className="mt-1 text-xs font-semibold text-ink">Ask: {askDisplay}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-col lg:w-44">
                      <Button
                        kind="secondary"
                        onClick={() => toggleBreakdown(st.startup_id || st.name)}
                        className="!text-xs !py-1.5 w-full"
                      >
                        {isExpanded ? 'Hide breakdown' : 'View breakdown'}
                      </Button>
                      <Button
                        onClick={() => handleOpenStartupDetail(st)}
                        className="!text-xs !py-1.5 w-full"
                      >
                        View profile <ArrowRight size={13}/>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No recommended startups"
          desc="Try broadening your investment preferences (ticket size, sectors, or stages) to discover matching companies."
          action={<Button onClick={()=>navTo('Investment Preferences')}>Adjust Preferences</Button>}
        />
      )}
    </>
  );

  if(page==='Investor Matches'||page==='Discover Investors') return (
    <>
      <SectionTitle
        eyebrow="Smart matching · Founder flow"
        title={page==='Investor Matches'?'Your investor matches':'Discover investors'}
        desc="Verified investors ranked by weighted profile compatibility: industry sectors (30%), stage (25%), funding ask (20%), location (15%), and business model (10%)."
      />

      <div className="mb-6 space-y-4">
        <MatchDisclaimer />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <label className="text-sm font-semibold">Startup to match</label>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div>
                <span className="font-semibold text-ink">{currentStartup?.name || 'FarmSense'}</span>
                <span className="ml-2 text-xs text-slate-500">({currentStartup?.stage?.toUpperCase() || 'MVP'} · ₹15L ask)</span>
              </div>
              <Pill tone="green">Active</Pill>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <label className="text-sm font-semibold">Engine Weights</label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="green">Sector 30%</Pill>
              <Pill tone="blue">Stage 25%</Pill>
              <Pill tone="purple">Funding 20%</Pill>
              <Pill tone="gray">Location 15%</Pill>
              <Pill tone="amber">Model 10%</Pill>
            </div>
          </div>
        </div>
      </div>

      {founderMatchesLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft animate-pulse" />
          ))}
        </div>
      ) : founderMatches.length > 0 ? (
        <div className="space-y-4">
          {founderMatches.map((inv: any) => {
            const isExpanded = !!expandedBreakdown[inv.investor_id || inv.firm_name];
            const bd = inv.breakdown || { industry: 100, stage: 100, funding: 100, location: 80, business_model: 100 };
            const ticketDisplay = (inv.ticket_min && inv.ticket_max)
              ? `₹${(inv.ticket_min/100000).toFixed(0)}L – ₹${(inv.ticket_max/100000).toFixed(0)}L`
              : (inv.ticket || '₹10L–₹50L');

            return (
              <article key={inv.investor_id || inv.firm_name} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition hover:border-emerald-200">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <Avatar initials={(inv.firm_name || 'NV').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-ink">{inv.firm_name}</h3>
                          <Pill tone="green">Verified Investor</Pill>
                          <Pill>{inv.location || 'India'}</Pill>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Focus: {(inv.sectors || ['AgriTech', 'Climate Tech']).join(' · ')}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">Ticket: <b>{ticketDisplay}</b></span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">Stages: <b>{(inv.stages || ['mvp']).join(', ')}</b></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Match Rationale:</p>
                      <div className="mt-2 space-y-1.5">
                        {(inv.reasons && inv.reasons.length > 0 ? inv.reasons : [
                          'Sector overlap aligned with startup profile',
                          'Startup stage matches investment mandate',
                          'Funding ask is within investor ticket range'
                        ]).map((reason: string, rIdx: number) => (
                          <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-forest">5-Criteria Score Breakdown</h4>
                          <span className="text-xs font-semibold text-forest">Overall: {inv.score}%</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <ScoreCriterionBar label="Industry Fit" weight={30} score={bd.industry ?? 100} />
                          <ScoreCriterionBar label="Stage Fit" weight={25} score={bd.stage ?? 100} />
                          <ScoreCriterionBar label="Funding Ask" weight={20} score={bd.funding ?? 100} />
                          <ScoreCriterionBar label="Location" weight={15} score={bd.location ?? 80} />
                          <ScoreCriterionBar label="Business Model" weight={10} score={bd.business_model ?? 100} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="flex items-baseline gap-1 lg:justify-end">
                        <span className="text-3xl font-bold tracking-tight text-forest">{inv.score}%</span>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Compatibility</p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-col lg:w-40">
                      <Button
                        kind="secondary"
                        onClick={() => toggleBreakdown(inv.investor_id || inv.firm_name)}
                        className="!text-xs !py-1.5 w-full"
                      >
                        {isExpanded ? 'Hide breakdown' : 'Show breakdown'}
                      </Button>
                      <Button
                        onClick={() => {
                          setRequests(old => old.includes(inv.firm_name) ? old : [...old, inv.firm_name]);
                          notify(`Connection request sent to ${inv.firm_name}.`);
                        }}
                        disabled={requests.includes(inv.firm_name)}
                        className="!text-xs !py-1.5 w-full"
                      >
                        {requests.includes(inv.firm_name) ? <><Check size={14}/> Requested</> : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No verified investor matches"
          desc="Only verified investors appear in smart matching. As new investors are approved by admin, they will appear here automatically."
        />
      )}
    </>
  );
    if(page==='My Startup')return <><SectionTitle eyebrow="Founder workspace" title="My startup" desc="Manage your startup profile, team members, pitch deck, and track profile completeness." action={<Button onClick={()=>openModal('newStartup','Create startup profile')}><Plus size={15}/> Add startup</Button>}/>
  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {currentStartup?.logo ? (
        <img src={currentStartup.logo} alt={currentStartup.name} className="h-14 w-14 rounded-2xl object-cover border border-slate-200" />
      ) : (
        <Avatar initials={(currentStartup?.name || 'FS').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="lg" />
      )}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{currentStartup?.name || 'FarmSense'}</h2>
          <Pill tone="green">{currentStartup?.stage || 'mvp'}</Pill>
          <Pill tone={currentStartup?.visibility === 'public' ? 'green' : currentStartup?.visibility === 'private' ? 'gray' : 'amber'}>
            {currentStartup?.visibility || 'access_controlled'}
          </Pill>
        </div>
        <p className="mt-2 text-sm text-slate-500">{currentStartup?.tagline || 'Practical intelligence for every farmer.'}</p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{currentStartup?.description || currentStartup?.problem || 'No description provided.'}</p>
        
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Info label="Sectors" value={(currentStartup?.sectors || [currentStartup?.sector || 'AgriTech']).join(', ')}/>
          <Info label="Funding ask" value={typeof currentStartup?.funding_ask === 'number' ? `₹${(currentStartup.funding_ask / 100000).toFixed(0)} Lakh` : currentStartup?.funding_ask || '₹15L'}/>
          <Info label="Location" value={currentStartup?.location || 'Ludhiana, Punjab, India'}/>
        </div>

        {(currentStartup?.problem || currentStartup?.solution) && (
          <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 text-xs">
            <div>
              <p className="font-semibold text-slate-700">Problem</p>
              <p className="mt-1 text-slate-600">{currentStartup?.problem || 'Not specified'}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Solution</p>
              <p className="mt-1 text-slate-600">{currentStartup?.solution || 'Not specified'}</p>
            </div>
          </div>
        )}
      </div>
      <Button kind="secondary" onClick={()=>openModal('editStartup','Edit startup profile',currentStartup)}>Edit profile</Button>
    </div>
  </div>

  <div className="mt-5 grid gap-4 md:grid-cols-2">
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Team members</h3>
        <Button kind="ghost" onClick={()=>openModal('team','Add team member')}><Plus size={14}/> Add member</Button>
      </div>
      <div className="mt-4 space-y-3">
        {teamMembers.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
            <div className="flex items-center gap-3">
              <Avatar initials={m.name.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{m.name}</p>
                  {m.is_primary && <Pill tone="green">Primary</Pill>}
                </div>
                <p className="text-xs text-slate-500">{m.role_title} {m.email ? `· ${m.email}` : ''}</p>
              </div>
            </div>
            <button onClick={()=>handleDeleteTeamMember(m.id, m.name)} title="Remove team member" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
              <Trash2 size={15}/>
            </button>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <h3 className="font-semibold">Profile completeness</h3>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl font-semibold text-ink">{currentStartup?.profile_completeness ?? 82}%</span>
        <span className="text-xs font-semibold text-emerald-700">
          {(currentStartup?.profile_completeness ?? 82) === 100 ? 'All 11 fields completed' : `${Math.round(11 * (1 - (currentStartup?.profile_completeness ?? 82)/100))} fields remaining`}
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${currentStartup?.profile_completeness ?? 82}%` }}/>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Completeness is computed dynamically across 11 core fields (name, logo, tagline, sectors, stage, problem, solution, target market, business model, funding ask, location).
      </p>
    </div>
  </div></>;
    if(page==='Pitch Deck & Documents')return <><SectionTitle eyebrow="Secure document portal" title="Pitch deck & documents" desc="Store private pitch decks in Supabase Storage with automatic versioning and 60-second time-limited signed URLs." action={<Button onClick={()=>openModal('upload','Upload pitch deck')}><Upload size={15}/> Upload PDF</Button>}/>
  <div className="grid gap-4 md:grid-cols-3">
    {deckDocuments.map((doc: any) => (
      <div key={doc.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-700"><FileText size={22}/></div>
            <div className="flex items-center gap-1.5">
              <Pill tone="blue">v{doc.version || 1}</Pill>
              <button onClick={()=>handleDeletePitchDeck(doc.id, doc.title)} title="Delete document" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
          <h3 className="mt-4 break-words text-sm font-semibold">{doc.title}</h3>
          <p className="mt-1 text-xs text-slate-500">PDF · {(doc.file_size / (1024 * 1024)).toFixed(1)} MB</p>
          <div className="mt-3 flex items-center justify-between">
            <Pill tone={doc.visibility==='public'?'green':doc.visibility==='private'?'gray':'amber'}>
              {doc.visibility || 'access_controlled'}
            </Pill>
            <span className="text-[10px] text-slate-400">
              {doc.created_at && doc.created_at.includes('T') ? new Date(doc.created_at).toLocaleDateString() : 'Updated recently'}
            </span>
          </div>
        </div>
        <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
          <Button className="w-full" kind="secondary" onClick={()=>handleDownloadPitchDeck(doc)}>
            <ExternalLink size={14}/> Download (60s URL)
          </Button>
        </div>
      </div>
    ))}
  </div>

  <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold">Deck access requests</h3>
        <p className="mt-0.5 text-xs text-slate-500">Investors and partners requesting permission to view confidential pitch decks</p>
      </div>
      <Pill tone="amber">{deckRequests.filter(r=>r.status==='pending').length} pending</Pill>
    </div>
    <div className="mt-4 space-y-3">
      {deckRequests.map((req: any) => (
        <div key={req.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Avatar initials={(req.requester_name || 'NV').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{req.requester_name || 'Verified Investor'}</p>
                <Pill tone={req.status==='approved'?'green':req.status==='rejected'?'red':'amber'}>{req.status || 'pending'}</Pill>
              </div>
              <p className="mt-1 text-xs text-slate-600">{req.notes || 'Requested access to pitch materials'}</p>
              <p className="mt-1 text-[10px] text-slate-400">{req.created_at}</p>
            </div>
          </div>
          {req.status === 'pending' ? (
            <div className="flex gap-2 self-end sm:self-center">
              <Button onClick={()=>handleApproveDeckRequest(req.id, req.requester_name || 'Investor')}>
                <Check size={14}/> Approve
              </Button>
              <Button kind="secondary" onClick={()=>handleDeclineDeckRequest(req.id, req.requester_name || 'Investor')}>
                Decline
              </Button>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400 capitalize">Decision: {req.status}</span>
          )}
        </div>
      ))}
    </div>
  </div></>;
  if (page === 'Users') return <AdminUsersView onNotify={notify} />;
  if (page === 'Reported Content') return <AdminReportedContentView onNotify={notify} />;
  if (page === 'Messages') {
    return (
      <MessagesView
        conversations={conversations}
        activeUserId={activeConversationUserId}
        messages={conversationMessages}
        loadingConversations={conversationsLoading}
        loadingMessages={messagesLoading}
        currentUserId={auth.user?.id || ''}
        onSelectConversation={(userId) => {
          setActiveConversationUserId(userId);
          fetchMessages(userId);
        }}
        onSendMessage={handleSendDirectMessage}
        onRefresh={() => {
          fetchConversations();
          if (activeConversationUserId) fetchMessages(activeConversationUserId);
        }}
        lastPolledAt={lastPolledAt}
      />
    );
  }

  if (page === 'Pipeline') {
    return (
      <PipelineBoard
        pipelineGroups={pipelineGroups}
        loading={pipelineLoading}
        onUpdateStatus={handleUpdatePipelineStatus}
        onViewHistory={handleOpenHistoryModal}
        onRequestMeeting={(st) => setPitchModalStartup(st)}
        onEditNote={(startupId, currentNote, startupName) => {
          const val = prompt('Edit confidential private note (investor only):', currentNote || '');
          if (val !== null) {
            handleSaveInvestorNote(startupId, val);
          }
        }}
        navTo={navTo}
      />
    );
  }

  if (page === 'Watchlist & Notes') {
    return (
      <WatchlistSection
        watchlistItems={watchlistItems}
        loading={watchlistLoading}
        onRemove={handleRemoveFromWatchlist}
        onSaveNote={handleSaveInvestorNote}
        onDeleteNote={handleDeleteInvestorNote}
        onRequestMeeting={(st) => setPitchModalStartup(st)}
        onMoveToPipeline={async (startupId, status) => {
          await handleUpdatePipelineStatus(startupId, status);
          fetchWatchlist();
        }}
        navTo={navTo}
      />
    );
  }

  if (page === 'Meeting Requests') {
    return (
      <MeetingRequestsView
        role={role}
        requests={pitchRequests}
        loading={pitchRequestsLoading}
        onRespond={handleRespondPitchRequest}
        onOpenNewMeeting={() => navTo('Discover Startups')}
        onNavigateToMessages={(partnerId) => {
          setActiveConversationUserId(partnerId);
          setPage('Messages');
        }}
        onSendTypedMessage={handleSendPitchRequestMessage}
        onRefresh={fetchPitchRequests}
      />
    );
  }
  
  if(page==='Investment Preferences') {
    const availableSectors = ['AgriTech', 'Climate Tech', 'FinTech', 'HealthTech', 'AI / ML', 'EdTech', 'B2B SaaS', 'Clean Energy', 'DeepTech', 'Consumer Tech', 'E-Commerce', 'Logistics'];
    const availableStages = [
      { id: 'idea', label: 'Idea' },
      { id: 'validation', label: 'Validation' },
      { id: 'mvp', label: 'MVP' },
      { id: 'early_traction', label: 'Early Traction' },
      { id: 'growth', label: 'Growth' },
    ];
    const availableRegions = ['Punjab', 'Delhi NCR', 'Karnataka', 'Maharashtra', 'Telangana', 'India', 'Open to any region'];
    const availableModels = ['B2B', 'B2C', 'D2C', 'B2B2C', 'Marketplace', 'Subscription', 'SaaS'];

    return (
      <>
        <SectionTitle
          eyebrow="Investor workspace"
          title="Investment Preferences & Thesis"
          desc="Define your mandate. The pure matching engine uses these settings to calculate transparent compatibility scores (Industry 30%, Stage 25%, Funding 20%, Location 15%, Business Model 10%)."
          action={
            <div className="flex gap-2">
              <Button disabled={savingPrefs} onClick={() => handleSaveInvestorPrefs(false)}>
                {savingPrefs ? 'Saving...' : 'Save preferences'}
              </Button>
              <Button disabled={savingPrefs} kind="secondary" onClick={() => handleSaveInvestorPrefs(true)}>
                Save & View Rankings <ArrowRight size={14}/>
              </Button>
            </div>
          }
        />

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
            <h3 className="font-semibold text-ink">Firm & Fund Profile</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Firm / Angel Name</label>
                <input
                  value={investorPrefs.firm_name}
                  onChange={e => setInvestorPrefs(prev => ({ ...prev, firm_name: e.target.value }))}
                  placeholder="e.g. Northstar Ventures"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Investment Thesis Summary</label>
                <input
                  value={investorPrefs.thesis}
                  onChange={e => setInvestorPrefs(prev => ({ ...prev, thesis: e.target.value }))}
                  placeholder="e.g. Early-stage agritech and climate hardware with proven field pilots."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Target Sectors (Weight: 30%)</h3>
                <p className="mt-0.5 text-xs text-slate-500">Share of startup sectors you cover determines this criterion score (0-100).</p>
              </div>
              <span className="text-xs font-semibold text-forest">{investorPrefs.sectors.length} selected</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {availableSectors.map(sec => {
                const isSelected = investorPrefs.sectors.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setInvestorPrefs(prev => ({
                        ...prev,
                        sectors: isSelected
                          ? prev.sectors.filter(s => s !== sec)
                          : [...prev.sectors, sec]
                      }));
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-forest text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                    }`}
                  >
                    {isSelected && <Check size={14} />} {sec}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Preferred Stages (Weight: 25%)</h3>
                <p className="mt-0.5 text-xs text-slate-500">Exact match = 100, adjacent stage = 50, otherwise = 0.</p>
              </div>
              <span className="text-xs font-semibold text-forest">{investorPrefs.stages.length} selected</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {availableStages.map(stg => {
                const isSelected = investorPrefs.stages.includes(stg.id);
                return (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => {
                      setInvestorPrefs(prev => ({
                        ...prev,
                        stages: isSelected
                          ? prev.stages.filter(s => s !== stg.id)
                          : [...prev.stages, stg.id]
                      }));
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-forest text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                    }`}
                  >
                    {isSelected && <Check size={14} />} {stg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
            <div>
              <h3 className="font-semibold text-ink">Ticket Size Range (Weight: 20%)</h3>
              <p className="mt-0.5 text-xs text-slate-500">100 if ask is in range; scaled smoothly if below min or above max.</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Min Ticket (INR)</label>
                <input
                  type="number"
                  step="100000"
                  value={investorPrefs.ticket_min}
                  onChange={e => setInvestorPrefs(prev => ({ ...prev, ticket_min: Number(e.target.value) || 0 }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  ≈ ₹{(investorPrefs.ticket_min / 100000).toFixed(1)} Lakh
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Max Ticket (INR)</label>
                <input
                  type="number"
                  step="100000"
                  value={investorPrefs.ticket_max}
                  onChange={e => setInvestorPrefs(prev => ({ ...prev, ticket_max: Number(e.target.value) || 0 }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  ≈ ₹{(investorPrefs.ticket_max / 100000).toFixed(1)} Lakh
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: 'Seed Angel (₹10L – ₹50L)', min: 1000000, max: 5000000 },
                { label: 'Micro Angel (₹5L – ₹25L)', min: 500000, max: 2500000 },
                { label: 'Pre-Series A (₹50L – ₹2Cr)', min: 5000000, max: 20000000 },
                { label: 'FinTech Syndicate (₹25L – ₹1Cr)', min: 2500000, max: 10000000 },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setInvestorPrefs(prev => ({ ...prev, ticket_min: preset.min, ticket_max: preset.max }))}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <h3 className="font-semibold text-ink">Target Geography (Weight: 15%)</h3>
              <p className="mt-0.5 text-xs text-slate-500">Same city: 100, same state: 80, country: 60, open: 60.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {availableRegions.map(reg => {
                  const isSelected = investorPrefs.regions.includes(reg);
                  return (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => {
                        setInvestorPrefs(prev => ({
                          ...prev,
                          regions: isSelected
                            ? prev.regions.filter(r => r !== reg)
                            : [...prev.regions, reg]
                        }));
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-forest text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      }`}
                    >
                      {isSelected && <Check size={14} />} {reg}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <h3 className="font-semibold text-ink">Business Models (Weight: 10%)</h3>
              <p className="mt-0.5 text-xs text-slate-500">Share of overlap; neutral 50 if no preference is chosen.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {availableModels.map(model => {
                  const isSelected = investorPrefs.business_models.includes(model);
                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        setInvestorPrefs(prev => ({
                          ...prev,
                          business_models: isSelected
                            ? prev.business_models.filter(m => m !== model)
                            : [...prev.business_models, model]
                        }));
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-forest text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      }`}
                    >
                      {isSelected && <Check size={14} />} {model}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-[#edf5ee] p-5">
            <div>
              <h4 className="font-semibold text-forest">Ready to update your live rankings?</h4>
              <p className="mt-0.5 text-xs text-slate-600">Saving invalidates previous match scores in PostgreSQL cache and recalculates fit.</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={savingPrefs} onClick={() => handleSaveInvestorPrefs(false)}>
                {savingPrefs ? 'Saving...' : 'Save preferences'}
              </Button>
              <Button disabled={savingPrefs} kind="secondary" onClick={() => handleSaveInvestorPrefs(true)}>
                Save & View Rankings <ArrowRight size={14}/>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if(page==='Profile & Settings'||page==='My Expertise Profile') {
    const displayName = profileFullName || auth.user?.full_name || (role==='Founder'?'Manmeet Singh':role==='Investor'?'Northstar Ventures':role==='Mentor'?'Dr. Kavita Mehra':'Punjab Innovation Hub');
    const displayEmail = auth.user?.email || 'hello@example.com';
    const displayInitials = displayName.split(' ').map((x: string)=>x[0]).join('').slice(0,2).toUpperCase();
    return <><SectionTitle eyebrow="Your workspace" title={page} desc="Manage the details that help other members understand your profile and preferences."/><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-soft"><Avatar initials={displayInitials} size="lg"/><h3 className="mt-4 font-semibold">{displayName}</h3><p className="mt-1 text-sm text-slate-500">{role} account</p><div className="mt-4 flex justify-center"><Pill tone={auth.user?.verification_status==='verified'?'green':auth.user?.verification_status==='rejected'?'red':'amber'}>{auth.user?.verification_status ? `${auth.user.verification_status.toUpperCase()} Profile` : (role==='Founder'?'Verified Founder':'Pending Review')}</Pill></div></div><div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft"><h3 className="font-semibold">Profile information</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="text-xs font-semibold text-slate-500">DISPLAY NAME</label><input value={profileFullName} onChange={e=>setProfileFullName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/></div><div><label className="text-xs font-semibold text-slate-500">EMAIL ADDRESS (SUPABASE AUTH)</label><input value={displayEmail} disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 outline-none"/></div><div><label className="text-xs font-semibold text-slate-500">ORGANIZATION</label><input value={profileOrg} onChange={e=>setProfileOrg(e.target.value)} placeholder="Organization / Fund name" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/></div><div><label className="text-xs font-semibold text-slate-500">LOCATION</label><input value={profileLocation} onChange={e=>setProfileLocation(e.target.value)} placeholder="City, country" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/></div><div><label className="text-xs font-semibold text-slate-500">WEBSITE / LINKEDIN</label><input value={profileWebsite} onChange={e=>setProfileWebsite(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/></div><div className="sm:col-span-2"><label className="text-xs font-semibold text-slate-500">BIO / THESIS / EXPERTISE</label><textarea value={profileBio} onChange={e=>setProfileBio(e.target.value)} placeholder="Tell others about your background, investment thesis or startup goals..." className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"/></div></div>{role==='Investor'&&<div className="mt-5 border-t border-slate-100 pt-5"><h4 className="text-sm font-semibold">Investment preferences</h4><div className="mt-3 flex flex-wrap gap-2">{['AgriTech','Climate Tech','AI','Pre-seed','Seed','India'].map(x=><Pill key={x} tone="green">{x}</Pill>)}</div></div>}<div className="mt-5 flex items-center justify-between"><Button disabled={savingProfile} onClick={handleSaveProfile}>{savingProfile ? 'Saving...' : 'Save changes'}</Button><button type="button" onClick={() => setReportModalTarget({ type: 'user', id: auth.user?.id || 'f0000000-0000-0000-0000-000000000001', name: displayName })} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"><Flag size={13} /> Report profile</button></div></div></div></>;
  }
  if(page==='Platform Settings')return <><SectionTitle eyebrow="Administration" title="Platform settings" desc="Configure basic platform controls for this prototype."/><div className="space-y-4">{[{title:'Investor verification required',desc:'New investor profiles need admin approval before receiving a verified badge.',on:true},{title:'Mentor verification required',desc:'Mentors are reviewed before appearing as verified experts.',on:true},{title:'Incubator verification required',desc:'Incubator organizations are reviewed before publishing programs.',on:true},{title:'Moderate new startup listings',desc:'Flag listings for review when users report suspicious or misleading content.',on:false}].map(x=><div key={x.title} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div><p className="font-semibold">{x.title}</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{x.desc}</p></div><button onClick={()=>notify(`${x.title} setting toggled in demo.`)} className={cn('relative h-6 w-11 rounded-full transition',x.on?'bg-forest':'bg-slate-300')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition',x.on?'left-6':'left-1')}/></button></div>)}</div></>;
  if (role === 'Mentor' && (page === 'Mentorship Requests' || page === 'Startups to Review' || page === 'My Expertise Profile')) {
    return (
      <MentorPortalView
        activeTab={page as any}
        onNotify={notify}
        onNavigateToTab={navTo}
      />
    );
  }

  if (role === 'Incubator' && (page === 'My Programs' || page === 'Applications Received')) {
    return (
      <IncubatorPortalView
        activeTab={page as any}
        onNotify={notify}
      />
    );
  }

  if (page === 'Mentors') {
    const founderStartupsList = startups.filter((s: any) => s.founder_id === auth.user?.id || s.id === currentStartup?.id);
    const rawList = founderStartupsList.length > 0 ? founderStartupsList : [{ id: currentStartup?.id || 's0000000-0000-0000-0000-000000000001', name: currentStartup?.name || 'FarmSense' }];
    const availableStartups = rawList.map((s: any) => ({ id: String(s.id), name: String(s.name) }));
    return (
      <FounderMentorsView
        founderStartups={availableStartups}
        onNotify={notify}
      />
    );
  }

  if (page === 'Incubators & Applications') {
    const founderStartupsList = startups.filter((s: any) => s.founder_id === auth.user?.id || s.id === currentStartup?.id);
    const rawList = founderStartupsList.length > 0 ? founderStartupsList : [{ id: currentStartup?.id || 's0000000-0000-0000-0000-000000000001', name: currentStartup?.name || 'FarmSense' }];
    const availableStartups = rawList.map((s: any) => ({ id: String(s.id), name: String(s.name) }));
    return (
      <FounderIncubatorsView
        founderStartups={availableStartups}
        onNotify={notify}
      />
    );
  }
  return <><SectionTitle eyebrow="Your workspace" title={page} desc="Manage your startup networking activity."/><EmptyState title="You're all caught up" desc="This area is ready for your workspace activity. Try a related action to see the prototype flow." action={<Button onClick={()=>navTo(role==='Founder'?'Investor Matches':role==='Investor'?'Discover Startups':role==='Mentor'?'Mentorship Requests':'My Programs')}>Explore workspace</Button>}/></>;
 };

 return <div className="min-h-screen bg-canvas">
  {role==='Public'?<><header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8"><button onClick={()=>navTo('Home')} className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest text-white"><span className="text-lg font-bold">f.</span></span><span className="text-left"><span className="block text-[15px] font-bold tracking-tight text-ink">founders den</span><span className="block text-[10px] tracking-wide text-slate-400">BUILD WHAT'S NEXT</span></span></button><nav className="hidden items-center gap-7 md:flex">{navPublic.map(n=><button key={n} onClick={()=>navTo(n)} className={cn('text-sm transition',page===n?'font-semibold text-forest':'text-slate-500 hover:text-ink')}>{n}</button>)}</nav><div className="flex items-center gap-2"><button onClick={()=>openModal('auth','Welcome back')} className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:block">Log in</button><Button onClick={()=>openModal('auth','Join Founders Den')} className="hidden sm:inline-flex">Sign up <ArrowRight size={14}/></Button><button onClick={()=>setMobileNav(!mobileNav)} className="rounded-xl p-2 text-slate-600 md:hidden"><Menu size={20}/></button></div></div>{mobileNav&&<div className="border-t border-slate-100 bg-white p-3 md:hidden">{navPublic.map(n=><button key={n} onClick={()=>navTo(n)} className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-50">{n}</button>)}<button onClick={()=>openModal('auth','Join Founders Den')} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-forest">Sign up</button></div>}</header>{renderPublic()}<footer className="border-t border-slate-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8"><div className="flex items-center gap-2 font-semibold text-slate-600"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest text-white">f.</span> founders den</div><p>Connecting ideas with the people who help them grow.</p><div className="flex gap-4"><button onClick={()=>navTo('How It Works')}>How it works</button><button onClick={()=>openModal('auth','Join Founders Den')}>Join the network</button><span>Prototype · 2026</span></div></div></footer></>:<div className="min-h-screen lg:flex"><aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-slate-100 bg-white transition-transform lg:translate-x-0',mobileNav?'translate-x-0':'-translate-x-full')}><div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5"><button onClick={()=>enterRole('Public')} className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-lg font-bold text-white">f.</span><span className="text-left"><span className="block text-sm font-bold text-ink">founders den</span><span className="block text-[10px] text-slate-400">{config?.label}</span></span></button><button onClick={()=>setMobileNav(false)} className="rounded-lg p-2 text-slate-400 lg:hidden"><X size={18}/></button></div><div className="border-b border-slate-100 p-4"><button onClick={()=>openModal('switchRole','Switch demo role')} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-forest"><UserRound size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{role==='Founder'?'Manmeet Singh':role==='Investor'?'Northstar Ventures':role==='Mentor'?'Dr. Kavita Mehra':role==='Incubator'?'Punjab Innovation Hub':'Platform admin'}</span><span className="mt-1 block text-[10px] text-slate-500">{role} workspace</span></span><ChevronDown size={15} className="text-slate-400"/></button></div><nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-4">{sidebar.map(item=><button key={item.label} onClick={()=>navTo(item.label)} className={cn('mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition',item.active?'bg-emerald-50 text-forest':'text-slate-500 hover:bg-slate-50 hover:text-ink')}><item.icon size={17}/><span className="flex-1">{item.label}</span>{item.label==='Messages'&&<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-forest">2</span>}</button>)}</nav><div className="border-t border-slate-100 p-4"><div className="rounded-xl bg-[#f3f8f3] p-3"><div className="flex items-center gap-2 text-forest"><CircleHelp size={16}/><span className="text-xs font-semibold">Need a hand?</span></div><p className="mt-2 text-[11px] leading-5 text-slate-500">Explore the demo workspace and try the core flows.</p><button onClick={()=>notify('Help center is a demo placeholder.')} className="mt-2 text-xs font-semibold text-forest">Open help center <ArrowRight size={12} className="inline"/></button></div><button onClick={()=>enterRole('Public')} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"><LogOut size={16}/> Exit workspace</button></div></aside>{mobileNav&&<button onClick={()=>setMobileNav(false)} className="fixed inset-0 z-30 bg-ink/30 lg:hidden"/>}<main className="min-h-screen min-w-0 flex-1 lg:ml-[270px]"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={()=>setMobileNav(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20}/></button><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-slate-400">{role} workspace</p><p className="mt-1 text-sm font-semibold text-ink">{page}</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 sm:inline-flex">Demo environment</span><NotificationDropdown onNotificationClick={(item) => notify(`Notification: ${item.title}`)} /><Avatar initials={role==='Founder'?'MS':role==='Investor'?'NV':role==='Mentor'?'KM':role==='Incubator'?'PI':'AD'} size="sm"/></div></header><div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">{renderDashboard()}</div><footer className="border-t border-slate-100 px-5 py-5 text-xs text-slate-400 sm:px-9">Founders Den · Clickable MVP prototype <span className="mx-2">·</span> Demo content only</footer></main></div>}
  {modal&&<Modal modal={modal} close={()=>setModal(null)} openModal={openModal} notify={notify} addStartup={addStartup} newStartup={newStartup} setNewStartup={setNewStartup} enterRole={enterRole} setRole={setRole} setPage={setPage} role={role} startupEditForm={startupEditForm} setStartupEditForm={setStartupEditForm} handleSaveStartupProfile={handleSaveStartupProfile} handleUploadDeckFile={handleUploadDeckFile} isUploading={isUploading} uploadProgress={uploadProgress} uploadVisibility={uploadVisibility} setUploadVisibility={setUploadVisibility} teamMemberForm={teamMemberForm} setTeamMemberForm={setTeamMemberForm} handleAddTeamMember={handleAddTeamMember} activeStartupDetail={activeStartupDetail} detailLoading={detailLoading} accessRequestedIds={accessRequestedIds} setAccessRequestedIds={setAccessRequestedIds} meetingRequestedIds={meetingRequestedIds} setMeetingRequestedIds={setMeetingRequestedIds} setReportModalTarget={setReportModalTarget} />}
  {pitchModalStartup && (
    <PitchRequestModal
      startup={pitchModalStartup}
      onClose={() => setPitchModalStartup(null)}
      onSubmit={handleCreatePitchRequest}
    />
  )}
  {historyModalData && (
    <PipelineHistoryModal
      startupName={historyModalData.startupName}
      history={historyModalData.history}
      loading={historyModalData.loading}
      onClose={() => setHistoryModalData(null)}
    />
  )}
  {reportModalTarget && (
    <ReportModal
      isOpen={!!reportModalTarget}
      onClose={() => setReportModalTarget(null)}
      targetType={reportModalTarget.type}
      targetId={reportModalTarget.id}
      targetName={reportModalTarget.name}
      onSuccess={(msg) => notify(msg)}
    />
  )}
  {toast&&<div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl"><CheckCircle2 size={17} className="text-emerald-300"/>{toast}</div>}
 </div>;
}
function DiscoveryControls({
  search,
  setSearch,
  sector,
  setSector,
  stage,
  setStage,
  location,
  setLocation,
  sort,
  setSort,
  metaSectors = [],
  metaStages = [],
  onReset,
}: {
  search: string;
  setSearch: (v: string) => void;
  sector: string;
  setSector: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  sort: string;
  setSort: (v: any) => void;
  metaSectors?: any[];
  metaStages?: any[];
  onReset?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.8fr_1.1fr_1.1fr_1.1fr_1fr]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={16}/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search startups, keywords, problem..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={sector}
          onChange={e => setSector(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 outline-none focus:border-emerald-500"
        >
          <option value="All sectors">All sectors</option>
          {metaSectors.length > 0 ? (
            metaSectors.map((m: any) => (
              <option key={m.sector || m} value={m.sector || m}>
                {m.sector || m} {m.count ? `(${m.count})` : ''}
              </option>
            ))
          ) : (
            ['AgriTech', 'Climate Tech', 'HealthTech', 'EdTech', 'FinTech', 'Clean Energy', 'AI', 'SaaS'].map(x => (
              <option key={x} value={x}>{x}</option>
            ))
          )}
        </select>

        <select
          value={stage}
          onChange={e => setStage(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 outline-none focus:border-emerald-500"
        >
          <option value="All stages">All stages</option>
          {metaStages.length > 0 ? (
            metaStages.map((m: any) => (
              <option key={m.stage || m} value={m.stage || m}>
                {(m.stage || m).replace('_', ' ')} {m.count ? `(${m.count})` : ''}
              </option>
            ))
          ) : (
            ['Idea', 'Validation', 'MVP', 'Early traction', 'Growth'].map(x => (
              <option key={x} value={x}>{x}</option>
            ))
          )}
        </select>

        <div className="relative">
          <MapPin className="absolute left-3 top-3.5 text-slate-400" size={16}/>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location filter"
            className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 outline-none focus:border-emerald-500"
        >
          <option value="newest">Sort: Newest</option>
          <option value="funding">Sort: Funding Ask</option>
          <option value="relevance">Sort: Relevance</option>
        </select>
      </div>

      {(search || sector !== 'All sectors' || stage !== 'All stages' || location || sort !== 'newest') && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-600">Active filters:</span>
            {search && <Pill tone="blue">Query: &quot;{search}&quot;</Pill>}
            {sector !== 'All sectors' && <Pill tone="green">{sector}</Pill>}
            {stage !== 'All stages' && <Pill tone="amber">{stage}</Pill>}
            {location && <Pill tone="purple">{location}</Pill>}
            {sort !== 'newest' && <Pill tone="gray">Sort: {sort}</Pill>}
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700"
            >
              <X size={13}/> Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function ActivityRows({items}:{items:string[][]}){return <div>{items.map((x,i)=><div key={x[0]} className="flex items-start gap-3 border-t border-slate-100 py-4 first:mt-4"><span className={cn('mt-1 h-2 w-2 rounded-full',x[2]==='green'?'bg-emerald-500':x[2]==='blue'?'bg-sky-500':'bg-amber-500')}/><div className="flex-1"><p className="text-sm font-medium">{x[0]}</p><p className="mt-1 text-xs text-slate-500">{x[1]}</p></div><ChevronRight size={15} className="text-slate-400"/></div>)}</div>}
function RequestRow({name,subtitle,initials,status,onClick}:{name:string;subtitle:string;initials:string;status:string;onClick:()=>void}){return <button onClick={onClick} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"><Avatar initials={initials}/><span className="flex-1"><span className="block text-sm font-semibold">{name}</span><span className="mt-1 block text-xs text-slate-500">{subtitle}</span></span><Pill tone="amber">{status}</Pill></button>}
function Info({label,value}:{label:string;value:string}){return <div><p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
function Field({label,value}:{label:string;value:string}){return <div><label className="text-xs font-semibold text-slate-500">{label.toUpperCase()}</label><input defaultValue={value} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/></div>}
function Modal({modal,close,openModal,notify,addStartup,newStartup,setNewStartup,enterRole,setRole,setPage,role, startupEditForm, setStartupEditForm, handleSaveStartupProfile, handleUploadDeckFile, isUploading, uploadProgress, uploadVisibility, setUploadVisibility, teamMemberForm, setTeamMemberForm, handleAddTeamMember, activeStartupDetail, detailLoading, accessRequestedIds, setAccessRequestedIds, meetingRequestedIds, setMeetingRequestedIds, setReportModalTarget}: any){
  const auth = useAuth();
  const [authRole, setAuthRole] = useState<Role>('Founder');
  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'forgot'>('signup');
  const [formName, setFormName] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isStudentInnovator, setIsStudentInnovator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [visibility, setVisibility] = useState('Access-controlled');
  const closeAndToast = (message: string) => { close(); notify(message); };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!formEmail || !formPassword || !formName) {
      setAuthError('Please fill in your name, email, and password.');
      return;
    }
    if (formPassword.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }
    setSubmitting(true);
    try {
      const profile = await auth.signUp({
        email: formEmail,
        password: formPassword,
        full_name: formName,
        role: authRole.toLowerCase() as any,
        organization: formOrg || undefined,
        is_student: authRole === 'Founder' ? isStudentInnovator : false,
      });
      if (authRole === 'Founder') {
        notify(`Welcome, ${formName}! Founder profile verified.`);
        enterRole('Founder');
      } else {
        notify(`Account created! Your ${authRole} application is pending admin review.`);
        enterRole(authRole);
      }
      close();
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during sign-up.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!formEmail || !formPassword) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const profile = await auth.signIn(formEmail, formPassword);
      notify('Logged in successfully!');
      const targetRole: Role = profile?.role
        ? ((profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) as Role)
        : 'Founder';
      enterRole(targetRole);
      close();
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!formEmail) {
      setAuthError('Please provide your registered email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await auth.resetPassword(formEmail);
      if (res.success) {
        setAuthSuccess(res.message || 'Password reset link sent! Check your email for Supabase Auth instructions.');
      } else {
        setAuthError('Failed to send password reset email.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchDemoRole = async (r: Role) => {
    await auth.switchDemoRole(r);
    enterRole(r);
    notify(`Active role switched to ${r}.`);
    close();
  };

  const handleSignOut = async () => {
    await auth.signOut();
    enterRole('Public');
    notify('Signed out successfully.');
    close();
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Founders Den</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{modal.title||modal.startup?.name||'Details'}</h2></div><button onClick={close} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
  {modal.type==='startup'&&(
    <div className="mt-6">
      {detailLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Loading startup profile...</p>
        </div>
      ) : activeStartupDetail ? (
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            {activeStartupDetail.logo ? (
              <img src={activeStartupDetail.logo} alt={activeStartupDetail.name} className="h-16 w-16 rounded-2xl object-cover border border-slate-100" />
            ) : (
              <Avatar initials={(activeStartupDetail.name || 'ST').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()} size="lg" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-ink">{activeStartupDetail.name}</h3>
                <Pill tone="green">{activeStartupDetail.stage}</Pill>
                <Pill tone={activeStartupDetail.visibility === 'public' ? 'green' : activeStartupDetail.visibility === 'private' ? 'gray' : 'amber'}>
                  {activeStartupDetail.visibility || 'access_controlled'}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {(Array.isArray(activeStartupDetail.sectors) ? activeStartupDetail.sectors : [activeStartupDetail.sector || 'General']).join(', ')} · {activeStartupDetail.location}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activeStartupDetail.tagline}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Funding Ask</p>
              <p className="mt-1 font-semibold text-ink">
                {typeof activeStartupDetail.funding_ask === 'number'
                  ? (activeStartupDetail.funding_ask >= 10000000 ? `₹${(activeStartupDetail.funding_ask/10000000).toFixed(1)} Cr` : `₹${(activeStartupDetail.funding_ask/100000).toFixed(0)} Lakh`)
                  : (activeStartupDetail.ask || '₹15L')}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Profile Completeness</p>
              <p className="mt-1 font-semibold text-emerald-700">{activeStartupDetail.profile_completeness ?? 90}%</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Visibility</p>
              <p className="mt-1 font-semibold capitalize text-ink">{(activeStartupDetail.visibility || 'access_controlled').replace('_', ' ')}</p>
            </div>
          </div>

          {activeStartupDetail.has_access ? (
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-[#f7faf7] p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-forest">
                <CheckCircle2 size={16}/> Confidential Founder Overview (Access Granted)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-slate-700">Problem Statement</p>
                  <p className="mt-1 text-slate-600">{activeStartupDetail.problem || 'Not specified'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Solution</p>
                  <p className="mt-1 text-slate-600">{activeStartupDetail.solution || 'Not specified'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Target Market</p>
                  <p className="mt-1 text-slate-600">{activeStartupDetail.target_market || 'Not specified'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Business Model</p>
                  <p className="mt-1 text-slate-600">{activeStartupDetail.business_model || 'Not specified'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-5 text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <LockKeyhole size={15} className="text-amber-700"/>
                Access-Controlled Documents & Sensitive Metrics
              </div>
              <p className="mt-1 text-amber-800">
                Detailed problem statement, solution mechanics, business model, and private pitch decks require verified founder access approval.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              {activeStartupDetail.has_access ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-forest">
                  <Check size={14}/> Access Approved
                </span>
              ) : accessRequestedIds[activeStartupDetail.id] ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  <Clock3 size={14}/> Access Requested
                </span>
              ) : (
                <Button onClick={async ()=>{
                  try {
                    const sid = activeStartupDetail.id || activeStartupDetail.db_id;
                    await apiClient.post(`/documents/${sid}/access-requests`, {
                      notes: 'Requesting access to verified pitch materials & traction metrics.',
                    });
                    setAccessRequestedIds((prev: any) => ({ ...prev, [activeStartupDetail.id]: true }));
                    notify('Access request sent to founder!');
                  } catch (err: any) {
                    setAccessRequestedIds((prev: any) => ({ ...prev, [activeStartupDetail.id]: true }));
                    notify('Access request recorded for founder review!');
                  }
                }}>
                  Request pitch access <ArrowRight size={14}/>
                </Button>
              )}

              {meetingRequestedIds[activeStartupDetail.id] ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                  <Check size={14}/> Meeting Requested
                </span>
              ) : (
                <Button kind="secondary" onClick={async ()=>{
                  if (role === 'Public') {
                    openModal('auth', 'Log in to request meetings');
                    return;
                  }
                  setMeetingRequestedIds((prev: any) => ({ ...prev, [activeStartupDetail.id]: true }));
                  notify(`Meeting requested with ${activeStartupDetail.name}! Founder has been notified.`);
                }}>
                  <CalendarDays size={14}/> Request meeting
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeStartupDetail && setReportModalTarget && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setReportModalTarget({
                      type: 'startup',
                      id: activeStartupDetail.id || activeStartupDetail.db_id,
                      name: activeStartupDetail.name,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                >
                  <Flag size={13} /> Report startup
                </button>
              )}
              <Button kind="ghost" onClick={close}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )}
  {(modal.type==='auth'||modal.type==='switchRole')&&<div className="mt-5">{modal.type==='auth'?<>
    <div className="flex rounded-xl bg-slate-100 p-1">
      <button onClick={()=>{setAuthMode('signup');setAuthError(null);setAuthSuccess(null);}} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition',authMode==='signup'?'bg-white text-ink shadow-sm':'text-slate-500')}>Sign up</button>
      <button onClick={()=>{setAuthMode('login');setAuthError(null);setAuthSuccess(null);}} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition',authMode==='login'?'bg-white text-ink shadow-sm':'text-slate-500')}>Log in</button>
      <button onClick={()=>{setAuthMode('forgot');setAuthError(null);setAuthSuccess(null);}} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition',authMode==='forgot'?'bg-white text-ink shadow-sm':'text-slate-500')}>Reset password</button>
    </div>

    {authError&&<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{authError}</div>}
    {authSuccess&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{authSuccess}</div>}

    {authMode==='signup'&&(
      <form onSubmit={handleSignUp} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500">I AM JOINING AS</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['Founder','Investor','Mentor','Incubator'] as Role[]).map(r=>(
              <button type="button" key={r} onClick={()=>setAuthRole(r)} className={cn('rounded-xl border p-3 text-sm font-medium transition',authRole===r?'border-emerald-600 bg-emerald-50 text-forest shadow-sm':'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {r}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {authRole === 'Founder' ? 'Founders get immediate portal access.' : `${authRole} accounts enter verification queue for admin approval.`}
          </p>
        </div>

        {authRole==='Founder'&&(
          <label className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-[#f4faf4] p-3 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={isStudentInnovator} onChange={e=>setIsStudentInnovator(e.target.checked)} className="h-4 w-4 rounded text-forest focus:ring-forest"/>
            <span>I am a <b>student innovator</b> building a university/college venture</span>
          </label>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500">FULL NAME *</label>
          <input required value={formName} onChange={e=>setFormName(e.target.value)} placeholder="Manmeet Singh" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500">ORGANIZATION / FIRM (OPTIONAL)</label>
          <input value={formOrg} onChange={e=>setFormOrg(e.target.value)} placeholder="Acme Ventures or University" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500">EMAIL ADDRESS *</label>
          <input required type="email" value={formEmail} onChange={e=>setFormEmail(e.target.value)} placeholder="you@domain.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500">PASSWORD (MIN 8 CHARACTERS) *</label>
          <input required type="password" value={formPassword} onChange={e=>setFormPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <Button disabled={submitting} className="w-full mt-2">
          {submitting ? 'Creating account...' : `Create ${authRole} Account`} <ArrowRight size={15}/>
        </Button>
      </form>
    )}

    {authMode==='login'&&(
      <form onSubmit={handleSignIn} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500">EMAIL ADDRESS *</label>
          <input required type="email" value={formEmail} onChange={e=>setFormEmail(e.target.value)} placeholder="you@domain.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-500">PASSWORD *</label>
            <button type="button" onClick={()=>setAuthMode('forgot')} className="text-xs font-semibold text-forest hover:underline">Forgot password?</button>
          </div>
          <input required type="password" value={formPassword} onChange={e=>setFormPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <Button disabled={submitting} className="w-full mt-2">
          {submitting ? 'Authenticating...' : 'Sign in to Founders Den'} <ArrowRight size={15}/>
        </Button>

        <p className="text-center text-xs text-slate-400">
          Need an account? <button type="button" onClick={()=>setAuthMode('signup')} className="font-semibold text-forest hover:underline">Sign up here</button>
        </p>
      </form>
    )}

    {authMode==='forgot'&&(
      <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Enter your account email. Supabase Auth will trigger a secure password reset link to your email address.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-500">REGISTERED EMAIL ADDRESS</label>
          <input required type="email" value={formEmail} onChange={e=>setFormEmail(e.target.value)} placeholder="you@domain.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
        </div>

        <Button disabled={submitting} className="w-full">
          {submitting ? 'Sending link...' : 'Send Password Reset Link'}
        </Button>

        <p className="text-center text-xs text-slate-400">
          Remember your password? <button type="button" onClick={()=>setAuthMode('login')} className="font-semibold text-forest hover:underline">Back to login</button>
        </p>
      </form>
    )}
  </>:(
    <>
      <p className="mt-2 text-sm text-slate-500">Switch active role to test access controls, pending banners, deal feeds, and admin approval workflows.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(['Founder','Investor','Mentor','Incubator','Admin'] as Role[]).map(r=>(
          <button key={r} onClick={()=>handleSwitchDemoRole(r)} className={cn('rounded-xl border p-4 text-left text-sm font-semibold transition',role===r?'border-emerald-600 bg-emerald-50 text-forest shadow-sm':'border-slate-200 hover:bg-slate-50')}>
            {r}
            <span className="mt-1 block text-xs font-normal text-slate-500">
              {r==='Founder'?'Instant verified startup portal':r==='Investor'?'Dealflow & watchlist (pending approval)':r==='Mentor'?'Mentorship requests':r==='Incubator'?'Programs & applications':'Verification queue & audit logs'}
            </span>
          </button>
        ))}
      </div>
      {auth.user&&(
        <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Signed in as <b className="text-ink">{auth.user.email}</b> ({auth.user.role})
          </div>
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700">
            <LogOut size={14}/> Sign out
          </button>
        </div>
      )}
    </>
  )}</div>}
  {(modal.type==='newStartup'||modal.type==='editStartup')&&<div className="mt-5 space-y-4">
    <div>
      <label className="text-xs font-semibold text-slate-500">STARTUP NAME *</label>
      <input required value={startupEditForm.name || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,name:e.target.value}))} placeholder="e.g. FarmSense" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
    </div>
    <div>
      <label className="text-xs font-semibold text-slate-500">TAGLINE *</label>
      <input required value={startupEditForm.tagline || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,tagline:e.target.value}))} placeholder="A one-line description of your startup" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
    </div>
    <div>
      <label className="text-xs font-semibold text-slate-500">LOGO URL</label>
      <input value={startupEditForm.logo || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,logo:e.target.value}))} placeholder="https://example.com/logo.png" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-xs font-semibold text-slate-500">PRIMARY SECTOR</label>
        <select value={startupEditForm.sector || 'AgriTech'} onChange={e=>{const sec=e.target.value; setStartupEditForm((o:any)=>({...o,sector:sec,sectors:[sec]}));}} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option>AgriTech</option><option>Climate Tech</option><option>HealthTech</option><option>EdTech</option><option>FinTech</option><option>Clean Energy</option><option>AI</option><option>SaaS</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">STAGE</label>
        <select value={startupEditForm.stage || 'mvp'} onChange={e=>setStartupEditForm((o:any)=>({...o,stage:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="idea">Idea</option><option value="validation">Validation</option><option value="mvp">MVP</option><option value="early_traction">Early traction</option><option value="growth">Growth</option>
        </select>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-xs font-semibold text-slate-500">LOCATION *</label>
        <input required value={startupEditForm.location || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,location:e.target.value}))} placeholder="Ludhiana, Punjab" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">FUNDING ASK (INR)</label>
        <input type="number" min="0" value={startupEditForm.funding_ask ?? 1500000} onChange={e=>setStartupEditForm((o:any)=>({...o,funding_ask:Number(e.target.value)}))} placeholder="1500000" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
      </div>
    </div>
    <div>
      <label className="text-xs font-semibold text-slate-500">VISIBILITY</label>
      <select value={startupEditForm.visibility || 'access_controlled'} onChange={e=>setStartupEditForm((o:any)=>({...o,visibility:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <option value="public">Public (Open discovery for verified community)</option>
        <option value="access_controlled">Access-controlled (Pitch materials require approval)</option>
        <option value="private">Private (Stealth mode - owner & admin only)</option>
      </select>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-xs font-semibold text-slate-500">PROBLEM STATEMENT</label>
        <textarea value={startupEditForm.problem || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,problem:e.target.value}))} placeholder="What critical problem are you solving?" className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-500"/>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">SOLUTION</label>
        <textarea value={startupEditForm.solution || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,solution:e.target.value}))} placeholder="How does your product solve it?" className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-500"/>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-xs font-semibold text-slate-500">TARGET MARKET</label>
        <input value={startupEditForm.target_market || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,target_market:e.target.value}))} placeholder="e.g. 1M Punjab farmers" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"/>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">BUSINESS MODEL</label>
        <input value={startupEditForm.business_model || ''} onChange={e=>setStartupEditForm((o:any)=>({...o,business_model:e.target.value}))} placeholder="e.g. Annual SaaS + hardware lease" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"/>
      </div>
    </div>
    <Button className="w-full mt-2" onClick={()=>handleSaveStartupProfile(startupEditForm)}>
      {modal.type==='editStartup' ? 'Save startup profile' : 'Create startup profile'} <ArrowRight size={15}/>
    </Button>
  </div>}
  {modal.type==='upload'&&<div className="mt-5 space-y-4">
    <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center hover:border-emerald-400 transition">
      <Upload size={28} className="text-forest"/>
      <p className="mt-3 text-sm font-semibold">Choose a PDF pitch deck</p>
      <p className="mt-1 text-xs text-slate-500">PDF only · Max 10 MB per file</p>
      <input type="file" accept="application/pdf" className="sr-only" onChange={e=>{
        const f = e.target.files?.[0];
        if (f) handleUploadDeckFile(f);
      }}/>
    </label>

    {isUploading && (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
          <span>Uploading pitch deck to Supabase storage...</span>
          <span>{uploadProgress || 30}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-emerald-200 overflow-hidden">
          <div className="h-full bg-forest transition-all duration-300" style={{ width: `${uploadProgress || 30}%` }}/>
        </div>
      </div>
    )}

    <div>
      <label className="block text-xs font-semibold text-slate-500">DOCUMENT VISIBILITY RULE</label>
      <div className="mt-2 space-y-2">
        {[
          ['public','Public','Any verified community member can download.'],
          ['access_controlled','Access-controlled','Requires founder approval before download is granted.'],
          ['private','Private','Confidential to startup founder and administrator only.'],
        ].map(([val, label, desc])=>(
          <button key={val} type="button" onClick={()=>setUploadVisibility(val as any)} className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition', uploadVisibility===val ? 'border-emerald-600 bg-emerald-50/80 shadow-sm' : 'border-slate-200 hover:bg-slate-50')}>
            <span className={cn('mt-0.5 h-4 w-4 rounded-full border', uploadVisibility===val ? 'border-[5px] border-forest' : 'border-slate-300')}/>
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>}
  {(modal.type==='document')&&<div className="mt-5"><p className="text-sm leading-6 text-slate-500">Choose the visibility for this document. Private documents should only be shared through explicit access approval.</p><div className="mt-4 space-y-2">{['Public','Access-controlled','Private'].map(v=><button key={v} onClick={()=>setVisibility(v)} className={cn('flex w-full items-center justify-between rounded-xl border p-3 text-sm',visibility===v?'border-emerald-600 bg-emerald-50':'border-slate-200')}>{v}{visibility===v&&<Check size={16}/>}</button>)}</div><div className="mt-5 flex gap-2"><Button onClick={()=>closeAndToast(`Document access updated to ${visibility} in demo.`)}>Save access</Button><Button kind="secondary" onClick={()=>closeAndToast('Access request list opened in demo.')}>View requests</Button></div></div>}
  {(modal.type==='newProgram'||modal.type==='editProgram')&&<div className="mt-5 space-y-4">{[['Program name','e.g. Campus Founders Fellowship'],['Organization','Your incubator name'],['Sectors','AgriTech, AI, Climate Tech'],['Eligibility','Student founders, MVP stage...'],['Application deadline','30 Nov 2026']].map(([l,p])=><div key={l}><label className="text-xs font-semibold text-slate-500">{l.toUpperCase()}</label><input placeholder={p} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"/></div>)}<Button className="w-full" onClick={()=>closeAndToast('Program saved in demo. The production version will persist this to Supabase.')}>Save program</Button></div>}
  {modal.type==='team'&&<div className="mt-5 space-y-4">
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add new team member</h4>
      <div>
        <label className="block text-xs text-slate-500">Full Name *</label>
        <input required value={teamMemberForm.name} onChange={e=>setTeamMemberForm((o:any)=>({...o,name:e.target.value}))} placeholder="e.g. Jaspreet Kaur" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"/>
      </div>
      <div>
        <label className="block text-xs text-slate-500">Role Title *</label>
        <input required value={teamMemberForm.role_title} onChange={e=>setTeamMemberForm((o:any)=>({...o,role_title:e.target.value}))} placeholder="e.g. Co-Founder & CTO" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"/>
      </div>
      <div>
        <label className="block text-xs text-slate-500">Email Address (Optional)</label>
        <input type="email" value={teamMemberForm.email} onChange={e=>setTeamMemberForm((o:any)=>({...o,email:e.target.value}))} placeholder="jaspreet@farmsense.example.com" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"/>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
        <input type="checkbox" checked={teamMemberForm.is_primary} onChange={e=>setTeamMemberForm((o:any)=>({...o,is_primary:e.target.checked}))} className="rounded text-forest focus:ring-forest"/>
        <span>Key Primary Contact for Investors</span>
      </label>
      <Button className="w-full mt-2" onClick={()=>{
        if (!teamMemberForm.name || !teamMemberForm.role_title) {
          notify('Name and role title are required.');
          return;
        }
        handleAddTeamMember(teamMemberForm);
      }}>
        Add team member
      </Button>
    </div>
  </div>}
  {(modal.type==='mentor'||modal.type==='meeting'||modal.type==='request')&&<div className="mt-5 space-y-4"><p className="text-sm leading-6 text-slate-500">Add a short note so the recipient understands what you need and what the next step should be.</p><div><label className="text-xs font-semibold text-slate-500">MESSAGE</label><textarea placeholder="Hi, I'd like to connect because..." className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"/></div>{modal.type==='meeting'&&<div><label className="text-xs font-semibold text-slate-500">PROPOSED DATE</label><input type="date" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></div>}<Button className="w-full" onClick={()=>closeAndToast('Request sent in the clickable demo.')}>Send request <Send size={14}/></Button></div>}
  {!(['startup','auth','switchRole','newStartup','editStartup','upload','document','newProgram','editProgram','mentor','meeting','team','request'].includes(modal.type))&&<div className="mt-5"><p className="text-sm leading-6 text-slate-500">This interaction is represented in the clickable MVP. In production, it will be backed by Supabase authentication, database records, and role-based policies.</p><Button className="mt-5 w-full" onClick={()=>closeAndToast('Action completed in demo.')}>Continue</Button></div>}
  </div></div>;
}
