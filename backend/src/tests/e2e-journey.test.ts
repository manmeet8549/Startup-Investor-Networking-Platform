import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { query } from '../db/pool.js';

describe('Iteration 10: End-to-End Platform Journey (8 Real Phases)', () => {
  let founderToken: string;
  let founderId: string;
  let startupId: string;
  let deckDocumentId: string;

  let investorToken: string;
  let investorId: string;
  let adminToken: string;

  let pitchRequestId: string;
  let mentorToken: string;

  let incubatorToken: string;
  let programId: string;
  let applicationId: string;

  const testRunId = Date.now();
  const founderEmail = `e2e.founder.${testRunId}@foundersden.test`;
  const investorEmail = `e2e.investor.${testRunId}@foundersden.test`;

  // Track created entities for isolated teardown
  const createdUserIds: string[] = [];
  const createdStartupIds: string[] = [];
  const createdDocumentIds: string[] = [];
  const createdProgramIds: string[] = [];
  const createdApplicationIds: string[] = [];

  // Helper to query table count with real network latency timing
  async function getTableCount(table: string): Promise<{ count: number; latencyMs: number }> {
    const t0 = performance.now();
    const res = await query<{ count: string }>(`SELECT COUNT(*) as count FROM public."${table}"`);
    const latencyMs = Math.round(performance.now() - t0);
    return { count: parseInt(res.rows[0].count, 10), latencyMs };
  }

  afterAll(async () => {
    // Teardown: clean up only rows created during this test run
    try {
      if (createdUserIds.length > 0) {
        await query('DELETE FROM public.notifications WHERE user_id = ANY($1)', [createdUserIds]);
        await query('DELETE FROM public.verification_requests WHERE user_id = ANY($1)', [createdUserIds]);
      }
      if (createdStartupIds.length > 0) {
        await query('DELETE FROM public.documents WHERE startup_id = ANY($1)', [createdStartupIds]);
        await query('DELETE FROM public.startups WHERE id = ANY($1)', [createdStartupIds]);
      }
      if (createdUserIds.length > 0) {
        await query('DELETE FROM public.founder_profiles WHERE user_id = ANY($1)', [createdUserIds]);
        await query('DELETE FROM public.investor_profiles WHERE user_id = ANY($1)', [createdUserIds]);
        await query('DELETE FROM public.profiles WHERE id = ANY($1)', [createdUserIds]);
        await query('DELETE FROM auth.identities WHERE user_id = ANY($1)', [createdUserIds]);
        await query('DELETE FROM auth.users WHERE id = ANY($1)', [createdUserIds]);
      }
    } catch (cleanupErr) {
      console.warn('[E2E Journey Cleanup Warning]', cleanupErr);
    }
  });

  // Phase 1: Founder registers, creates startup, uploads pitch deck
  it('Phase 1: Founder registers, creates startup profile, and uploads deck', async () => {
    const beforeProfiles = await getTableCount('profiles');
    const beforeStartups = await getTableCount('startups');
    const beforeDocs = await getTableCount('documents');
    console.log(`[Phase 1] DB Counts BEFORE -> profiles: ${beforeProfiles.count} (${beforeProfiles.latencyMs}ms), startups: ${beforeStartups.count} (${beforeStartups.latencyMs}ms), docs: ${beforeDocs.count} (${beforeDocs.latencyMs}ms)`);

    // 1.1 Founder registration
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: founderEmail,
        password: 'Password123!',
        full_name: 'Harpreet Singh',
        role: 'founder',
        organization: 'SolarGrow Labs',
        is_student: true,
      });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.data).toHaveProperty('token');
    expect(signupRes.body.data.user.role).toBe('founder');
    founderToken = signupRes.body.data.token;
    founderId = signupRes.body.data.user.id;
    createdUserIds.push(founderId);

    // 1.2 Founder creates startup profile
    const startupRes = await request(app)
      .post('/api/v1/startups')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        name: 'SolarGrow Labs',
        tagline: 'Solar-powered automated micro-irrigation for orchards',
        description: 'Complete IoT sensory hardware and solar pumps tailored for smallholder farmers.',
        sectors: ['AgriTech'],
        stage: 'mvp',
        location: 'Chandigarh',
        funding_ask: 400000,
        business_model: 'B2B',
        visibility: 'public',
      });

    expect(startupRes.status).toBe(201);
    startupId = startupRes.body.data.id;
    createdStartupIds.push(startupId);

    // 1.3 Founder uploads pitch deck
    const uploadRes = await request(app)
      .post(`/api/v1/startups/${startupId}/documents`)
      .set('Authorization', `Bearer ${founderToken}`)
      .field('title', 'SolarGrow Seed Pitch Deck')
      .field('visibility', 'public')
      .attach('file', Buffer.from('%PDF-1.4 mock pdf content for end-to-end testing'), 'solargrow-deck.pdf');

    expect(uploadRes.status).toBe(201);
    deckDocumentId = uploadRes.body.data.id;
    createdDocumentIds.push(deckDocumentId);

    // 1.4 Verify download URL generation
    const downloadRes = await request(app)
      .get(`/api/v1/documents/${deckDocumentId}/download`)
      .set('Authorization', `Bearer ${founderToken}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.data.download_url).toBeDefined();

    const afterProfiles = await getTableCount('profiles');
    const afterStartups = await getTableCount('startups');
    const afterDocs = await getTableCount('documents');
    console.log(`[Phase 1] DB Counts AFTER  -> profiles: ${afterProfiles.count} (delta: +${afterProfiles.count - beforeProfiles.count}, ${afterProfiles.latencyMs}ms), startups: ${afterStartups.count} (delta: +${afterStartups.count - beforeStartups.count}, ${afterStartups.latencyMs}ms), docs: ${afterDocs.count} (delta: +${afterDocs.count - beforeDocs.count}, ${afterDocs.latencyMs}ms)`);
    expect(afterProfiles.count).toBe(beforeProfiles.count + 1);
    expect(afterStartups.count).toBe(beforeStartups.count + 1);
    expect(afterDocs.count).toBe(beforeDocs.count + 1);
  });

  // Phase 2: Admin approves an investor
  it('Phase 2: Investor registers in pending state, Admin reviews and approves', async () => {
    const beforeQueue = await getTableCount('verification_requests');
    const beforeProfiles = await getTableCount('profiles');
    console.log(`[Phase 2] DB Counts BEFORE -> profiles: ${beforeProfiles.count} (${beforeProfiles.latencyMs}ms), verification_requests: ${beforeQueue.count} (${beforeQueue.latencyMs}ms)`);

    // 2.1 Investor registers
    const investorSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: investorEmail,
        password: 'Password123!',
        full_name: 'Chandigarh Green Ventures',
        role: 'investor',
        organization: 'CGV Fund I',
      });

    expect(investorSignup.status).toBe(201);
    expect(investorSignup.body.data.user.verification_status).toBe('pending');
    investorToken = investorSignup.body.data.token;
    investorId = investorSignup.body.data.user.id;
    createdUserIds.push(investorId);

    // 2.2 Admin logs in
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@foundersden.test',
        password: 'Password123!',
      });

    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;

    // 2.3 Admin lists verification queue
    const queueRes = await request(app)
      .get('/api/v1/admin/verifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(queueRes.status).toBe(200);
    const targetReq = queueRes.body.data.find((v: any) => v.user_id === investorId);
    expect(targetReq).toBeDefined();

    // 2.4 Admin approves investor
    const approveRes = await request(app)
      .post(`/api/v1/admin/verifications/${targetReq.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'SEBI Cat-I AIF registration verified.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.user.verification_status).toBe('verified');

    const afterProfiles = await getTableCount('profiles');
    const afterQueue = await getTableCount('verification_requests');
    console.log(`[Phase 2] DB Counts AFTER  -> profiles: ${afterProfiles.count} (delta: +${afterProfiles.count - beforeProfiles.count}, ${afterProfiles.latencyMs}ms), verification_requests: ${afterQueue.count} (${afterQueue.latencyMs}ms)`);
    expect(afterProfiles.count).toBe(beforeProfiles.count + 1);
  });

  // Phase 3: Matching returns results for investor
  it('Phase 3: Investor configures preferences, Smart Matching returns ranked results', async () => {
    const t0 = performance.now();
    const prefsRes = await request(app)
      .put('/api/v1/investors/preferences')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        sectors: ['AgriTech', 'Climate Tech'],
        stages: ['mvp', 'early_traction'],
        ticket_min: 100000,
        ticket_max: 600000,
        regions: ['Chandigarh', 'Punjab'],
        business_models: ['B2B'],
        thesis: 'Targeting high-impact agricultural hardware and climate tech across northern India.',
      });

    expect(prefsRes.status).toBe(200);

    const matchRes = await request(app)
      .get('/api/v1/matches/startups')
      .set('Authorization', `Bearer ${investorToken}`);

    const elapsed = Math.round(performance.now() - t0);
    expect(matchRes.status).toBe(200);
    expect(matchRes.body.data.length).toBeGreaterThan(0);
    console.log(`[Phase 3] Matching query completed in ${elapsed}ms, returned ${matchRes.body.data.length} ranked startups for approved investor`);
  });

  // Phase 4: Investor requests a meeting
  it('Phase 4: Investor requests a pitch meeting with founder', async () => {
    const t0 = performance.now();
    const pitchRes = await request(app)
      .post('/api/v1/pitch-requests')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        startup_id: startupId,
        proposed_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        message: 'Impressive match with our AgriTech fund thesis. Would love a 30-min intro pitch.',
      });

    const elapsed = Math.round(performance.now() - t0);
    expect(pitchRes.status).toBe(201);
    expect(pitchRes.body.data.startup_id).toBe(startupId);
    expect(pitchRes.body.data.status).toBe('pending');
    pitchRequestId = pitchRes.body.data.id;
    console.log(`[Phase 4] Investor requested pitch meeting in ${elapsed}ms -> pitchRequestId: ${pitchRequestId}`);
  });

  // Phase 5: Founder accepts meeting request and messaging unlocks
  it('Phase 5: Founder accepts meeting request and messaging unlocks', async () => {
    const t0 = performance.now();
    const acceptRes = await request(app)
      .patch(`/api/v1/pitch-requests/${pitchRequestId}/respond`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        action: 'accept',
        message: 'Happy to connect. Calendar invite confirmed.',
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('approved');

    // Investor sends direct message
    const msgRes = await request(app)
      .post(`/api/v1/conversations/${founderId}/messages`)
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        content: 'Hi Harpreet, look forward to our pitch session this Thursday.',
      });

    const elapsed = Math.round(performance.now() - t0);
    expect(msgRes.status).toBe(201);
    expect(msgRes.body.data.content).toContain('Thursday');
    console.log(`[Phase 5] Pitch meeting accepted & messaging unlocked in ${elapsed}ms`);
  });

  // Phase 6: Mentor gives feedback
  it('Phase 6: Mentor gives structured feedback on the startup', async () => {
    const mentorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'kavita@foundersden.test',
        password: 'Password123!',
      });

    expect(mentorLogin.status).toBe(200);
    mentorToken = mentorLogin.body.data.token;

    const t0 = performance.now();
    const feedbackRes = await request(app)
      .post(`/api/v1/startups/${startupId}/feedback`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        rating: 5,
        feedback: 'Exceptional solar pump efficiency and farmer adoption numbers. Focus on regional dealer distribution next.',
        strengths: ['Low cost hardware BOM', 'Direct farmer validation'],
        areas_for_improvement: ['After-sales support SLA'],
      });

    const elapsed = Math.round(performance.now() - t0);
    expect(feedbackRes.status).toBe(201);
    console.log(`[Phase 6] Mentor submitted structured feedback in ${elapsed}ms`);
  });

  // Phase 7: Incubator creates program, founder applies, incubator accepts application
  it('Phase 7: Incubator publishes cohort program, Founder applies, Incubator accepts application', async () => {
    const incubatorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'punjab@foundersden.test',
        password: 'Password123!',
      });

    expect(incubatorLogin.status).toBe(200);
    incubatorToken = incubatorLogin.body.data.token;

    // 7.2 Program creation
    const programRes = await request(app)
      .post('/api/v1/programs')
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        title: 'Northern AgriTech Scale Accelerator 2026',
        description: 'Comprehensive 12-week acceleration program with grant equity matching.',
        sectors: ['AgriTech', 'CleanTech', 'Hardware'],
        eligibility: 'MVP or early traction startups with working physical prototypes.',
        benefits: 'INR 15 Lakh non-dilutive grant, lab testing facilities, and mentor network.',
        deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
      });

    expect(programRes.status).toBe(201);
    programId = programRes.body.data.id;
    createdProgramIds.push(programId);

    // 7.3 Founder applies
    const applyRes = await request(app)
      .post(`/api/v1/programs/${programId}/apply`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        startup_id: startupId,
        pitch_summary: 'We have 25 live pilot sites in Punjab and seek support to manufacture our v2 controllers.',
      });

    expect(applyRes.status).toBe(201);
    applicationId = applyRes.body.data.id;
    createdApplicationIds.push(applicationId);

    // 7.4 Step through state machine: submitted -> under_review -> shortlisted -> accepted
    const reviewRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        status: 'under_review',
        decision_notes: 'Initial screening passed.',
      });
    expect(reviewRes.status).toBe(200);

    const shortlistRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        status: 'shortlisted',
        decision_notes: 'Shortlisted for interview.',
      });
    expect(shortlistRes.status).toBe(200);

    const acceptRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        status: 'accepted',
        decision_notes: 'Accepted into Cohort 4! Welcome to the hub.',
      });
    expect(acceptRes.status).toBe(200);
    console.log(`[Phase 7] Incubator published program -> Founder applied -> Advanced to accepted`);
  });

  // Phase 8: Notifications verification against PostgreSQL
  it('Phase 8: Notifications generated across workflow are fetched, read-tracked, and marked as read', async () => {
    const beforeNotifs = await getTableCount('notifications');
    console.log(`[Phase 8] DB Counts BEFORE -> public.notifications: ${beforeNotifs.count} (${beforeNotifs.latencyMs}ms)`);

    // 8.1 Founder checks notifications list
    const notifsRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${founderToken}`);

    expect(notifsRes.status).toBe(200);
    expect(Array.isArray(notifsRes.body.data)).toBe(true);
    expect(notifsRes.body.data.length).toBeGreaterThanOrEqual(1);

    // 8.2 Founder checks unread count
    const unreadRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${founderToken}`);

    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.data.count).toBeGreaterThanOrEqual(1);

    // 8.3 Founder marks single notification as read
    const firstNotifId = notifsRes.body.data[0].id;
    const markReadRes = await request(app)
      .patch(`/api/v1/notifications/${firstNotifId}/read`)
      .set('Authorization', `Bearer ${founderToken}`);

    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.data.read).toBe(true);

    // 8.4 Founder marks all remaining notifications as read
    const readAllRes = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${founderToken}`);

    expect(readAllRes.status).toBe(200);

    // 8.5 Confirm unread count drops to 0
    const finalUnread = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${founderToken}`);

    expect(finalUnread.status).toBe(200);
    expect(finalUnread.body.data.count).toBe(0);

    const afterNotifs = await getTableCount('notifications');
    console.log(`[Phase 8] DB Counts AFTER  -> public.notifications: ${afterNotifs.count} (${afterNotifs.latencyMs}ms) - unread count verified: 0`);
  });
});
