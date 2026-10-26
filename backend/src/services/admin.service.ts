import { randomUUID } from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Profile, VerificationRequest, AuditLog } from '../db/types.js';
import type { Startup } from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import type {
  ListUsersQuery,
  UpdateUserStatusInput,
  ListVerificationsQuery,
  ReviewVerificationInput,
  ListAdminStartupsQuery,
  ListAuditLogsQuery,
} from '../schemas/admin.schema.js';
import { getProfile } from './profile.service.js';
import { config } from '../config.js';

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<AuditLog> {
  const auditLog: AuditLog = {
    id: randomUUID(),
    admin_id: adminId,
    actor_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || null,
    metadata: details || {},
    created_at: new Date().toISOString(),
  };

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      await query(
        `INSERT INTO public.audit_logs (id, actor_id, action, target_type, target_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          auditLog.id,
          auditLog.actor_id,
          auditLog.action,
          auditLog.target_type,
          auditLog.target_id,
          auditLog.metadata ? JSON.stringify(auditLog.metadata) : '{}',
          auditLog.created_at,
        ]
      );
    } catch {
      // Fallback in case actor_id / admin_id schema differs
    }
  } else {
    inMemoryDb.createAuditLog(auditLog);
  }

  return auditLog;
}

export async function listUsers(params: ListUsersQuery): Promise<{
  users: Profile[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.role) {
      conditions.push(`role = $${idx++}`);
      values.push(params.role);
    }
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.search) {
      conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx} OR organization ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM public.profiles ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * limit;
    values.push(limit, offset);
    const sql = `
      SELECT * FROM public.profiles
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const res = await query<Profile>(sql, values);
    const total_pages = Math.ceil(total / limit) || 1;

    return {
      users: res.rows,
      meta: { page, limit, total, total_pages },
    };
  }

  const { profiles, total } = inMemoryDb.listProfiles({
    page,
    limit,
    search: params.search,
    role: params.role,
    status: params.status,
  });

  const total_pages = Math.ceil(total / limit) || 1;

  return {
    users: profiles,
    meta: { page, limit, total, total_pages },
  };
}

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput, adminId?: string): Promise<Profile> {
  const current = await getProfile(userId);

  const updated: Profile = {
    ...current,
    status: input.status ?? current.status,
    role: input.role ?? current.role,
    verification_status: input.verification_status ?? current.verification_status,
    updated_at: new Date().toISOString(),
  };

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const sql = `
      UPDATE public.profiles SET
        status = $1,
        role = $2,
        verification_status = $3,
        updated_at = $4
      WHERE id = $5
      RETURNING *;
    `;
    const res = await query<Profile>(sql, [
      updated.status,
      updated.role,
      updated.verification_status,
      updated.updated_at,
      userId,
    ]);
    if (adminId && input.status) {
      await logAdminAction(adminId, input.status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', 'user', userId, {
        reason: input.reason || 'Status updated by admin',
      });
    }
    return res.rows[0];
  }

  const saved = inMemoryDb.saveProfile(updated);
  if (adminId && input.status) {
    await logAdminAction(adminId, input.status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', 'user', userId, {
      reason: input.reason || 'Status updated by admin',
    });
  }
  return saved;
}

export async function suspendUser(userId: string, adminId: string, reason?: string): Promise<Profile> {
  const current = await getProfile(userId);
  if (!current) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const suspendReason = reason || 'Suspended by platform administrator';
  const updated = await updateUserStatus(userId, { status: 'suspended', reason: suspendReason }, adminId);
  return updated;
}

export async function reactivateUser(userId: string, adminId: string, reason?: string): Promise<Profile> {
  const current = await getProfile(userId);
  if (!current) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const reactivateReason = reason || 'Reactivated by platform administrator';
  const updated = await updateUserStatus(userId, { status: 'active', reason: reactivateReason }, adminId);
  return updated;
}

