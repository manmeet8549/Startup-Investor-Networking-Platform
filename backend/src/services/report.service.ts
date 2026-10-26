import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Report } from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import { config } from '../config.js';
import { logAdminAction } from './admin.service.js';
import type {
  CreateReportInput,
  ListReportsQuery,
  ReviewReportInput,
} from '../schemas/admin.schema.js';

export async function createReport(
  reporterId: string,
  input: CreateReportInput
): Promise<Report> {
  const now = new Date().toISOString();
  const report: Report = {
    id: crypto.randomUUID(),
    reporter_id: reporterId,
    target_type: input.target_type,
    target_id: input.target_id,
    reason: input.reason + (input.details ? ` - Details: ${input.details}` : ''),
    status: 'pending',
    reviewed_by: null,
    resolution_notes: null,
    created_at: now,
    updated_at: now,
  };

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const sql = `
      INSERT INTO public.reports (id, reporter_id, target_type, target_id, reason, status, reviewed_by, resolution_notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const res = await query<Report>(sql, [
      report.id,
      report.reporter_id,
      report.target_type,
      report.target_id,
      report.reason,
      report.status,
      report.reviewed_by,
      report.resolution_notes,
      report.created_at,
      report.updated_at,
    ]);
    return res.rows[0];
  }

  return inMemoryDb.createReport(report);
}

export async function listReports(params: ListReportsQuery): Promise<{
  reports: any[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`r.status = $${idx++}`);
      values.push(params.status);
    }
    if (params.target_type) {
      conditions.push(`r.target_type = $${idx++}`);
      values.push(params.target_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM public.reports r ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const sql = `
      SELECT r.*, p.full_name as reporter_name, p.email as reporter_email
      FROM public.reports r
      LEFT JOIN public.profiles p ON r.reporter_id = p.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const res = await query<any>(sql, values);
    const total_pages = Math.ceil(total / limit) || 1;

    return {
      reports: res.rows,
      meta: { page, limit, total, total_pages },
    };
  }

  const { reports, total } = inMemoryDb.listReports({
    status: params.status,
    target_type: params.target_type,
    page,
    limit,
  });
  const total_pages = Math.ceil(total / limit) || 1;

  return {
    reports,
    meta: { page, limit, total, total_pages },
  };
}

export async function resolveReport(
  reportId: string,
  adminId: string,
  note?: string
): Promise<Report> {
  let existing: Report | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Report>('SELECT * FROM public.reports WHERE id = $1 LIMIT 1', [reportId]);
    if (res.rows.length > 0) existing = res.rows[0];
  } else {
    existing = inMemoryDb.getReportById(reportId);
  }

  if (!existing) {
    throw new AppError('Report not found', 404, 'NOT_FOUND');
  }

  const now = new Date().toISOString();
  const resolutionNote = note || 'Resolved by administrator';

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const sql = `
      UPDATE public.reports SET
        status = 'resolved',
        reviewed_by = $1,
        resolution_notes = $2,
        updated_at = $3
      WHERE id = $4
      RETURNING *;
    `;
    const res = await query<Report>(sql, [adminId, resolutionNote, now, reportId]);
    await logAdminAction(adminId, 'REPORT_RESOLVED', 'report', reportId, { resolution_notes: resolutionNote });
    return res.rows[0];
  }

  const updated = inMemoryDb.updateReport(reportId, {
    status: 'resolved' as any,
    reviewed_by: adminId,
    resolution_notes: resolutionNote,
  });

  await logAdminAction(adminId, 'REPORT_RESOLVED', 'report', reportId, { resolution_notes: resolutionNote });
  return updated!;
}

export async function dismissReport(
  reportId: string,
  adminId: string,
  note?: string
): Promise<Report> {
  let existing: Report | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Report>('SELECT * FROM public.reports WHERE id = $1 LIMIT 1', [reportId]);
    if (res.rows.length > 0) existing = res.rows[0];
  } else {
    existing = inMemoryDb.getReportById(reportId);
  }

  if (!existing) {
    throw new AppError('Report not found', 404, 'NOT_FOUND');
  }

  const now = new Date().toISOString();
  const dismissalNote = note || 'Dismissed by administrator';

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const sql = `
      UPDATE public.reports SET
        status = 'dismissed',
        reviewed_by = $1,
        resolution_notes = $2,
        updated_at = $3
      WHERE id = $4
      RETURNING *;
    `;
    const res = await query<Report>(sql, [adminId, dismissalNote, now, reportId]);
    await logAdminAction(adminId, 'REPORT_DISMISSED', 'report', reportId, { resolution_notes: dismissalNote });
    return res.rows[0];
  }

  const updated = inMemoryDb.updateReport(reportId, {
    status: 'dismissed' as any,
    reviewed_by: adminId,
    resolution_notes: dismissalNote,
  });

  await logAdminAction(adminId, 'REPORT_DISMISSED', 'report', reportId, { resolution_notes: dismissalNote });
  return updated!;
}

export async function reviewReport(
  reportId: string,
  adminId: string,
  input: ReviewReportInput
): Promise<Report> {
  const note = input.resolution_notes || input.note || undefined;
  if (input.status === 'dismissed') {
    return dismissReport(reportId, adminId, note);
  }
  return resolveReport(reportId, adminId, note);
}
