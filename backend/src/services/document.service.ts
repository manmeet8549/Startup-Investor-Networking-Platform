import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import { supabaseAdmin } from '../db/supabase.js';
import type { Document, DocumentAccessRequest, Visibility } from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import { notify } from './notification.service.js';
import { getStartupById } from './startup.service.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const STORAGE_BUCKET = 'startup-documents';
const SIGNED_URL_TTL_SECONDS = 60; // 60 seconds TTL

export interface UploadDocumentOptions {
  title?: string;
  visibility?: Visibility;
}

/**
 * Uploads a PDF document to private storage and tracks versioning.
 * Strictly PDF only, max 10 MB.
 */
export async function uploadDocument(
  startupId: string,
  uploader: { id: string; role: string },
  file: Express.Multer.File,
  options: UploadDocumentOptions = {}
): Promise<Document> {
  // 1. Verify startup exists and user is owner or admin
  const startup = await getStartupById(startupId, uploader);
  if (startup.founder_id !== uploader.id && uploader.role !== 'admin') {
    throw new AppError('Only the startup owner or admin can upload documents', 403, 'FORBIDDEN');
  }

  // 2. Validate PDF format
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExtension = (file.originalname || '').toLowerCase().endsWith('.pdf');
  if (!isPdfMime || !isPdfExtension) {
    throw new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE');
  }

  // 3. Validate file size (10 MB maximum)
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError('File size exceeds 10MB limit', 400, 'FILE_TOO_LARGE');
  }

  // 4. Versioning: increment version for this startup
  const existingDocs = inMemoryDb.listDocumentsByStartup(startupId);
  const maxVersion = existingDocs.length > 0
    ? Math.max(...existingDocs.map((d) => d.version || 1))
    : 0;
  const version = maxVersion + 1;

  const docId = crypto.randomUUID();
  const title = options.title?.trim() || file.originalname || `Pitch Deck v${version}.pdf`;
  const visibility: Visibility = options.visibility || 'access_controlled';
  const sanitizedFileName = (file.originalname || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `startups/${startupId}/documents/v${version}_${Date.now()}_${sanitizedFileName}`;
  const now = new Date().toISOString();

  // 5. Upload to Supabase Storage if remote connection is live
  if (!config.USE_IN_MEMORY_DB) {
    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        logger.warn({ uploadError }, 'Supabase storage upload note, proceeding with tracked path');
      }
    } catch (err) {
      logger.error({ err }, 'Error during storage upload, proceeding with local path tracking');
    }
  }

  const document: Document = {
    id: docId,
    startup_id: startupId,
    uploader_id: uploader.id,
    title,
    file_path: filePath,
    file_type: 'application/pdf',
    file_size: file.size,
    version,
    visibility,
    created_at: now,
    updated_at: now,
  };

  if (!config.USE_IN_MEMORY_DB) {
    const res = await query<Document>(
      `INSERT INTO public.documents
        (id, startup_id, uploader_id, title, file_path, file_type, file_size, version, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        document.id,
        document.startup_id,
        document.uploader_id,
        document.title,
        document.file_path,
        document.file_type,
        document.file_size,
        document.version,
        document.visibility,
        document.created_at,
        document.updated_at,
      ]
    );
    return res.rows[0];
  }

  inMemoryDb.createDocument(document);
  return document;
}

/**
 * List documents for a startup adhering to visibility rules.
 */
export async function listDocuments(
  startupId: string,
  user?: { id: string; role: string; verification_status?: string }
): Promise<Document[]> {
  const startup = await getStartupById(startupId, user);

  let docs: Document[] = [];
  if (!config.USE_IN_MEMORY_DB) {
    const res = await query<Document>(
      'SELECT * FROM public.documents WHERE startup_id = $1 ORDER BY version DESC, created_at DESC',
      [startupId]
    );
    docs = res.rows;
  } else {
    docs = inMemoryDb.listDocumentsByStartup(startupId).sort((a, b) => b.version - a.version);
  }

  const isOwnerOrAdmin = user && (user.id === startup.founder_id || user.role === 'admin');

  // Filter based on visibility:
  // - Owner and admin see everything
  // - Other authenticated users see public and access_controlled documents
  // - Private documents are completely hidden from non-owners
  return docs.filter((d) => {
    if (isOwnerOrAdmin) return true;
    return d.visibility === 'public' || d.visibility === 'access_controlled';
  });
}

/**
 * Delete a document. Only owner or admin can delete.
 */
export async function deleteDocument(
  documentId: string,
  user: { id: string; role: string }
): Promise<void> {
  let doc = inMemoryDb.getDocumentById(documentId);

  if (!doc && !config.USE_IN_MEMORY_DB) {
    const res = await query<Document>('SELECT * FROM public.documents WHERE id = $1 LIMIT 1', [documentId]);
    if (res.rows.length > 0) {
      doc = res.rows[0];
    }
  }

  if (!doc) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }

  const startup = await getStartupById(doc.startup_id, user);
  if (startup.founder_id !== user.id && user.role !== 'admin') {
    throw new AppError('Only the startup owner or admin can delete documents', 403, 'FORBIDDEN');
  }

  if (!config.USE_IN_MEMORY_DB) {
    try {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([doc.file_path]);
    } catch (err) {
      logger.error({ err }, 'Error deleting file from Supabase storage');
    }
  }

  if (!config.USE_IN_MEMORY_DB) {
    await query('DELETE FROM public.documents WHERE id = $1', [documentId]);
    return;
  }
  inMemoryDb.deleteDocument(documentId);
}

/**
 * Request access to an access_controlled document.
 */
export async function requestDocumentAccess(
  documentId: string,
  requester: { id: string; role: string; full_name?: string; verification_status?: string },
  notes?: string | null
): Promise<DocumentAccessRequest> {
  let doc = inMemoryDb.getDocumentById(documentId);

  if (!doc && !config.USE_IN_MEMORY_DB) {
    const res = await query<Document>('SELECT * FROM public.documents WHERE id = $1 LIMIT 1', [documentId]);
    if (res.rows.length > 0) {
      doc = res.rows[0];
    }
  }

  if (!doc) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }

  if (doc.visibility === 'private') {
    throw new AppError('Access requests cannot be made for private documents', 403, 'FORBIDDEN');
  }

  const startup = await getStartupById(doc.startup_id, requester);

  // Check if existing request already exists
  const existing = inMemoryDb.findDocumentAccessRequest(documentId, requester.id);
  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError('An access request is already pending for this document', 409, 'CONFLICT');
    }
    if (existing.status === 'approved') {
      return existing;
    }
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  const accessRequest: DocumentAccessRequest = {
    id: requestId,
    document_id: documentId,
    requester_id: requester.id,
    startup_id: doc.startup_id,
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    notes: notes || null,
    created_at: now,
    updated_at: now,
  };

  inMemoryDb.createDocumentAccessRequest(accessRequest);

  // Notify founder
  await notify(
    startup.founder_id,
    'document_access_request',
    {
      requestId,
      documentId,
      startupId: startup.id,
      requesterId: requester.id,
      documentTitle: doc.title,
    },
    'New Deck Access Request',
    `${requester.full_name || 'A verified user'} requested access to pitch deck: ${doc.title}`
  );

  return accessRequest;
}

/**
 * Founder lists access requests for their startup.
 */
export async function listStartupAccessRequests(
  startupId: string,
  user: { id: string; role: string }
): Promise<DocumentAccessRequest[]> {
  const startup = await getStartupById(startupId, user);
  if (startup.founder_id !== user.id && user.role !== 'admin') {
    throw new AppError('Only the startup owner or admin can view access requests', 403, 'FORBIDDEN');
  }

  return inMemoryDb.listDocumentAccessRequestsByStartup(startupId);
}

/**
 * Founder approves or declines an access request.
 */
export async function reviewDocumentAccessRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewer: { id: string; role: string },
  notes?: string | null
): Promise<DocumentAccessRequest> {
  const req = inMemoryDb.getDocumentAccessRequestById(requestId);
  if (!req) {
    throw new AppError('Document access request not found', 404, 'NOT_FOUND');
  }

  const startup = await getStartupById(req.startup_id, reviewer);
  if (startup.founder_id !== reviewer.id && reviewer.role !== 'admin') {
    throw new AppError('Only the startup owner or admin can review access requests', 403, 'FORBIDDEN');
  }

  const doc = inMemoryDb.getDocumentById(req.document_id);
  const docTitle = doc?.title || 'Pitch Deck';

  const updated = inMemoryDb.updateDocumentAccessRequest(requestId, {
    status: decision,
    reviewed_by: reviewer.id,
    reviewed_at: new Date().toISOString(),
    notes: notes || req.notes,
  });

  if (!updated) {
    throw new AppError('Failed to update access request', 500, 'INTERNAL_ERROR');
  }

  // Trigger notification to requester
  if (decision === 'approved') {
    await notify(
      req.requester_id,
      'document_access_approved',
      {
        requestId,
        documentId: req.document_id,
        startupId: req.startup_id,
        decision,
      },
      'Deck Access Approved',
      `Your request to view the pitch deck for ${startup.name} (${docTitle}) has been approved!`
    );
  } else {
    await notify(
      req.requester_id,
      'document_access_declined',
      {
        requestId,
        documentId: req.document_id,
        startupId: req.startup_id,
        decision,
      },
      'Deck Access Declined',
      `Your request to view the pitch deck for ${startup.name} was declined.`
    );
  }

  return updated;
}

/**
 * Returns a 60-second signed URL for downloading a document, strictly following visibility and access rules.
 */
export async function getDocumentDownloadUrl(
  documentId: string,
  user: { id: string; role: string; verification_status?: string }
): Promise<{ download_url: string; expires_in: number }> {
  let doc = inMemoryDb.getDocumentById(documentId);

  if (!doc && !config.USE_IN_MEMORY_DB) {
    const res = await query<Document>('SELECT * FROM public.documents WHERE id = $1 LIMIT 1', [documentId]);
    if (res.rows.length > 0) {
      doc = res.rows[0];
    }
  }

  if (!doc) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }

  const startup = await getStartupById(doc.startup_id, user);
  const isOwnerOrAdmin = user.id === startup.founder_id || user.role === 'admin';

  // Visibility Check 1: Private
  if (doc.visibility === 'private') {
    if (!isOwnerOrAdmin) {
      throw new AppError('Access forbidden: this document is private to the owner', 403, 'FORBIDDEN');
    }
  }

  // Visibility Check 2: Public (Any verified user can view/download)
  if (doc.visibility === 'public') {
    if (!isOwnerOrAdmin && user.verification_status !== 'verified') {
      throw new AppError(
        'Your account is pending admin verification. Access is restricted until approved.',
        403,
        'UNVERIFIED_ACCOUNT'
      );
    }
  }

  // Visibility Check 3: Access Controlled (Needs approved request)
  if (doc.visibility === 'access_controlled') {
    if (!isOwnerOrAdmin) {
      const accessReq = inMemoryDb.findDocumentAccessRequest(documentId, user.id);

      if (!accessReq) {
        throw new AppError(
          'Access forbidden: an approved access request is required to download this document',
          403,
          'FORBIDDEN'
        );
      }

      if (accessReq.status === 'pending') {
        throw new AppError(
          'Access forbidden: your access request is pending approval by the founder',
          403,
          'FORBIDDEN'
        );
      }

      if (accessReq.status === 'rejected') {
        throw new AppError(
          'Access forbidden: your access request was declined by the founder',
          403,
          'FORBIDDEN'
        );
      }
    }
  }

  // Generate signed URL valid for 60 seconds
  const expiresIn = SIGNED_URL_TTL_SECONDS;

  if (!config.USE_IN_MEMORY_DB) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(doc.file_path, expiresIn);

      if (data?.signedUrl) {
        return {
          download_url: data.signedUrl,
          expires_in: expiresIn,
        };
      }
    } catch (err) {
      logger.error({ err }, 'Failed to generate signed URL via Supabase Admin');
    }
  }

  // Test / Offline deterministic HMAC signed URL
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const token = crypto
    .createHmac('sha256', config.SUPABASE_JWT_SECRET)
    .update(`${doc.file_path}:${expiresAt}:${user.id}`)
    .digest('hex');

  const hostname = config.SUPABASE_URL.replace(/^https?:\/\//, '');
  const downloadUrl = `https://${hostname}/storage/v1/object/sign/${STORAGE_BUCKET}/${doc.file_path}?token=${token}&expires=${expiresAt}`;

  return {
    download_url: downloadUrl,
    expires_in: expiresIn,
  };
}
