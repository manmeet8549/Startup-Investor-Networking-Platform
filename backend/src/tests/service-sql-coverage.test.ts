import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as db from '../db/index.js';
import { config } from '../config.js';
import * as adminService from '../services/admin.service.js';
import * as reportService from '../services/report.service.js';
import * as startupService from '../services/startup.service.js';
import * as documentService from '../services/document.service.js';
import * as notificationService from '../services/notification.service.js';
import * as profileService from '../services/profile.service.js';

describe('Iteration 10: Service SQL Branch Coverage', () => {
  let origNodeEnv: string;
  let origDbUrl: string | undefined;

  beforeEach(() => {
    origNodeEnv = config.NODE_ENV;
    origDbUrl = config.DATABASE_URL;
    (config as any).NODE_ENV = 'production';
    (config as any).DATABASE_URL = 'postgresql://mock:5432/test';
  });

  afterEach(() => {
    (config as any).NODE_ENV = origNodeEnv;
    (config as any).DATABASE_URL = origDbUrl;
    vi.restoreAllMocks();
  });

  describe('Report Service SQL Branches', () => {
    const mockReport = {
      id: 'rep-1',
      reporter_id: 'usr-1',
      target_type: 'startup' as const,
      target_id: 's-1',
      reason: 'Spam listing',
      status: 'pending' as const,
      reviewed_by: null,
      resolution_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('exercises createReport, listReports, and resolve/dismiss SQL paths', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }] as any, rowCount: 1 };
        }
        return { rows: [mockReport] as any, rowCount: 1 };
      });

      const created = await reportService.createReport('usr-1', {
        target_type: 'startup',
        target_id: 's-1',
        reason: 'Spam listing',
        details: 'Duplicate account',
      });
      expect(created.id).toBe('rep-1');

      const list = await reportService.listReports({ page: 1, limit: 10, status: 'pending' });
      expect(list.reports.length).toBe(1);

      const resolved = await reportService.resolveReport('rep-1', 'admin-1', 'Resolved');
      expect(resolved.id).toBe('rep-1');

      const dismissed = await reportService.dismissReport('rep-1', 'admin-1', 'Dismissed');
      expect(dismissed.id).toBe('rep-1');

      const reviewed = await reportService.reviewReport('rep-1', 'admin-1', {
        status: 'reviewed',
        note: 'Under review',
      });
      expect(reviewed.id).toBe('rep-1');
    });
  });

  describe('Admin Service SQL Branches', () => {
    const mockProfile = {
      id: 'usr-1',
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'founder' as const,
      is_student: false,
      organization: null,
      avatar_url: null,
      bio: null,
      location: null,
      website: null,
      status: 'active' as const,
      verification_status: 'verified' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockStartup = {
      id: 's-1',
      founder_id: 'usr-1',
      name: 'Test Startup',
      tagline: 'Tagline',
      description: null,
      logo: null,
      sectors: ['AgriTech'],
      stage: 'mvp' as const,
      location: 'Chandigarh',
      funding_ask: 100000,
      currency: 'INR',
      visibility: 'public' as const,
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('exercises suspendUser, reactivateUser, listAdminStartups, hideStartup, unhideStartup SQL paths', async () => {
      // Seed in-memory maps so lookup succeeds
      db.inMemoryDb.profiles.set(mockProfile.id, mockProfile);
      db.inMemoryDb.startups.set(mockStartup.id, mockStartup as any);

      vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }] as any, rowCount: 1 };
        }
        if (text.includes('startups')) {
          return { rows: [mockStartup] as any, rowCount: 1 };
        }
        return { rows: [mockProfile] as any, rowCount: 1 };
      });

      const suspended = await adminService.suspendUser('usr-1', 'admin-1', 'Violation of rules');
      expect(suspended.id).toBe('usr-1');

      const reactivated = await adminService.reactivateUser('usr-1', 'admin-1', 'Restored');
      expect(reactivated.id).toBe('usr-1');

      const startups = await adminService.listAdminStartups({
        page: 1,
        limit: 10,
        status: 'all',
      });
      expect(startups.startups.length).toBe(1);

      const hidden = await adminService.hideStartup('s-1', 'admin-1', 'Copyright notice');
      expect(hidden.id).toBe('s-1');

      const unhidden = await adminService.unhideStartup('s-1', 'admin-1');
      expect(unhidden.id).toBe('s-1');
    });

    it('exercises getAdminStats and listAuditLogs SQL paths', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
        if (text.includes('GROUP BY role')) {
          return { rows: [{ role: 'founder', count: '5' }] as any, rowCount: 1 };
        }
        if (text.includes('COUNT(*)')) {
          return { rows: [{ count: '5' }] as any, rowCount: 1 };
        }
        return {
          rows: [
            {
              id: 'audit-1',
              admin_id: 'admin-1',
              action: 'user_suspended',
              target_type: 'user',
              target_id: 'usr-1',
              details: {},
              created_at: new Date().toISOString(),
            },
          ] as any,
          rowCount: 1,
        };
      });

      const stats = await adminService.getAdminStats();
      expect(stats.total_users).toBeGreaterThanOrEqual(1);

      const logs = await adminService.listAuditLogs({ page: 1, limit: 10 });
      expect(logs.logs.length).toBe(1);
    });

    it('exercises listUsers, listVerificationRequests, approveVerification, and rejectVerification SQL paths', async () => {
      const mockVerifReq = {
        id: 'vr-1',
        user_id: 'usr-1',
        role_requested: 'investor' as const,
        organization: 'Org',
        supporting_notes: 'Notes',
        status: 'pending' as const,
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.inMemoryDb.verificationRequests.set('vr-1', mockVerifReq as any);
      db.inMemoryDb.profiles.set('usr-1', mockProfile);

      vi.spyOn(db, 'query').mockImplementation(async (text: string, params?: any[]) => {
        if (text.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }] as any, rowCount: 1 };
        }
        if (text.includes('verification_requests')) {
          return { rows: [mockVerifReq] as any, rowCount: 1 };
        }
        if (text.includes('UPDATE public.profiles')) {
          const vStatus = params?.[2] || 'verified';
          return { rows: [{ ...mockProfile, verification_status: vStatus }] as any, rowCount: 1 };
        }
        return { rows: [mockProfile] as any, rowCount: 1 };
      });

      const users = await adminService.listUsers({ page: 1, limit: 10, role: 'founder' });
      expect(users.users.length).toBe(1);

      const vReqs = await adminService.listVerificationRequests({ page: 1, limit: 10, status: 'pending' });
      expect(vReqs.requests.length).toBe(1);

      const approved = await adminService.approveVerification('vr-1', 'admin-1', 'SEBI verified');
      expect(approved.user.verification_status).toBe('verified');

      const rejected = await adminService.rejectVerification('vr-1', 'admin-1', 'Incomplete data');
      expect(rejected.user.verification_status).toBe('rejected');
    });
  });

  describe('Startup and Document Service SQL Branches', () => {
    const mockStartup = {
      id: 's-1',
      founder_id: 'usr-1',
      name: 'Test Startup',
      tagline: 'Tagline',
      description: null,
      logo: null,
      sectors: ['AgriTech'],
      sector: 'AgriTech',
      stage: 'mvp' as const,
      location: 'Chandigarh',
      funding_ask: 100000,
      currency: 'INR',
      visibility: 'public' as const,
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockDoc = {
      id: 'doc-1',
      startup_id: 's-1',
      title: 'Pitch Deck',
      file_path: 's-1/deck.pdf',
      file_size_bytes: 1024,
      mime_type: 'application/pdf',
      version: 1,
      visibility: 'public' as const,
      uploaded_by: 'usr-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('exercises startup and document SQL queries', async () => {
      db.inMemoryDb.startups.set(mockStartup.id, mockStartup as any);
      db.inMemoryDb.documents.set(mockDoc.id, mockDoc as any);

      vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }] as any, rowCount: 1 };
        }
        if (text.includes('documents')) {
          return { rows: [mockDoc] as any, rowCount: 1 };
        }
        if (text.includes('startup_team_members')) {
          return {
            rows: [
              {
                id: 'tm-1',
                startup_id: 's-1',
                name: 'Jane Doe',
                role: 'CTO',
                linkedin_url: null,
                bio: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ] as any,
            rowCount: 1,
          };
        }
        return { rows: [mockStartup] as any, rowCount: 1 };
      });

      const createdStartup = await startupService.createStartup('usr-1', {
        name: 'New Startup',
        tagline: 'New Tagline',
        sectors: ['AgriTech'],
        stage: 'idea',
        location: 'Punjab',
        funding_ask: 50000,
        currency: 'INR',
        visibility: 'public',
      });
      expect(createdStartup).toBeDefined();

      const discovered = await startupService.listStartups({
        page: 1,
        limit: 10,
        sector: [],
        sort: 'newest',
      });
      expect(discovered.data.length).toBeGreaterThanOrEqual(1);

      const startup = await startupService.getStartupById('s-1');
      expect(startup.id).toBe('s-1');

      const updated = await startupService.updateStartup(
        's-1',
        'usr-1',
        'founder',
        {
          tagline: 'Updated Tagline',
          sectors: ['AgriTech', 'Climate Tech'],
        }
      );
      expect(updated.id).toBe('s-1');

      const tm = await startupService.addTeamMember('s-1', 'usr-1', 'founder', {
        name: 'Jane Doe',
        role_title: 'CTO',
        is_primary: false,
      });
      expect(tm.name).toBe('Jane Doe');

      await startupService.deleteTeamMember('s-1', tm.id, 'usr-1', 'founder');

      const docs = await documentService.listDocuments('s-1', { id: 'usr-1', role: 'founder' });
      expect(docs.length).toBeGreaterThanOrEqual(1);

      const accessReq = await documentService.requestDocumentAccess(
        'doc-1',
        { id: 'usr-2', role: 'investor', full_name: 'Investor One' },
        'Interested in review'
      );
      expect(accessReq.status).toBe('pending');

      const reqs = await documentService.listStartupAccessRequests('s-1', { id: 'usr-1', role: 'founder' });
      expect(reqs.length).toBeGreaterThanOrEqual(1);

      const reviewed = await documentService.reviewDocumentAccessRequest(
        accessReq.id,
        'approved',
        { id: 'usr-1', role: 'founder' }
      );
      expect(reviewed.status).toBe('approved');
    });
  });

  describe('Engagement Service SQL Branches', () => {
    it('exercises watchlist, notes, pipeline and messaging SQL queries', async () => {
      const { engagementService } = await import('../services/engagement.service.js');

      vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
        if (text.includes('watchlist')) {
          return {
            rows: [
              {
                id: 'wl-1',
                investor_id: 'usr-1',
                startup_id: 's-1',
                created_at: new Date().toISOString(),
              },
            ] as any,
            rowCount: 1,
          };
        }
        if (text.includes('investor_notes')) {
          return {
            rows: [
              {
                id: 'note-1',
                investor_id: 'usr-1',
                startup_id: 's-1',
                note: 'Promising founder',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ] as any,
            rowCount: 1,
          };
        }
        if (text.includes('investor_startup_status')) {
          return {
            rows: [
              {
                id: 'stat-1',
                investor_id: 'usr-1',
                startup_id: 's-1',
                status: 'interested',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ] as any,
            rowCount: 1,
          };
        }
        return { rows: [] as any, rowCount: 1 };
      });

      const wl = await engagementService.addToWatchlist('usr-1', 's-1');
      expect(wl.entry.startup_id).toBe('s-1');

      await engagementService.removeFromWatchlist('usr-1', 's-1');

      const note = await engagementService.saveInvestorNote('usr-1', 's-1', 'Great metrics');
      expect(note.note).toBeDefined();

      const updatedNote = await engagementService.saveInvestorNote('usr-1', 's-1', 'Updated metrics');
      expect(updatedNote.note).toBeDefined();

      await engagementService.deleteInvestorNote('usr-1', 's-1');

      const status = await engagementService.setPipelineStatus('usr-1', 's-1', 'interested', 'Active check');
      expect(status.current.status).toBe('interested');
    });
  });

  describe('Notification & Profile Service SQL Branches', () => {
    it('exercises notify and profile SQL paths', async () => {
      vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
        if (text.includes('notifications')) {
          return {
            rows: [
              {
                id: 'notif-1',
                user_id: 'usr-1',
                type: 'system',
                title: 'Notice',
                message: 'Hello',
                data: {},
                is_read: false,
                created_at: new Date().toISOString(),
              },
            ] as any,
            rowCount: 1,
          };
        }
        return {
          rows: [
            {
              id: 'usr-1',
              email: 'test@example.com',
              full_name: 'Test',
              role: 'founder',
              is_student: false,
              organization: null,
              avatar_url: null,
              bio: null,
              location: null,
              website: null,
              status: 'active',
              verification_status: 'verified',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as any,
          rowCount: 1,
        };
      });

      const notif = await notificationService.notify('usr-1', 'test_event', {}, 'Test Title', 'Test Message');
      expect(notif.user_id).toBe('usr-1');

      const notif2 = await notificationService.notify('usr-1', 'test_event', {}, { title: 'T2', message: 'M2', link: '/link' });
      expect(notif2.id).toBeDefined();

      const profile = await profileService.getProfile('usr-1');
      expect(profile.id).toBe('usr-1');

      const updatedProfile = await profileService.updateProfile('usr-1', { full_name: 'Updated Name', bio: 'New Bio' });
      expect(updatedProfile.id).toBe('usr-1');
    });
  });

  describe('Auth Service SQL Branches', () => {
    it('exercises registration and login SQL paths', async () => {
      const authService = await import('../services/auth.service.js');

      vi.spyOn(db, 'query').mockImplementation(async (text: string, params?: any[]) => {
        if (text.includes('SELECT * FROM public.profiles WHERE LOWER(email)')) {
          if (params?.[0] === 'new.investor.sql@test.com') {
            return { rows: [] as any, rowCount: 0 };
          }
          if (params?.[0] === 'suspended@test.com') {
            return {
              rows: [
                {
                  id: 'usr-susp',
                  email: 'suspended@test.com',
                  full_name: 'Suspended User',
                  role: 'investor',
                  status: 'suspended',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ] as any,
              rowCount: 1,
            };
          }
          return {
            rows: [
              {
                id: 'usr-investor-sql',
                email: 'investor.sql@test.com',
                full_name: 'Investor SQL',
                role: 'investor',
                is_student: false,
                organization: 'Venture Capital',
                avatar_url: null,
                bio: 'Bio',
                location: 'Chandigarh',
                website: null,
                status: 'active',
                verification_status: 'verified',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ] as any,
            rowCount: 1,
          };
        }
        return {
          rows: [
            {
              id: 'usr-new-sql',
              email: 'new.investor.sql@test.com',
              full_name: 'New Investor SQL',
              role: 'investor',
              is_student: false,
              organization: 'New Fund',
              avatar_url: null,
              bio: null,
              location: null,
              website: null,
              status: 'active',
              verification_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as any,
          rowCount: 1,
        };
      });

      const regRes = await authService.registerProfile({
        email: 'new.investor.sql@test.com',
        full_name: 'New Investor SQL',
        role: 'investor',
        organization: 'New Fund',
        is_student: false,
      });
      expect(regRes.user.email).toBe('new.investor.sql@test.com');

      const loginRes = await authService.login({
        email: 'investor.sql@test.com',
        password: 'password123',
      });
      expect(loginRes.user.email).toBe('investor.sql@test.com');

      await expect(
        authService.login({ email: 'suspended@test.com', password: 'password123' })
      ).rejects.toThrow('suspended');
    });
  });
});
