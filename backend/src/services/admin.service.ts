import { randomUUID } from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Profile, VerificationRequest, AuditLog } from '../db/types.js';
import { AppError } from '../middleware/error.middleware.js';
import type {
  ListUsersQuery,
  UpdateUserStatusInput,
  ListVerificationsQuery,
  ReviewVerificationInput,
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
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || null,
    created_at: new Date().toISOString(),
  };

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    await query(
      `INSERT INTO public.audit_logs (id, admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditLog.id,
        auditLog.admin_id,
        auditLog.action,
        auditLog.target_type,
        auditLog.target_id,
        auditLog.details ? JSON.stringify(auditLog.details) : null,
        auditLog.created_at,
      ]
    );
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

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput): Promise<Profile> {
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
    return res.rows[0];
  }

  return inMemoryDb.saveProfile(updated);
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
