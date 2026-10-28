import { config } from '../config.js';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Iteration 7: Investor engagement, connections and messaging', () => {
  let origDbMode: boolean;
  beforeAll(() => {
    origDbMode = config.USE_IN_MEMORY_DB;
    (config as any).USE_IN_MEMORY_DB = true;
    (config as any).dbMode = 'in-memory';
  });
  afterAll(() => {
    (config as any).USE_IN_MEMORY_DB = origDbMode;
    (config as any).dbMode = origDbMode ? 'in-memory' : 'postgres';
  });

  const investor1Id = 'b0000000-0000-0000-0000-000000000001'; // Northstar Ventures
  const investor2Id = 'b0000000-0000-0000-0000-000000000002'; // Blue Horizon Capital
  const founder1Id = 'f0000000-0000-0000-0000-000000000001';  // Manmeet Singh (FarmSense owner)
  const founder2Id = 'f0000000-0000-0000-0000-000000000002';  // Riya Kapoor (Medora AI owner)
  const unconnectedUserId = 'd0000000-0000-0000-0000-000000000001'; // Dr. Kavita Mehra

  const startup1Id = 'e0000000-0000-0000-0000-000000000001';  // FarmSense (founder1Id)
  const startup2Id = 'e0000000-0000-0000-0000-000000000002';  // TerraLoop

  const investor1Token = generateToken({ sub: investor1Id, role: 'investor', email: 'northstar@foundersden.test' });
  const investor2Token = generateToken({ sub: investor2Id, role: 'investor', email: 'bluehorizon@foundersden.test' });
  const founder1Token = generateToken({ sub: founder1Id, role: 'founder', email: 'manmeet@foundersden.test' });
  const founder2Token = generateToken({ sub: founder2Id, role: 'founder', email: 'riya@foundersden.test' });
  const unconnectedToken = generateToken({ sub: unconnectedUserId, role: 'mentor', email: 'kavita@foundersden.test' });

  beforeEach(() => {
    inMemoryDb.reset();
  });

  describe('1. Watchlist and Private Notes Privacy', () => {

    it('allows an investor to add a startup to watchlist', async () => {
      const res = await request(app)
        .post(`/api/v1/watchlist/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.startup_id).toBe(startup1Id);
      expect(res.body.data.investor_id).toBe(investor1Id);
    });

    it('adding a startup to watchlist is idempotent', async () => {
      // First add
      await request(app)
        .post(`/api/v1/watchlist/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`);

      // Second add
      const res = await request(app)
        .post(`/api/v1/watchlist/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.startup_id).toBe(startup1Id);
    });

    it('enforces watchlist privacy: Investor 2 cannot see Investor 1 saved startups', async () => {
      // Investor 1 adds startup1
      await request(app)
        .post(`/api/v1/watchlist/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`);

      // Investor 1 lists watchlist
      const res1 = await request(app)
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${investor1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.some((w: any) => w.startup_id === startup1Id)).toBe(true);

      // Investor 2 lists watchlist -> must NOT see startup1
      const res2 = await request(app)
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${investor2Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.some((w: any) => w.startup_id === startup1Id)).toBe(false);
    });

    it('allows investor to create, read, and update private notes', async () => {
      // Investor 1 creates a private note
      const putRes = await request(app)
        .put(`/api/v1/startups/${startup1Id}/notes`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ note: 'Strong agricultural IoT field test metrics.' });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.note).toBe('Strong agricultural IoT field test metrics.');

      // Investor 1 reads the note
      const getRes = await request(app)
        .get(`/api/v1/startups/${startup1Id}/notes`)
        .set('Authorization', `Bearer ${investor1Token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.note).toBe('Strong agricultural IoT field test metrics.');
    });

    it('enforces notes privacy: Investor 2 gets 404 for Investor 1 private note', async () => {
      // Investor 1 creates note
      await request(app)
        .put(`/api/v1/startups/${startup1Id}/notes`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ note: 'Confidential valuation discussion notes.' });

      // Investor 2 attempts to read note on startup1
      const res = await request(app)
        .get(`/api/v1/startups/${startup1Id}/notes`)
        .set('Authorization', `Bearer ${investor2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOTE_NOT_FOUND');
    });

    it('allows removing a startup from watchlist and deleting private note', async () => {
      // Add and save note
      await request(app)
        .post(`/api/v1/watchlist/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`);
      await request(app)
        .put(`/api/v1/startups/${startup1Id}/notes`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ note: 'To delete' });

      // Delete note
      const delNoteRes = await request(app)
        .delete(`/api/v1/startups/${startup1Id}/notes`)
        .set('Authorization', `Bearer ${investor1Token}`);
      expect(delNoteRes.status).toBe(200);

      // Remove from watchlist
      const delWatchRes = await request(app)
        .delete(`/api/v1/watchlist/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`);
      expect(delWatchRes.status).toBe(200);

      // Verify removed
      const checkRes = await request(app)
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${investor1Token}`);
      expect(checkRes.body.data.some((w: any) => w.startup_id === startup1Id)).toBe(false);
    });
  });

  describe('2. Pipeline State Machine and History', () => {
    it('sets initial pipeline status to interested', async () => {
      const res = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested', notes: 'Initial thesis review' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('interested');
      expect(res.body.history.to_status).toBe('interested');
    });

    it('allows valid transitions through the pipeline', async () => {
      // 1. interested
      await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested' });

      // 2. interested -> meeting_requested
      const r1 = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'meeting_requested' });
      expect(r1.status).toBe(200);
      expect(r1.body.data.status).toBe('meeting_requested');

      // 3. meeting_requested -> in_discussion
      const r2 = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'in_discussion' });
      expect(r2.status).toBe(200);
      expect(r2.body.data.status).toBe('in_discussion');

      // 4. in_discussion -> follow_up
      const r3 = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'follow_up' });
      expect(r3.status).toBe(200);
      expect(r3.body.data.status).toBe('follow_up');

      // 5. follow_up -> passed
      const r4 = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'passed' });
      expect(r4.status).toBe(200);
      expect(r4.body.data.status).toBe('passed');

      // 6. passed -> interested (reopening)
      const r5 = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested' });
      expect(r5.status).toBe(200);
      expect(r5.body.data.status).toBe('interested');
    });

    it('rejects invalid state machine transitions with 400', async () => {
      // Set to interested
      await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested' });

      // Try illegal jump: interested -> in_discussion directly
      const res = await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'in_discussion' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PIPELINE_TRANSITION');
    });

    it('tracks full transition history in pipeline_history', async () => {
      await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested', notes: 'Initial look' });

      await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'meeting_requested', notes: 'Sent deck request' });

      const histRes = await request(app)
        .get(`/api/v1/pipeline/${startup1Id}/history`)
        .set('Authorization', `Bearer ${investor1Token}`);

      expect(histRes.status).toBe(200);
      expect(histRes.body.data.length).toBe(2);
      expect(histRes.body.data[0].to_status).toBe('interested');
      expect(histRes.body.data[1].to_status).toBe('meeting_requested');
    });

    it('GET /pipeline groups startups by status', async () => {
      // Place startup1 in meeting_requested
      await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested' });
      await request(app)
        .put(`/api/v1/pipeline/${startup1Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'meeting_requested' });

      // Place startup2 in interested
      await request(app)
        .put(`/api/v1/pipeline/${startup2Id}`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ status: 'interested' });

      const res = await request(app)
        .get('/api/v1/pipeline')
        .set('Authorization', `Bearer ${investor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.meeting_requested.some((p: any) => p.startup_id === startup1Id)).toBe(true);
      expect(res.body.data.interested.some((p: any) => p.startup_id === startup2Id)).toBe(true);
    });
  });

  describe('3. Pitch Meeting Requests', () => {
    it('creates a pitch meeting request and updates pipeline to meeting_requested', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Would love to discuss your pilot results and sensor hardware margins.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.startup_id).toBe(startup1Id);
      expect(res.body.data.status).toBe('pending');

      // Verify investor pipeline was automatically updated to meeting_requested
      const pipeRes = await request(app)
        .get('/api/v1/pipeline')
        .set('Authorization', `Bearer ${investor1Token}`);
      expect(pipeRes.body.data.meeting_requested.some((p: any) => p.startup_id === startup1Id)).toBe(true);
    });

    it('returns 409 conflict on duplicate pending pitch requests', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'First meeting request',
        });

      const res = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Duplicate meeting request',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_PITCH_REQUEST');
    });

    it('prevents a founder from acting on another founder pitch requests with 403', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      // Investor requests meeting with startup1 (owned by Founder 1)
      const createRes = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Meeting with FarmSense',
        });

      const requestId = createRes.body.data.id;

      // Founder 2 (owner of Medora AI) attempts to accept Founder 1's request
      const res = await request(app)
        .patch(`/api/v1/pitch-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${founder2Token}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('founder can accept pitch request which unlocks in_discussion pipeline status', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Meeting with FarmSense',
        });

      const requestId = createRes.body.data.id;

      // Founder 1 accepts
      const acceptRes = await request(app)
        .patch(`/api/v1/pitch-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ action: 'accept', message: 'Looking forward to meeting!' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('approved');

      // Verify pipeline for investor is now in_discussion
      const pipeRes = await request(app)
        .get('/api/v1/pipeline')
        .set('Authorization', `Bearer ${investor1Token}`);
      expect(pipeRes.body.data.in_discussion.some((p: any) => p.startup_id === startup1Id)).toBe(true);
    });

    it('founder can propose an alternative date (reschedule)', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Meeting proposal',
        });

      const requestId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/pitch-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          action: 'reschedule',
          proposed_date: nextWeek,
          message: 'Tomorrow is tight, does next week work?',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.counter_date).toBe(nextWeek);
      expect(res.body.data.status).toBe('pending');
    });

    it('allows exchanging typed info messages on a pitch request', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Meeting proposal',
        });

      const requestId = createRes.body.data.id;

      // Investor asks for info
      const msgRes1 = await request(app)
        .post(`/api/v1/pitch-requests/${requestId}/messages`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          content: 'Could you share recent monthly sensor installation numbers?',
          message_type: 'info_request',
        });
      expect(msgRes1.status).toBe(201);
      expect(msgRes1.body.data.message_type).toBe('info_request');

      // Founder responds
      const msgRes2 = await request(app)
        .post(`/api/v1/pitch-requests/${requestId}/messages`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({
          content: 'We reached 120 installations in Ludhiana this past month.',
          message_type: 'info_response',
        });
      expect(msgRes2.status).toBe(201);

      // List messages
      const listRes = await request(app)
        .get(`/api/v1/pitch-requests/${requestId}`)
        .set('Authorization', `Bearer ${founder1Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.messages.length).toBe(2);
    });
  });

  describe('4. Connections and Direct Messaging', () => {
    it('handles connection lifecycle: request, duplicate 409, and accept', async () => {
      // Founder 1 requests connection with Founder 2
      const reqRes = await request(app)
        .post('/api/v1/connections')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ recipient_id: founder2Id });

      expect(reqRes.status).toBe(201);
      expect(reqRes.body.data.status).toBe('pending');

      const connectionId = reqRes.body.data.id;

      // Duplicate connection request returns 409
      const dupRes = await request(app)
        .post('/api/v1/connections')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ recipient_id: founder2Id });

      expect(dupRes.status).toBe(409);

      // Founder 2 accepts connection
      const acceptRes = await request(app)
        .patch(`/api/v1/connections/${connectionId}`)
        .set('Authorization', `Bearer ${founder2Token}`)
        .send({ action: 'accept' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('approved');
    });

    it('blocks messaging between unconnected users with 403', async () => {
      // Founder 1 attempts to message unconnected mentor
      const res = await request(app)
        .post(`/api/v1/conversations/${unconnectedUserId}/messages`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ content: 'Hello, are you available for consulting?' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MESSAGING_NOT_ALLOWED');
    });

    it('allows messaging between connected users', async () => {
      // Connect Founder 1 and Founder 2
      const connRes = await request(app)
        .post('/api/v1/connections')
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ recipient_id: founder2Id });
      await request(app)
        .patch(`/api/v1/connections/${connRes.body.data.id}`)
        .set('Authorization', `Bearer ${founder2Token}`)
        .send({ action: 'accept' });

      // Founder 1 sends message to Founder 2
      const sendRes = await request(app)
        .post(`/api/v1/conversations/${founder2Id}/messages`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ content: 'Great connecting with you Riya!' });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.data.content).toBe('Great connecting with you Riya!');

      // Founder 2 gets conversation messages
      const getRes = await request(app)
        .get(`/api/v1/conversations/${founder1Id}/messages`)
        .set('Authorization', `Bearer ${founder2Token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(1);
      expect(getRes.body.data[0].content).toBe('Great connecting with you Riya!');

      // Founder 2 marks conversation as read
      const readRes = await request(app)
        .patch(`/api/v1/conversations/${founder1Id}/read`)
        .set('Authorization', `Bearer ${founder2Token}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.marked_count).toBe(1);
    });

    it('allows messaging between parties of an accepted pitch request without separate connection', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      // Investor 1 sends pitch request to FarmSense (Founder 1)
      const prRes = await request(app)
        .post('/api/v1/pitch-requests')
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({
          startup_id: startup1Id,
          proposed_date: tomorrow,
          message: 'Pitch meeting request',
        });

      // Founder 1 accepts pitch request
      await request(app)
        .patch(`/api/v1/pitch-requests/${prRes.body.data.id}/respond`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ action: 'accept' });

      // Now Investor 1 can message Founder 1 directly!
      const msgRes = await request(app)
        .post(`/api/v1/conversations/${founder1Id}/messages`)
        .set('Authorization', `Bearer ${investor1Token}`)
        .send({ content: 'Thanks for accepting the meeting. Where should we send calendar invite?' });

      expect(msgRes.status).toBe(201);

      // Founder 1 replies back
      const replyRes = await request(app)
        .post(`/api/v1/conversations/${investor1Id}/messages`)
        .set('Authorization', `Bearer ${founder1Token}`)
        .send({ content: 'Please send to manmeet@farmsense.example.com' });

      expect(replyRes.status).toBe(201);

      // List conversations for Founder 1
      const convRes = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${founder1Token}`);

      expect(convRes.status).toBe(200);
      expect(convRes.body.data.some((c: any) => c.other_user.id === investor1Id)).toBe(true);
    });
  });
});