export async function listAdminStartups(params: ListAdminStartupsQuery): Promise<{
  startups: any[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.status === 'visible') {
      conditions.push(`s.is_hidden = false`);
    } else if (params.status === 'hidden') {
      conditions.push(`s.is_hidden = true`);
    }

    if (params.sector && params.sector !== 'All sectors') {
      conditions.push(`(s.sector ILIKE $${idx} OR $${idx} = ANY(s.sectors))`);
      values.push(params.sector);
      idx++;
    }

    if (params.search) {
      conditions.push(`(s.name ILIKE $${idx} OR s.tagline ILIKE $${idx} OR s.description ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM public.startups s ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const sql = `
      SELECT s.*, p.full_name as founder_name, p.email as founder_email
      FROM public.startups s
      LEFT JOIN public.profiles p ON s.founder_id = p.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const res = await query<any>(sql, values);
    const total_pages = Math.ceil(total / limit) || 1;

    return {
      startups: res.rows,
      meta: { page, limit, total, total_pages },
    };
  }

  const { startups, total } = inMemoryDb.listAdminStartups({
    search: params.search,
    status: params.status,
    sector: params.sector,
    page,
    limit,
  });
  const total_pages = Math.ceil(total / limit) || 1;

  return {
    startups,
    meta: { page, limit, total, total_pages },
  };
}

export async function hideStartup(startupId: string, adminId: string, reason?: string): Promise<Startup> {
  const startup = inMemoryDb.getStartupById(startupId);
  if (!startup) {
    throw new AppError('Startup not found', 404, 'NOT_FOUND');
  }

  const hideReason = reason || 'Hidden by platform administrator';

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Startup>(
      `UPDATE public.startups SET is_hidden = true, updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [startupId]
    );
    await logAdminAction(adminId, 'STARTUP_HIDDEN', 'startup', startupId, { reason: hideReason });
    return res.rows[0];
  }

  const updated = inMemoryDb.hideStartup(startupId, true);
  await logAdminAction(adminId, 'STARTUP_HIDDEN', 'startup', startupId, { reason: hideReason });
  return updated!;
}

export async function unhideStartup(startupId: string, adminId: string): Promise<Startup> {
  const startup = inMemoryDb.getStartupById(startupId);
  if (!startup) {
    throw new AppError('Startup not found', 404, 'NOT_FOUND');
  }

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Startup>(
      `UPDATE public.startups SET is_hidden = false, updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [startupId]
    );
    await logAdminAction(adminId, 'STARTUP_UNHIDDEN', 'startup', startupId);
    return res.rows[0];
  }

  const updated = inMemoryDb.hideStartup(startupId, false);
  await logAdminAction(adminId, 'STARTUP_UNHIDDEN', 'startup', startupId);
  return updated!;
}

export async function deleteStartupByAdmin(startupId: string, adminId: string): Promise<boolean> {
  const startup = inMemoryDb.getStartupById(startupId);
  if (!startup) {
    throw new AppError('Startup not found', 404, 'NOT_FOUND');
  }

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    await query(`DELETE FROM public.startups WHERE id = $1`, [startupId]);
    await logAdminAction(adminId, 'STARTUP_DELETED', 'startup', startupId);
    return true;
  }

  const deleted = inMemoryDb.deleteStartup(startupId);
  await logAdminAction(adminId, 'STARTUP_DELETED', 'startup', startupId);
  return deleted;
}

