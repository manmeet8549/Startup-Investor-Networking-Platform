import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Iteration 8: Mentorship, incubation and notifications', () => {
  // Test users
  const founder1Id = 'f0000000-0000-0000-0000-000000000001'; // Manmeet Singh (owns FarmSense s1 & AgriDrone s2)
  const founder2Id = 'f0000000-0000-0000-0000-000000000002'; // Riya Kapoor (owns Medora s3)
  const mentor1Id = 'm0000000-0000-0000-0000-000000000001';  // Dr. Kavita Mehra (AgriTech)
  const mentor2Id = 'm0000000-0000-0000-0000-000000000002';  // Arjun Bedi (SaaS Growth)
  const incubator1Id = 'c0000000-0000-0000-0000-000000000001'; // Punjab Innovation Hub (owns p1 & p2)
  const incubator2Id = 'c0000000-0000-0000-0000-000000000002'; // ClimateX Accelerator (owns p3)
  const investor1Id = 'i0000000-0000-0000-0000-000000000001';  // Northstar Ventures

  // Test startups
  const startup1Id = 's0000000-0000-0000-0000-000000000001'; // FarmSense (founder1)
  const startup2Id = 's0000000-0000-0000-0000-000000000002'; // AgriDrone (founder1)
  const startup3Id = 's0000000-0000-0000-0000-000000000003'; // Medora AI (founder2)

  // Test programs
  const program1Id = 'p0000000-0000-0000-0000-000000000001'; // Punjab Campus Fellowship (deadline 2026-11-30)
  const program3Id = 'p0000000-0000-0000-0000-000000000003'; // ClimateX (deadline 2027-01-10)

  // Auth tokens
  const founder1Token = generateToken({ sub: founder1Id, role: 'founder', email: 'manmeet@foundersden.test' });
  const founder2Token = generateToken({ sub: founder2Id, role: 'founder', email: 'riya@foundersden.test' });
  const mentor1Token = generateToken({ sub: mentor1Id, role: 'mentor', email: 'kavita@foundersden.test' });
  const mentor2Token = generateToken({ sub: mentor2Id, role: 'mentor', email: 'arjun@foundersden.test' });
  const incubator1Token = generateToken({ sub: incubator1Id, role: 'incubator', email: 'punjab@foundersden.test' });
  const incubator2Token = generateToken({ sub: incubator2Id, role: 'incubator', email: 'climatex@foundersden.test' });
  const investor1Token = generateToken({ sub: investor1Id, role: 'investor', email: 'northstar@foundersden.test' });

  beforeEach(() => {
    inMemoryDb.reset();
  });

  // ==========================================
  // 1. MENTORS & MENTORSHIP REQUESTS
  // ==========================================
  describe('1. Mentors and Mentorship Requests', () => {
    it('GET /api/v1/mentors returns public list of mentors', async () => {
      const res = await request(app).get('/api/v1/mentors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0]).toHaveProperty('expertise');
      expect(res.body.data[0]).toHaveProperty('full_name');
    });

    it('GET /api/v1/mentors filters by expertise', async () => {
      const res = await request(app).get('/api/v1/mentors?expertise=AgriTech');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const m of res.body.data) {
        expect(m.expertise).toContain('AgriTech');
      }
    });

    it('GET /api/v1/mentors/:id returns mentor profile details', async () => {
      const res = await request(app).get(`/api/v1/mentors/${mentor1Id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user_id).toBe(mentor1Id);
      expect(res.body.data.full_name).toBe('Dr. Kavita Mehra');
      expect(res.body.data.expertise).toContain('AgriTech');
    });

    it('POST /api/v1/mentorship-requests allows founder to request mentorship and notifies mentor', async () => {
      const res = await request(app)
        .post('/api/v1/mentorship-requests')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          mentor_id: mentor1Id,
          startup_id: startup1Id,
          message: 'Would love your guidance on our AgriTech sensor pilot in Punjab.',
          goals: ['Field trial validation', 'Pricing model advice'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.mentor_id).toBe(mentor1Id);
      expect(res.body.data.founder_id).toBe(founder1Id);
      expect(res.body.data.status).toBe('pending');

      // Verify notification was sent to mentor1
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${mentor1Token}`);

      expect(notifRes.status).toBe(200);
      const reqNotif = notifRes.body.data.find(
        (n: any) => n.type === 'mentorship_request' || n.type === 'mentorship_requested'
      );
      expect(reqNotif).toBeDefined();
    });

    it('only the target mentor can respond to a mentorship request', async () => {
      // Founder 1 creates request for Mentor 1
      const createRes = await request(app)
        .post('/api/v1/mentorship-requests')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          mentor_id: mentor1Id,
          startup_id: startup1Id,
          message: 'Mentor request test',
        });
      const reqId = createRes.body.data.id;

      // Mentor 2 tries to respond -> 403 Forbidden
      const unauthorizedRes = await request(app)
        .patch(`/api/v1/mentorship-requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${mentor2Token}`)
        .send({
          status: 'accepted',
          response_note: 'Illegal accept',
        });
      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.error.code).toBe('FORBIDDEN_RESOURCE');

      // Mentor 1 (target) accepts -> 200 OK
      const acceptRes = await request(app)
        .patch(`/api/v1/mentorship-requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${mentor1Token}`)
        .send({
          status: 'accepted',
          response_note: 'Delighted to help your startup!',
        });
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('accepted');
      expect(acceptRes.body.data.response_note).toBe('Delighted to help your startup!');

      // Check founder received notification
      const founderNotifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${founder1Token}`);
      expect(founderNotifRes.body.data.some((n: any) => n.type.includes('mentorship'))).toBe(true);
    });

    it('mentor can submit structured feedback with ratings for a startup', async () => {
      const res = await request(app)
        .post(`/api/v1/startups/${startup1Id}/feedback`)
        .set('Authorization', `Bearer ${mentor1Token}`)
        .send({
          rating: 5,
          feedback: 'Impressive field validation and pilot unit economics in Ludhiana.',
          strengths: ['Deep local farmer trust', 'Low CAC'],
          areas_for_improvement: ['Need sensor hardware patent protection'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.startup_id).toBe(startup1Id);
      expect(res.body.data.mentor_id).toBe(mentor1Id);

      // Verify rating out of 1-5 is rejected with 400
      const badRatingRes = await request(app)
        .post(`/api/v1/startups/${startup1Id}/feedback`)
        .set('Authorization', `Bearer ${mentor1Token}`)
        .send({
          rating: 6,
          feedback: 'Rating is too high',
        });
      expect([400, 422]).toContain(badRatingRes.status);

      // Startup founder receives notification of new feedback
      const founderNotifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${founder1Token}`);
      expect(founderNotifRes.body.data.some((n: any) => n.type === 'mentor_feedback')).toBe(true);
    });
  });

  // ==========================================
  // 2. INCUBATOR PROGRAMS CRUD
  // ==========================================
  describe('2. Incubator Programs CRUD', () => {
    it('allows an incubator to create a program', async () => {
      const res = await request(app)
        .post('/api/v1/programs')
        .set('Authorization', `Bearer ${incubator1Token}`)
        .send({
          title: 'DeepTech Acceleration Cohort 2027',
          description: 'A 6-month intensive acceleration program for advanced hardware and AI startups.',
          eligibility: 'Must have working prototype or filed patents in India.',
          benefits: '₹25 Lakh funding, fab lab access, institutional investor demo day.',
          sectors: ['AI', 'Hardware', 'DeepTech'],
          stages: ['mvp', 'early_traction'],
          deadline: '2027-03-31T23:59:59Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('DeepTech Acceleration Cohort 2027');
      expect(res.body.data.incubator_id).toBe(incubator1Id);
      expect(res.body.data.is_active).toBe(true);
    });

    it('non-incubator roles cannot create a program', async () => {
      const res = await request(app)
        .post('/api/v1/programs')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          title: 'Illegal Founder Program',
          benefits: 'None',
          deadline: '2027-03-31T23:59:59Z',
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/programs returns public list with filter support', async () => {
      const res = await request(app).get('/api/v1/programs?sector=AgriTech');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const prog of res.body.data) {
        expect(prog.sectors).toContain('AgriTech');
      }
    });

    it('only the owning incubator can update or delete a program', async () => {
      // Incubator 2 tries to update Incubator 1's program (program1Id)
      const updateRes = await request(app)
        .patch(`/api/v1/programs/${program1Id}`)
        .set('Authorization', `Bearer ${incubator2Token}`)
        .send({
          benefits: 'Hijacked benefits',
        });
      expect(updateRes.status).toBe(403);
      expect(updateRes.body.error.code).toBe('FORBIDDEN_RESOURCE');

      // Incubator 1 updates its own program
      const goodUpdate = await request(app)
        .patch(`/api/v1/programs/${program1Id}`)
        .set('Authorization', `Bearer ${incubator1Token}`)
        .send({
          benefits: 'Updated ₹5 Lakh grant and lab credits',
        });
      expect(goodUpdate.status).toBe(200);
      expect(goodUpdate.body.data.benefits).toBe('Updated ₹5 Lakh grant and lab credits');

      // Incubator 2 tries to delete Incubator 1's program
      const deleteFail = await request(app)
        .delete(`/api/v1/programs/${program1Id}`)
        .set('Authorization', `Bearer ${incubator2Token}`);
      expect(deleteFail.status).toBe(403);

      // Incubator 1 deletes its program
      const deleteSuccess = await request(app)
        .delete(`/api/v1/programs/${program1Id}`)
        .set('Authorization', `Bearer ${incubator1Token}`);
      expect(deleteSuccess.status).toBe(200);

      // Program is now gone
      const fetchRes = await request(app).get(`/api/v1/programs/${program1Id}`);
      expect(fetchRes.status).toBe(404);
    });
  });

  // ==========================================
  // 3. PROGRAM APPLICATIONS & STATE MACHINE
  // ==========================================
  describe('3. Program Applications & Rules', () => {
    it('founder can apply to an active program before deadline', async () => {
      // Founder 1 applies with Startup 2 (AgriDrone) to Program 1 (Punjab Fellowship)
      const res = await request(app)
        .post(`/api/v1/programs/${program1Id}/apply`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          startup_id: startup2Id,
          pitch_summary: 'AgriDrone Punjab precision micro-drones applying for Punjab Innovation Hub lab testing.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.program_id).toBe(program1Id);
      expect(res.body.data.startup_id).toBe(startup2Id);
      expect(res.body.data.status).toBe('submitted');

      // Incubator receives notification
      const incNotif = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${incubator1Token}`);
      expect(incNotif.body.data.some((n: any) => n.type === 'application_submitted')).toBe(true);
    });

    it('duplicate application for same startup and program returns 409', async () => {
      // Note: seedApplications already has Startup 1 applied to Program 1 (b0000000-0000-0000-0000-000000000001)
      const res = await request(app)
        .post(`/api/v1/programs/${program1Id}/apply`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          startup_id: startup1Id, // Already applied!
          pitch_summary: 'Duplicate application attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_APPLICATION');
    });

    it('applying after the deadline returns 422', async () => {
      // Create an expired program directly or via API
      const expiredProgRes = await request(app)
        .post('/api/v1/programs')
        .set('Authorization', `Bearer ${incubator1Token}`)
        .send({
          title: 'Expired Cohort 2020',
          benefits: 'Old grant',
          deadline: '2020-01-01T00:00:00Z', // Definitely in the past!
        });
      const expiredId = expiredProgRes.body.data.id;

      const applyRes = await request(app)
        .post(`/api/v1/programs/${expiredId}/apply`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          startup_id: startup2Id,
          pitch_summary: 'Late application',
        });

      expect(applyRes.status).toBe(422);
      expect(applyRes.body.error.code).toBe('DEADLINE_PASSED');
    });

    it('founders can retrieve their applications via GET /api/v1/me/applications', async () => {
      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${founder1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].founder_id).toBe(founder1Id);
    });

    it('enforces status transition rules and ownership on applications', async () => {
      // First create a fresh application in 'submitted' status
      const appRes = await request(app)
        .post(`/api/v1/programs/${program3Id}/apply`)
        .set('Authorization', `Bearer ${founder2Token}`)
        .send({
          startup_id: startup3Id,
          pitch_summary: 'Medora AI application to ClimateX',
        });
      const appId = appRes.body.data.id;
      expect(appRes.body.data.status).toBe('submitted');

      // Incubator 1 (not owner of Program 3) cannot change status -> 403
      const nonOwnerRes = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Authorization', `Bearer ${incubator1Token}`)
        .send({
          status: 'under_review',
        });
      expect(nonOwnerRes.status).toBe(403);
      expect(nonOwnerRes.body.error.code).toBe('FORBIDDEN_RESOURCE');

      // Invalid transition: submitted -> accepted directly -> 400
      const invalidJump = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Authorization', `Bearer ${incubator2Token}`)
        .send({
          status: 'accepted',
        });
      expect(invalidJump.status).toBe(400);
      expect(invalidJump.body.error.code).toBe('INVALID_STATUS_TRANSITION');

      // Valid step 1: submitted -> under_review -> 200
      const step1 = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Authorization', `Bearer ${incubator2Token}`)
        .send({
          status: 'under_review',
          decision_notes: 'Under review by investment committee',
        });
      expect(step1.status).toBe(200);
      expect(step1.body.data.status).toBe('under_review');

      // Valid step 2: under_review -> shortlisted -> 200
      const step2 = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Authorization', `Bearer ${incubator2Token}`)
        .send({
          status: 'shortlisted',
          decision_notes: 'Shortlisted for interview batch 1',
        });
      expect(step2.status).toBe(200);
      expect(step2.body.data.status).toBe('shortlisted');

      // Valid step 3: shortlisted -> accepted -> 200
      const step3 = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Authorization', `Bearer ${incubator2Token}`)
        .send({
          status: 'accepted',
          decision_notes: 'Accepted into ClimateX 2027 Cohort!',
        });
      expect(step3.status).toBe(200);
      expect(step3.body.data.status).toBe('accepted');

      // Verify founder receives notification for status update
      const founderNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${founder2Token}`);
      expect(founderNotifs.body.data.some((n: any) => n.type === 'application_status_updated')).toBe(true);
    });
  });

  // ==========================================
  // 4. NOTIFICATIONS
  // ==========================================
  describe('4. Notifications Visibility and Read Operations', () => {
    it('GET /api/v1/notifications and /unread-count return only user-owned notifications', async () => {
      // Trigger an event so Mentor 1 receives a notification
      await request(app)
        .post('/api/v1/mentorship-requests')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          mentor_id: mentor1Id,
          startup_id: startup1Id,
          message: 'Notification test request',
        });

      // Mentor 1 checks unread count
      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${mentor1Token}`);
      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unread_count).toBeGreaterThan(0);

      // Mentor 1 fetches notifications
      const notifListRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${mentor1Token}`);
      expect(notifListRes.status).toBe(200);
      expect(notifListRes.body.data.length).toBeGreaterThan(0);
      const mentorNotifId = notifListRes.body.data[0].id;

      // Mentor 2 checks notifications: should NOT contain Mentor 1's notification
      const mentor2Notifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${mentor2Token}`);
      expect(mentor2Notifs.body.data.some((n: any) => n.id === mentorNotifId)).toBe(false);

      // Mentor 2 tries to mark Mentor 1's notification as read -> 403 Forbidden
      const unauthRead = await request(app)
        .patch(`/api/v1/notifications/${mentorNotifId}/read`)
        .set('Authorization', `Bearer ${mentor2Token}`);
      expect(unauthRead.status).toBe(403);
      expect(unauthRead.body.error.code).toBe('FORBIDDEN_RESOURCE');

      // Mentor 1 marks own notification as read -> 200 OK
      const markRes = await request(app)
        .patch(`/api/v1/notifications/${mentorNotifId}/read`)
        .set('Authorization', `Bearer ${mentor1Token}`);
      expect(markRes.status).toBe(200);
      expect(markRes.body.data.is_read).toBe(true);

      // POST /notifications/read-all marks all unread as read
      const readAllRes = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${mentor1Token}`);
      expect(readAllRes.status).toBe(200);

      // Unread count is now 0
      const finalCount = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${mentor1Token}`);
      expect(finalCount.body.data.unread_count).toBe(0);
    });
  });
});
