import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { computeProfileCompleteness } from '../services/completeness.service.js';
import type { Startup } from '../db/schema.types.js';

describe('Iteration 4: Startup profiles, pitch decks and access control', () => {
  // Test User IDs from seed data
  const adminId = 'a0000000-0000-0000-0000-000000000001';
  const founderOwnerId = 'f0000000-0000-0000-0000-000000000001'; // Owns FarmSense
  const otherFounderId = 'f0000000-0000-0000-0000-000000000002'; // Owns Medora AI
  const verifiedInvestorId = 'i0000000-0000-0000-0000-000000000001';
  const pendingInvestorId = 'i0000000-0000-0000-0000-000000000002';
  const mentorId = 'm0000000-0000-0000-0000-000000000001';
  const incubatorId = 'c0000000-0000-0000-0000-000000000001';

  // Auth tokens
  const adminToken = generateToken({ sub: adminId, email: 'admin@foundersden.test' });
  const founderOwnerToken = generateToken({ sub: founderOwnerId, email: 'harpreet@foundersden.test' });
  const otherFounderToken = generateToken({ sub: otherFounderId, email: 'simran@foundersden.test' });
  const verifiedInvestorToken = generateToken({ sub: verifiedInvestorId, email: 'investor1@foundersden.test' });
  const mentorToken = generateToken({ sub: mentorId, email: 'kavita@foundersden.test' });
  const incubatorToken = generateToken({ sub: incubatorId, email: 'pih@foundersden.test' });

  beforeEach(() => {
    inMemoryDb.reset();
  });

  // =========================================================================
  // 1. UNIT TESTS: Profile Completeness Calculation
  // =========================================================================
  describe('Task 2: Unit tests for completeness calculation', () => {
    it('returns 0 for null, undefined, or empty object', () => {
      expect(computeProfileCompleteness(null)).toBe(0);
      expect(computeProfileCompleteness(undefined)).toBe(0);
      expect(computeProfileCompleteness({})).toBe(0);
    });

    it('returns exact percentage for partial fields', () => {
      // 5 out of 11 fields filled = round(5/11 * 100) = 45%
      const partialStartup: Partial<Startup> = {
        name: 'AgriSense',
        tagline: 'Smarter harvests',
        stage: 'mvp',
        location: 'Punjab, India',
        funding_ask: 1500000,
      };
      expect(computeProfileCompleteness(partialStartup)).toBe(45);
    });

    it('returns 100 for all 11 fields properly filled', () => {
      const fullStartup: Partial<Startup> = {
        name: 'FarmSense',
        logo: 'https://foundersden.network/logos/farmsense.png',
        tagline: 'Precision AI for wheat and paddy growers',
        sectors: ['AgriTech', 'Climate Tech'],
        stage: 'mvp',
        problem: 'Farmers lack hyper-local soil moisture and mandi price signals',
        solution: 'Multilingual IoT sensors with direct WhatsApp price delivery',
        target_market: 'Over 1M northern smallholders farming 5-20 acres',
        business_model: 'Annual SaaS subscription plus sensor lease',
        funding_ask: 1500000,
        location: 'Ludhiana, Punjab, India',
      };
      expect(computeProfileCompleteness(fullStartup)).toBe(100);
    });

    it('ignores whitespace-only strings and zero/negative funding ask', () => {
      const invalidFields: Partial<Startup> = {
        name: '   ',
        logo: '',
        tagline: '   ',
        sectors: [],
        problem: '   ',
        solution: '',
        target_market: '   ',
        business_model: '',
        funding_ask: 0,
        location: '   ',
      };
      expect(computeProfileCompleteness(invalidFields)).toBe(0);
    });
  });

  // =========================================================================
  // 2. FOUNDER ENDPOINTS: Startups & Completeness
  // =========================================================================
  describe('Task 1 & 2: Founder startup endpoints', () => {
    it('allows a founder to create a startup and returns profile_completeness', async () => {
      const payload = {
        name: 'AquaCrop Punjab',
        logo: 'https://foundersden.network/logos/aquacrop.png',
        tagline: 'Sub-surface irrigation automated by solar sensors',
        sectors: ['AgriTech', 'Clean Energy'],
        stage: 'validation',
        problem: 'Groundwater depletion requires 40% reduction in water usage',
        solution: 'Micro-valves triggered by wireless soil capacitance probes',
        target_market: 'Punjab canal and tubewell farmers',
        business_model: 'Direct B2B cooperative sales',
        funding_ask: 2000000,
        location: 'Bathinda, Punjab',
        visibility: 'access_controlled',
      };

      const res = await request(app)
        .post('/api/v1/startups')
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('AquaCrop Punjab');
      expect(res.body.data.founder_id).toBe(founderOwnerId);
      expect(res.body.data.profile_completeness).toBe(100);
      expect(res.body.data.visibility).toBe('access_controlled');
    });

    it('rejects startup creation from non-founder role', async () => {
      const res = await request(app)
        .post('/api/v1/startups')
        .set('Authorization', `Bearer ${verifiedInvestorToken}`)
        .send({
          name: 'Investor Startup',
          tagline: 'Not allowed',
          sectors: ['FinTech'],
          location: 'Delhi',
        });

      expect(res.status).toBe(403);
    });

    it('allows founder to list their startups via GET /me/startups', async () => {
      const res = await request(app)
        .get('/api/v1/me/startups')
        .set('Authorization', `Bearer ${founderOwnerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].founder_id).toBe(founderOwnerId);
      expect(res.body.data[0].profile_completeness).toBeDefined();
    });

    it('allows only the owner or admin to PATCH startup', async () => {
      const farmSenseId = 's0000000-0000-0000-0000-000000000001';

      // Non-owner founder attempts to update
      const forbiddenRes = await request(app)
        .patch(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${otherFounderToken}`)
        .send({ tagline: 'Hacked tagline' });

      expect(forbiddenRes.status).toBe(403);

      // Owner updates
      const ownerRes = await request(app)
        .patch(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .send({ tagline: 'Updated legitimate tagline' });

      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.tagline).toBe('Updated legitimate tagline');

      // Admin updates
      const adminRes = await request(app)
        .patch(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tagline: 'Admin curated tagline' });

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.tagline).toBe('Admin curated tagline');
    });

    it('allows only the owner or admin to DELETE startup', async () => {
      const farmSenseId = 's0000000-0000-0000-0000-000000000001';

      // Non-owner attempts to delete
      const forbiddenRes = await request(app)
        .delete(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${otherFounderToken}`);

      expect(forbiddenRes.status).toBe(403);

      // Owner deletes
      const ownerRes = await request(app)
        .delete(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${founderOwnerToken}`);

      expect(ownerRes.status).toBe(200);

      // Startup is now deleted
      const checkRes = await request(app)
        .get(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${founderOwnerToken}`);

      expect(checkRes.status).toBe(404);
    });
  });

  // =========================================================================
  // 3. TEAM MEMBER CRUD
  // =========================================================================
  describe('Task 1: Team Member CRUD', () => {
    const farmSenseId = 's0000000-0000-0000-0000-000000000001';

    it('allows founder to add, list, update and delete team members', async () => {
      // 1. Add team member
      const addRes = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/team-members`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .send({
          name: 'Amrit Singh',
          role_title: 'Chief Agronomist & Co-Founder',
          email: 'amrit@farmsense.example.com',
          is_primary: true,
        });

      expect(addRes.status).toBe(201);
      const memberId = addRes.body.data.id;
      expect(addRes.body.data.name).toBe('Amrit Singh');

      // 2. Non-owner cannot add team member
      const forbiddenAdd = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/team-members`)
        .set('Authorization', `Bearer ${otherFounderToken}`)
        .send({
          name: 'Unauthorized Member',
          role_title: 'Hacker',
        });
      expect(forbiddenAdd.status).toBe(403);

      // 3. List team members
      const listRes = await request(app)
        .get(`/api/v1/startups/${farmSenseId}/team-members`)
        .set('Authorization', `Bearer ${founderOwnerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((m: any) => m.id === memberId)).toBe(true);

      // 4. Update team member
      const updateRes = await request(app)
        .patch(`/api/v1/startups/${farmSenseId}/team-members/${memberId}`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .send({
          role_title: 'VP Agronomy & Field Operations',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.role_title).toBe('VP Agronomy & Field Operations');

      // 5. Delete team member
      const delRes = await request(app)
        .delete(`/api/v1/startups/${farmSenseId}/team-members/${memberId}`)
        .set('Authorization', `Bearer ${founderOwnerToken}`);

      expect(delRes.status).toBe(200);

      const verifyRes = await request(app)
        .get(`/api/v1/startups/${farmSenseId}/team-members`)
        .set('Authorization', `Bearer ${founderOwnerToken}`);

      expect(verifyRes.body.data.some((m: any) => m.id === memberId)).toBe(false);
    });
  });

  // =========================================================================
  // 4. VISIBILITY MATRIX TEST: Every role x Every visibility value
  // =========================================================================
  describe('Task 4 & Tests: Visibility Matrix for every role and visibility level', () => {
    it('enforces visibility rules across all roles: public, access_controlled, private', async () => {
      // Create 3 startups with different visibilities owned by founderOwnerId
      const publicStartup = inMemoryDb.createStartup({
        id: 'test-public-startup',
        founder_id: founderOwnerId,
        name: 'Public Startup',
        tagline: 'Everyone can view',
        description: 'Open to community',
        sector: 'AgriTech',
        stage: 'idea',
        location: 'Punjab',
        funding_ask: 500000,
        currency: 'INR',
        visibility: 'public',
        pitch_deck_url: null,
        website: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const accessControlledStartup = inMemoryDb.createStartup({
        id: 'test-access-controlled-startup',
        founder_id: founderOwnerId,
        name: 'Access Controlled Startup',
        tagline: 'Request access to deck',
        description: 'Discovery is allowed',
        sector: 'AgriTech',
        stage: 'mvp',
        location: 'Punjab',
        funding_ask: 1500000,
        currency: 'INR',
        visibility: 'access_controlled',
        pitch_deck_url: null,
        website: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const privateStartup = inMemoryDb.createStartup({
        id: 'test-private-startup',
        founder_id: founderOwnerId,
        name: 'Private Stealth Startup',
        tagline: 'Strictly stealth mode',
        description: 'Owner only',
        sector: 'DeepTech',
        stage: 'idea',
        location: 'Punjab',
        funding_ask: 5000000,
        currency: 'INR',
        visibility: 'private',
        pitch_deck_url: null,
        website: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const testRoles = [
        { name: 'Founder Owner', token: founderOwnerToken, canViewPrivate: true },
        { name: 'Other Founder', token: otherFounderToken, canViewPrivate: false },
        { name: 'Verified Investor', token: verifiedInvestorToken, canViewPrivate: false },
        { name: 'Mentor', token: mentorToken, canViewPrivate: false },
        { name: 'Incubator', token: incubatorToken, canViewPrivate: false },
        { name: 'Admin', token: adminToken, canViewPrivate: true },
      ];

      for (const userRole of testRoles) {
        // Public Startup -> Accessible to all authenticated roles
        const pubRes = await request(app)
          .get(`/api/v1/startups/${publicStartup.id}`)
          .set('Authorization', `Bearer ${userRole.token}`);
        expect(pubRes.status, `${userRole.name} viewing public startup`).toBe(200);

        // Access Controlled Startup -> Accessible to all authenticated roles for discovery
        const acRes = await request(app)
          .get(`/api/v1/startups/${accessControlledStartup.id}`)
          .set('Authorization', `Bearer ${userRole.token}`);
        expect(acRes.status, `${userRole.name} viewing access_controlled startup`).toBe(200);

        // Private Startup -> Accessible ONLY to owner or admin
        const privRes = await request(app)
          .get(`/api/v1/startups/${privateStartup.id}`)
          .set('Authorization', `Bearer ${userRole.token}`);

        if (userRole.canViewPrivate) {
          expect(privRes.status, `${userRole.name} viewing private startup`).toBe(200);
        } else {
          expect(privRes.status, `${userRole.name} viewing private startup`).toBe(403);
        }
      }
    });
  });

  // =========================================================================
  // 5. DOCUMENTS: Upload, File Validation, Versioning & Delete
  // =========================================================================
  describe('Task 3: Pitch decks and document versioning', () => {
    const farmSenseId = 's0000000-0000-0000-0000-000000000001';

    it('rejects non-PDF uploads with 400 status', async () => {
      const res = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/documents`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .attach('file', Buffer.from('Plain text contents'), 'financials.txt');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
      expect(res.body.error.message).toContain('Only PDF files are allowed');
    });

    it('rejects files larger than 10MB', async () => {
      // 10MB + 1KB buffer
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);

      const res = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/documents`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .attach('file', largeBuffer, 'huge_deck.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('increments version on each new upload and permits only owner or admin to delete', async () => {
      const samplePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      // 1. Upload Deck Version 1 (or 2 if seed exists)
      const upload1 = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/documents`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .field('title', 'FarmSense Seed Deck')
        .field('visibility', 'access_controlled')
        .attach('file', samplePdfBuffer, 'farmsense_v1.pdf');

      expect(upload1.status).toBe(201);
      const v1Version = upload1.body.data.version;
      const v1DocId = upload1.body.data.id;
      expect(upload1.body.data.file_type).toBe('application/pdf');

      // 2. Upload Deck Version 2
      const upload2 = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/documents`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .field('title', 'FarmSense Seed Deck Revised')
        .field('visibility', 'access_controlled')
        .attach('file', samplePdfBuffer, 'farmsense_v2.pdf');

      expect(upload2.status).toBe(201);
      expect(upload2.body.data.version).toBe(v1Version + 1);

      // 3. Non-owner cannot delete document
      const forbiddenDel = await request(app)
        .delete(`/api/v1/documents/${v1DocId}`)
        .set('Authorization', `Bearer ${otherFounderToken}`);
      expect(forbiddenDel.status).toBe(403);

      // 4. Owner deletes document
      const ownerDel = await request(app)
        .delete(`/api/v1/documents/${v1DocId}`)
        .set('Authorization', `Bearer ${founderOwnerToken}`);
      expect(ownerDel.status).toBe(200);
    });
  });

  // =========================================================================
  // 6. ACCESS CONTROL, SIGNED URLS & NOTIFICATION WORKFLOW
  // =========================================================================
  describe('Task 4 & 5: Access requests, signed URLs & notifications', () => {
    it('controls access to access_controlled documents: refused before approval, refused after decline, approved allows 60s signed URL', async () => {
      const farmSenseId = 's0000000-0000-0000-0000-000000000001';
      const samplePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      // Founder uploads an access-controlled pitch deck
      const uploadRes = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/documents`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .field('title', 'FarmSense Proprietary Deck')
        .field('visibility', 'access_controlled')
        .attach('file', samplePdfBuffer, 'proprietary_deck.pdf');

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.id;

      // 1. Investor attempts to download WITHOUT an access request -> 403 Refused
      const downloadBeforeRequest = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${verifiedInvestorToken}`);

      expect(downloadBeforeRequest.status).toBe(403);
      expect(downloadBeforeRequest.body.error.message).toContain('approved access request is required');

      // 2. Investor requests access -> 201 Created & Founder gets notified
      const requestRes = await request(app)
        .post(`/api/v1/documents/${docId}/access-requests`)
        .set('Authorization', `Bearer ${verifiedInvestorToken}`)
        .send({ notes: 'We run a ₹50Cr fund interested in Punjab AgriTech.' });

      expect(requestRes.status).toBe(201);
      const requestId = requestRes.body.data.id;
      expect(requestRes.body.data.status).toBe('pending');

      // Verify founder notification was created
      const founderNotifications = Array.from(inMemoryDb.notifications.values()).filter(
        (n) => n.user_id === founderOwnerId
      );
      expect(founderNotifications.length).toBeGreaterThanOrEqual(1);
      expect(founderNotifications.some((n) => n.type === 'document_access_request')).toBe(true);

      // 3. Investor attempts to download while pending -> 403 Refused
      const downloadPending = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${verifiedInvestorToken}`);

      expect(downloadPending.status).toBe(403);
      expect(downloadPending.body.error.message).toContain('pending approval');

      // 4. Founder declines request -> 200 & Requester gets notified
      const declineRes = await request(app)
        .post(`/api/v1/document-access-requests/${requestId}/decline`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .send({ notes: 'Stage mismatch at this time.' });

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.data.status).toBe('rejected');

      // 5. Investor attempts to download AFTER decline -> 403 Refused
      const downloadAfterDecline = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${verifiedInvestorToken}`);

      expect(downloadAfterDecline.status).toBe(403);
      expect(downloadAfterDecline.body.error.message).toContain('declined');

      // 6. Founder approves request -> 200 & Requester gets notified
      const approveRes = await request(app)
        .post(`/api/v1/document-access-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .send({ notes: 'Reviewed portfolio, access granted.' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('approved');

      // Verify investor received approval notification
      const investorNotifications = Array.from(inMemoryDb.notifications.values()).filter(
        (n) => n.user_id === verifiedInvestorId
      );
      expect(investorNotifications.some((n) => n.type === 'document_access_approved')).toBe(true);

      // 7. Investor downloads AFTER approval -> 200 with 60-second signed URL
      const downloadAfterApprove = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${verifiedInvestorToken}`);

      expect(downloadAfterApprove.status).toBe(200);
      expect(downloadAfterApprove.body.data.download_url).toBeDefined();
      expect(downloadAfterApprove.body.data.expires_in).toBe(60);
      expect(downloadAfterApprove.body.data.download_url).toContain('startup-documents');
    });

    it('enforces that unverified users cannot download public documents', async () => {
      const farmSenseId = 's0000000-0000-0000-0000-000000000001';
      const samplePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      // Create a public document
      const pubDocRes = await request(app)
        .post(`/api/v1/startups/${farmSenseId}/documents`)
        .set('Authorization', `Bearer ${founderOwnerToken}`)
        .field('title', 'FarmSense Public One-Pager')
        .field('visibility', 'public')
        .attach('file', samplePdfBuffer, 'one_pager.pdf');

      expect(pubDocRes.status).toBe(201);
      const docId = pubDocRes.body.data.id;

      // Pending (unverified) investor
      // Ensure user profile in inMemoryDb is pending
      const pendingProfile = inMemoryDb.getProfileById(pendingInvestorId);
      if (pendingProfile) {
        pendingProfile.verification_status = 'pending';
        inMemoryDb.saveProfile(pendingProfile);
      }
      const pendingInvestorToken = generateToken({ sub: pendingInvestorId, email: 'pending.inv@test.com' });

      const unverifiedDownload = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${pendingInvestorToken}`);

      expect(unverifiedDownload.status).toBe(403);
      expect(unverifiedDownload.body.error.code).toBe('UNVERIFIED_ACCOUNT');

      // Verified investor downloads public document successfully
      const verifiedDownload = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${verifiedInvestorToken}`);

      expect(verifiedDownload.status).toBe(200);
      expect(verifiedDownload.body.data.expires_in).toBe(60);
    });
  });
});
