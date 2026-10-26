'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Lightbulb,
  Inbox,
  Search,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  CheckCircle2,
  Clock3,
  Building2,
  HeartHandshake,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface AdminStats {
  users_by_role: { founder: number; investor: number; mentor: number; incubator: number; admin: number };
  total_users: number;
  startups_listed: number;
  pending_verifications: number;
  open_reports: number;
  requests_last_30_days: number;
}

// -------------------------------------------------------------
// 1. Admin Dashboard Overview
// -------------------------------------------------------------
export function AdminDashboardView({
  onNavigate,
  onNotify,
}: {
  onNavigate: (page: string) => void;
  onNotify: (msg: string) => void;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        apiClient.get<AdminStats>('/admin/stats'),
        apiClient.get<any[]>('/admin/audit-logs?limit=5'),
      ]);
      if (statsRes?.data) setStats(statsRes.data);
      if (logsRes?.data) setAuditLogs(logsRes.data);
    } catch (err: any) {
      console.warn('Admin stats fetch notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const usersRole = stats?.users_by_role || { founder: 3, investor: 3, mentor: 2, incubator: 2, admin: 1 };
  const total = stats?.total_users || 11;

  const roleBars = [
    { name: 'Founders', n: usersRole.founder, pct: Math.round((usersRole.founder / total) * 100) },
    { name: 'Investors', n: usersRole.investor, pct: Math.round((usersRole.investor / total) * 100) },
    { name: 'Mentors', n: usersRole.mentor, pct: Math.round((usersRole.mentor / total) * 100) },
    { name: 'Incubators', n: usersRole.incubator, pct: Math.round((usersRole.incubator / total) * 100) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Platform operations</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Admin Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Live system metrics, verification queues, moderation controls, and audit trails.</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh live stats
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total verified users</span>
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800"><Users size={18} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats?.total_users ?? 11}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Across all 5 ecosystem roles</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Startup listings</span>
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Lightbulb size={18} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats?.startups_listed ?? 5}</p>
          <p className="mt-1 text-xs text-blue-600 font-medium">Live and discoverable</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending verifications</span>
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><ShieldCheck size={18} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats?.pending_verifications ?? 2}</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting administrator review</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open reports</span>
            <span className="rounded-xl bg-rose-50 p-2.5 text-rose-700"><Inbox size={18} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats?.open_reports ?? 0}</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Trust & moderation queue</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Action Center</h3>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {(stats?.pending_verifications ?? 0) + (stats?.open_reports ?? 0)} items pending
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={() => onNavigate('Verification Queue')}
              className="flex w-full items-center gap-3.5 rounded-xl border border-slate-100 p-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ShieldCheck size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Review verification queue</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {stats?.pending_verifications ?? 2} investor/mentor credentials awaiting KYC validation
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('Reported Content')}
              className="flex w-full items-center gap-3.5 rounded-xl border border-slate-100 p-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <Inbox size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Resolve reported content</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {stats?.open_reports ?? 0} user-submitted reports on profiles or pitch claims
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('Startup Listings')}
              className="flex w-full items-center gap-3.5 rounded-xl border border-slate-100 p-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Lightbulb size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Moderate startup listings</p>
                <p className="mt-0.5 text-xs text-slate-500">Hide misleading startups or remove inactive listings</p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('Users')}
              className="flex w-full items-center gap-3.5 rounded-xl border border-slate-100 p-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-forest">
                <Users size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Manage user accounts & suspensions</p>
                <p className="mt-0.5 text-xs text-slate-500">Search all members and suspend rule violators with immediate token blocking</p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <h3 className="font-semibold text-ink">Users by Ecosystem Role</h3>
          <p className="mt-0.5 text-xs text-slate-500">Total {total} registered member profiles</p>
          <div className="mt-5 space-y-4">
            {roleBars.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">{r.name}</span>
                  <span className="font-bold text-ink">{r.n} ({r.pct}%)</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real Audit Trail */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink">Recent Audit Trail</h3>
            <p className="mt-0.5 text-xs text-slate-500">Every admin action is recorded with actor ID and metadata.</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {auditLogs.length > 0 ? (
            auditLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between py-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-100 p-2 font-mono font-semibold text-slate-700">
                    {log.action}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      Target: {log.target_type} ({log.target_id ? log.target_id.slice(0, 8) + '...' : 'general'})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Actor: {log.actor_name || 'Admin'} {log.details?.reason ? `· Note: ${log.details.reason}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">No audit logs recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. Verification Queue View
// -------------------------------------------------------------
export function AdminVerificationQueueView({
  onNotify,
}: {
  onNotify: (msg: string) => void;
}) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any[]>('/admin/verifications');
      if (res?.data) setRequests(res.data);
    } catch (err: any) {
      console.warn('Verifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleApprove = async (id: string, name: string) => {
    try {
      setActingId(id);
      await apiClient.post(`/admin/verifications/${id}/approve`, {
        notes: 'Approved via Admin Verification Queue',
      });
      onNotify(`Approved verification for ${name}.`);
      fetchVerifications();
    } catch (err: any) {
      onNotify(`Approval failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    const reason = window.prompt(`Enter rejection reason for ${name}:`, 'Insufficient credentials or documents provided');
    if (!reason) return;

    try {
      setActingId(id);
      await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
      onNotify(`Verification rejected for ${name}.`);
      fetchVerifications();
    } catch (err: any) {
      onNotify(`Rejection failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">KYC & Approvals</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Verification Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review supporting notes, fund credentials, and advisory experience before granting verified ecosystem status.
          </p>
        </div>
        <button
          onClick={fetchVerifications}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
            Loading verification requests...
          </div>
        ) : requests.length > 0 ? (
          requests.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 font-bold uppercase">
                    {r.role_requested?.[0] || 'V'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink text-base">
                        {r.organization || r.user_id}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                        {r.role_requested}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        r.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {r.supporting_notes || 'No supporting notes submitted.'}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Requested: {new Date(r.created_at).toLocaleDateString()} · User ID: {r.user_id}
                    </p>
                  </div>
                </div>

                {r.status === 'pending' ? (
                  <div className="flex gap-2 shrink-0 self-end sm:self-start">
                    <button
                      disabled={actingId === r.id}
                      onClick={() => handleApprove(r.id, r.organization || 'Applicant')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-forest/90 disabled:opacity-50"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      disabled={actingId === r.id}
                      onClick={() => handleReject(r.id, r.organization || 'Applicant')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Review completed</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
            <h3 className="mt-3 font-semibold text-ink">Verification Queue is Clear</h3>
            <p className="mt-1 text-sm text-slate-500">All submitted applicant verifications have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. Admin Users Management (Suspend / Reactivate)
// -------------------------------------------------------------
export function AdminUsersView({
  onNotify,
}: {
  onNotify: (msg: string) => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (roleFilter) query.set('role', roleFilter);
      if (statusFilter) query.set('status', statusFilter);

      const res = await apiClient.get<any[]>(`/admin/users?${query.toString()}`);
      if (res?.data) setUsers(res.data);
    } catch (err: any) {
      console.warn('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspend = async (userId: string, name: string) => {
    const reason = window.prompt(`Enter reason for suspending ${name}:`, 'Violation of community terms');
    if (!reason) return;

    try {
      setActingId(userId);
      await apiClient.post(`/admin/users/${userId}/suspend`, { reason });
      onNotify(`${name} has been suspended. Their active token is immediately blocked across all endpoints.`);
      fetchUsers();
    } catch (err: any) {
      onNotify(`Suspension failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handleReactivate = async (userId: string, name: string) => {
    const reason = window.prompt(`Enter reason for reactivating ${name}:`, 'Appeal resolved');
    if (!reason) return;

    try {
      setActingId(userId);
      await apiClient.post(`/admin/users/${userId}/reactivate`, { reason });
      onNotify(`${name} account reactivated successfully.`);
      fetchUsers();
    } catch (err: any) {
      onNotify(`Reactivation failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Account Governance</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">User Directory & Access</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search all registered accounts. Suspending a user immediately blocks active session tokens with 403 ACCOUNT_SUSPENDED and hides their startups.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or organization..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
            >
              <option value="">All Roles</option>
              <option value="founder">Founder</option>
              <option value="investor">Investor</option>
              <option value="mentor">Mentor</option>
              <option value="incubator">Incubator</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Verification</th>
                <th className="px-5 py-4">Account Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink">{u.full_name}</p>
                    <p className="text-xs text-slate-500">{u.email} {u.organization ? `· ${u.organization}` : ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      u.verification_status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : u.verification_status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {u.verification_status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      u.status === 'suspended'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {u.role !== 'admin' && (
                      u.status === 'suspended' ? (
                        <button
                          disabled={actingId === u.id}
                          onClick={() => handleReactivate(u.id, u.full_name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check size={13} /> Reactivate
                        </button>
                      ) : (
                        <button
                          disabled={actingId === u.id}
                          onClick={() => handleSuspend(u.id, u.full_name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <AlertTriangle size={13} /> Suspend
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. Admin Startup Listings (Hide, Unhide, Delete)
// -------------------------------------------------------------
export function AdminStartupListingsView({
  onNotify,
}: {
  onNotify: (msg: string) => void;
}) {
  const [startups, setStartups] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchStartups = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter) query.set('status', statusFilter);

      const res = await apiClient.get<any[]>(`/admin/startups?${query.toString()}`);
      if (res?.data) setStartups(res.data);
    } catch (err: any) {
      console.warn('Admin startups fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStartups();
  }, [fetchStartups]);

  const handleHide = async (id: string, name: string) => {
    const reason = window.prompt(`Enter reason for hiding ${name} from discovery:`, 'Audit required for funding claim');
    if (!reason) return;

    try {
      setActingId(id);
      await apiClient.post(`/admin/startups/${id}/hide`, { reason });
      onNotify(`${name} hidden. It has disappeared from public discovery immediately.`);
      fetchStartups();
    } catch (err: any) {
      onNotify(`Hide failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handleUnhide = async (id: string, name: string) => {
    try {
      setActingId(id);
      await apiClient.post(`/admin/startups/${id}/unhide`);
      onNotify(`${name} restored to discovery.`);
      fetchStartups();
    } catch (err: any) {
      onNotify(`Unhide failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete ${name}? This cannot be undone.`)) return;

    try {
      setActingId(id);
      await apiClient.delete(`/admin/startups/${id}`);
      onNotify(`${name} deleted permanently.`);
      fetchStartups();
    } catch (err: any) {
      onNotify(`Delete failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Content Moderation</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Startup Listings Moderation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Control visibility of all companies. Hiding a startup immediately removes it from investor matching and public explore pages.
          </p>
        </div>
        <button
          onClick={fetchStartups}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search startup name, tagline, or sector..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'visible', 'hidden'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                  statusFilter === st
                    ? 'bg-forest text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {startups.map((s: any) => (
            <div key={s.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/60">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-forest font-bold">
                  {s.name?.[0] || 'S'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink text-base">{s.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {s.stage?.toUpperCase() || 'MVP'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {s.sector || 'General'}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      s.is_hidden
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {s.is_hidden ? <><EyeOff size={11} /> Hidden by Admin</> : <><Eye size={11} /> Visible</>}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 line-clamp-1">{s.tagline}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Founder: {s.founder_name || 'Founder'} ({s.founder_email || s.founder_id}) · Ask: ₹{typeof s.funding_ask === 'number' ? (s.funding_ask / 100000).toFixed(0) : '15'}L
                  </p>
                </div>
              </div>

              <div className="flex gap-2 shrink-0 self-end sm:self-center">
                {s.is_hidden ? (
                  <button
                    disabled={actingId === s.id}
                    onClick={() => handleUnhide(s.id, s.name)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Eye size={14} /> Unhide
                  </button>
                ) : (
                  <button
                    disabled={actingId === s.id}
                    onClick={() => handleHide(s.id, s.name)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    <EyeOff size={14} /> Hide
                  </button>
                )}

                <button
                  disabled={actingId === s.id}
                  onClick={() => handleDelete(s.id, s.name)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. Admin Reported Content (Resolve / Dismiss)
// -------------------------------------------------------------
export function AdminReportedContentView({
  onNotify,
}: {
  onNotify: (msg: string) => void;
}) {
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'dismissed' | ''>('pending');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const res = await apiClient.get<any[]>(`/admin/reports${query}`);
      if (res?.data) setReports(res.data);
    } catch (err: any) {
      console.warn('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (id: string) => {
    const note = window.prompt('Enter resolution note:', 'Issue reviewed and remediated with founder');
    if (!note) return;

    try {
      setActingId(id);
      await apiClient.post(`/admin/reports/${id}/resolve`, { resolution_notes: note });
      onNotify('Report resolved and recorded in audit log.');
      fetchReports();
    } catch (err: any) {
      onNotify(`Resolve failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    const note = window.prompt('Enter dismissal note:', 'No violation found upon verification');
    if (!note) return;

    try {
      setActingId(id);
      await apiClient.post(`/admin/reports/${id}/dismiss`, { resolution_notes: note });
      onNotify('Report dismissed and recorded in audit log.');
      fetchReports();
    } catch (err: any) {
      onNotify(`Dismiss failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-700">Trust & Safety</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Reported Content Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review user-submitted reports. Resolve valid reports with admin notes or dismiss false claims.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {(['pending', 'resolved', 'dismissed', ''] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              statusFilter === st
                ? 'bg-forest text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st || 'All Reports'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
            Loading reports...
          </div>
        ) : reports.length > 0 ? (
          reports.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <Inbox size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink text-base">
                        Reported {r.target_type}: {r.target_name || r.target_id}
                      </h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        r.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'dismissed'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-700 font-medium">
                      Reason: <span className="font-normal">{r.reason}</span>
                    </p>

                    {r.resolution_notes && (
                      <p className="mt-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                        Admin Note: {r.resolution_notes}
                      </p>
                    )}

                    <p className="mt-2 text-[11px] text-slate-400">
                      Reported by {r.reporter_name || 'Verified Member'} ({r.reporter_email || r.reporter_id}) · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {r.status === 'pending' ? (
                  <div className="flex gap-2 shrink-0 self-end sm:self-start">
                    <button
                      disabled={actingId === r.id}
                      onClick={() => handleResolve(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-forest/90 disabled:opacity-50"
                    >
                      <Check size={14} /> Resolve
                    </button>
                    <button
                      disabled={actingId === r.id}
                      onClick={() => handleDismiss(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X size={14} /> Dismiss
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Action completed</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
            <h3 className="mt-3 font-semibold text-ink">No Reported Content</h3>
            <p className="mt-1 text-sm text-slate-500">No open reports matching this filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