export async function getAdminStats(): Promise<{
  users_by_role: { founder: number; investor: number; mentor: number; incubator: number; admin: number };
  total_users: number;
  startups_listed: number;
  pending_verifications: number;
  open_reports: number;
  requests_last_30_days: number;
}> {
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const rolesRes = await query<{ role: string; count: string }>(
      `SELECT role, COUNT(*) FROM public.profiles GROUP BY role;`
    );
    const users_by_role = { founder: 0, investor: 0, mentor: 0, incubator: 0, admin: 0 };
    let total_users = 0;
    for (const r of rolesRes.rows) {
      const c = parseInt(r.count, 10);
      total_users += c;
      if (r.role in users_by_role) {
        users_by_role[r.role as keyof typeof users_by_role] = c;
      }
    }

    const startupsRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM public.startups WHERE is_hidden = false;`
    );
    const startups_listed = parseInt(startupsRes.rows[0]?.count || '0', 10);

    const verifRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM public.verification_requests WHERE status = 'pending';`
    );
    const pending_verifications = parseInt(verifRes.rows[0]?.count || '0', 10);

    const reportsRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM public.reports WHERE status = 'pending';`
    );
    const open_reports = parseInt(reportsRes.rows[0]?.count || '0', 10);

    const thirtyDaysRes = await query<{ count: string }>(
      `SELECT (
        (SELECT COUNT(*) FROM public.pitch_requests WHERE created_at >= NOW() - INTERVAL '30 days') +
        (SELECT COUNT(*) FROM public.mentorship_requests WHERE created_at >= NOW() - INTERVAL '30 days') +
        (SELECT COUNT(*) FROM public.connections WHERE created_at >= NOW() - INTERVAL '30 days') +
        (SELECT COUNT(*) FROM public.applications WHERE created_at >= NOW() - INTERVAL '30 days') +
        (SELECT COUNT(*) FROM public.document_access_requests WHERE created_at >= NOW() - INTERVAL '30 days')
       ) as count;`
    );
    const requests_last_30_days = parseInt(thirtyDaysRes.rows[0]?.count || '0', 10);

    return {
      users_by_role,
      total_users,
      startups_listed,
      pending_verifications,
      open_reports,
      requests_last_30_days,
    };
  }

  return inMemoryDb.getAdminStats();
}

export async function listAuditLogs(params: ListAuditLogsQuery): Promise<{
  logs: any[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.action) {
      conditions.push(`a.action ILIKE $${idx++}`);
      values.push(`%${params.action}%`);
    }
    if (params.target_type) {
      conditions.push(`a.target_type = $${idx++}`);
      values.push(params.target_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM public.audit_logs a ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const sql = `
      SELECT a.*, p.full_name as actor_name, p.email as actor_email
      FROM public.audit_logs a
      LEFT JOIN public.profiles p ON a.actor_id = p.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const res = await query<any>(sql, values);
    const total_pages = Math.ceil(total / limit) || 1;

    return {
      logs: res.rows,
      meta: { page, limit, total, total_pages },
    };
  }

  const { logs, total } = inMemoryDb.listAuditLogsFiltered({
    action: params.action,
    target_type: params.target_type,
    page,
    limit,
  });
  const total_pages = Math.ceil(total / limit) || 1;

  return {
    logs,
    meta: { page, limit, total, total_pages },
  };
}

export async function listVerificationRequests(params: ListVerificationsQuery): Promise<{
  requests: VerificationRequest[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`vr.status = $${idx++}`);
      values.push(params.status);
    }
    if (params.role) {
      conditions.push(`(vr.role_requested = $${idx} OR p.role = $${idx})`);
      values.push(params.role);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM public.verification_requests vr
       LEFT JOIN public.profiles p ON vr.user_id = p.id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * limit;
    values.push(limit, offset);
    const sql = `
      SELECT vr.* FROM public.verification_requests vr
      LEFT JOIN public.profiles p ON vr.user_id = p.id
      ${whereClause}
      ORDER BY vr.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const res = await query<VerificationRequest>(sql, values);
    const total_pages = Math.ceil(total / limit) || 1;

    return {
      requests: res.rows,
      meta: { page, limit, total, total_pages },
    };
  }

  const { requests, total } = inMemoryDb.listVerificationRequests({
    page,
    limit,
    status: params.status,
    role: params.role,
  });

  const total_pages = Math.ceil(total / limit) || 1;

  return {
    requests,
    meta: { page, limit, total, total_pages },
  };
}

export async function approveVerification(
  requestId: string,
  adminId: string,
  notes?: string
): Promise<{ request: VerificationRequest; user: Profile }> {
  let reqItem: VerificationRequest | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<VerificationRequest>(
      'SELECT * FROM public.verification_requests WHERE id = $1 LIMIT 1',
      [requestId]
    );
    if (res.rows.length > 0) reqItem = res.rows[0];
  } else {
    reqItem = inMemoryDb.getVerificationRequestById(requestId);
  }

  if (!reqItem) {
    throw new AppError('Verification request not found', 404, 'NOT_FOUND');
  }

  const now = new Date().toISOString();
  const updatedReq: VerificationRequest = {
    ...reqItem,
    status: 'verified',
    reviewed_by: adminId,
    reviewed_at: now,
    admin_notes: notes ?? null,
    updated_at: now,
  };

  const updatedUser = await updateUserStatus(reqItem.user_id, {
    verification_status: 'verified',
  });

  let savedReq: VerificationRequest;
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const sql = `
      UPDATE public.verification_requests SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = $3,
        admin_notes = $4,
        updated_at = $5
      WHERE id = $6
      RETURNING *;
    `;
    const res = await query<VerificationRequest>(sql, [
      updatedReq.status,
      updatedReq.reviewed_by,
      updatedReq.reviewed_at,
      updatedReq.admin_notes,
      updatedReq.updated_at,
      requestId,
    ]);
    savedReq = res.rows[0];
  } else {
    savedReq = inMemoryDb.updateVerificationRequest(updatedReq);
  }

  await logAdminAction(adminId, 'VERIFICATION_APPROVED', 'verification_request', requestId, {
    user_id: reqItem.user_id,
    role_requested: reqItem.role_requested,
    notes,
  });

  return { request: savedReq, user: updatedUser };
}

export async function rejectVerification(
  requestId: string,
  adminId: string,
  reason: string
): Promise<{ request: VerificationRequest; user: Profile }> {
  let reqItem: VerificationRequest | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<VerificationRequest>(
      'SELECT * FROM public.verification_requests WHERE id = $1 LIMIT 1',
      [requestId]
    );
    if (res.rows.length > 0) reqItem = res.rows[0];
  } else {
    reqItem = inMemoryDb.getVerificationRequestById(requestId);
  }

  if (!reqItem) {
    throw new AppError('Verification request not found', 404, 'NOT_FOUND');
  }

  const now = new Date().toISOString();
  const updatedReq: VerificationRequest = {
    ...reqItem,
    status: 'rejected',
    reviewed_by: adminId,
    reviewed_at: now,
    admin_notes: reason,
    updated_at: now,
  };

  const updatedUser = await updateUserStatus(reqItem.user_id, {
    verification_status: 'rejected',
  });

  let savedReq: VerificationRequest;
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const sql = `
      UPDATE public.verification_requests SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = $3,
        admin_notes = $4,
        updated_at = $5
      WHERE id = $6
      RETURNING *;
    `;
    const res = await query<VerificationRequest>(sql, [
      updatedReq.status,
      updatedReq.reviewed_by,
      updatedReq.reviewed_at,
      updatedReq.admin_notes,
      updatedReq.updated_at,
      requestId,
    ]);
    savedReq = res.rows[0];
  } else {
    savedReq = inMemoryDb.updateVerificationRequest(updatedReq);
  }

  await logAdminAction(adminId, 'VERIFICATION_REJECTED', 'verification_request', requestId, {
    user_id: reqItem.user_id,
    role_requested: reqItem.role_requested,
    reason,
  });

  return { request: savedReq, user: updatedUser };
}

export async function reviewVerification(
  requestId: string,
  adminId: string,
  input: ReviewVerificationInput
): Promise<{ request: VerificationRequest; user: Profile }> {
  if (input.status === 'verified') {
    return approveVerification(requestId, adminId, input.admin_notes || undefined);
  } else {
    return rejectVerification(requestId, adminId, input.admin_notes || 'Application rejected by administrator');
  }
}
