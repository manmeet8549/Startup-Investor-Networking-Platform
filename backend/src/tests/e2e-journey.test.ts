import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Iteration 10: End-to-End Platform Journey', () => {
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

  // 1. Founder registers, creates startup, uploads pitch deck
  it('Phase 1: Founder registers, creates startup profile, and uploads deck', async () => {
    // 1.1 Founder registration
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'e2e.founder@foundersden.test',
        password: 'Password123!',
        full_name: 'Harpreet Singh',
        role: 'founder',
        organization: 'SolarGrow Labs',
        is_student: true,
      });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.data).toHaveProperty('token');
    expect(signupRes.body.data.user.role).toBe('founder');
    expect(signupRes.body.data.user.is_student).toBe(true);
    founderToken = signupRes.body.data.token;
    founderId = signupRes.body.data.user.id;

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
    expect(startupRes.body.data).toHaveProperty('id');
    expect(startupRes.body.data.name).toBe('SolarGrow Labs');
    startupId = startupRes.body.data.id;

    // 1.3 Founder uploads pitch deck
    const uploadRes = await request(app)
      .post(`/api/v1/startups/${startupId}/documents`)
      .set('Authorization', `Bearer ${founderToken}`)
      .field('title', 'SolarGrow Seed Pitch Deck')
      .field('visibility', 'public')
      .attach('file', Buffer.from('%PDF-1.4 mock pdf content for end-to-end testing'), 'solargrow-deck.pdf');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.title).toBe('SolarGrow Seed Pitch Deck');
    expect(uploadRes.body.data.version).toBe(1);
    deckDocumentId = uploadRes.body.data.id;

    // 1.4 Verify download URL generation
    const downloadRes = await request(app)
      .get(`/api/v1/documents/${deckDocumentId}/download`)
      .set('Authorization', `Bearer ${founderToken}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.data.download_url).toBeDefined();
    expect(downloadRes.body.data.expires_in).toBe(60);
  });

  // 2. Admin approves an investor
  it('Phase 2: Investor registers in pending state, Admin reviews and approves', async () => {
    // 2.1 Investor registers
    const investorSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'e2e.investor@foundersden.test',
        password: 'Password123!',
        full_name: 'Chandigarh Green Ventures',
        role: 'investor',
        organization: 'CGV Fund I',
      });

    expect(investorSignup.status).toBe(201);
    expect(investorSignup.body.data.user.role).toBe('investor');
    expect(investorSignup.body.data.user.verification_status).toBe('pending');
    investorToken = investorSignup.body.data.token;
    investorId = investorSignup.body.data.user.id;

    // 2.2 Admin logs in
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@foundersden.test',
        password: 'Password123!',
      });

    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.data.user.role).toBe('admin');
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
  });

  // 3. Matching returns results for investor
  it('Phase 3: Investor configures preferences, Smart Matching returns ranked results', async () => {
    // 3.1 Investor sets investment thesis & criteria
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
    expect(prefsRes.body.data.sectors).toContain('AgriTech');

    // 3.2 Matching query for investor
    const matchRes = await request(app)
      .get('/api/v1/matches/startups')
      .set('Authorization', `Bearer ${investorToken}`);

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.data.length).toBeGreaterThan(0);

    const solarGrowMatch = matchRes.body.data.find(
      (m: any) => m.startup?.id === startupId || m.startup?.name === 'SolarGrow Labs'
    );
    expect(solarGrowMatch).toBeDefined();
    expect(solarGrowMatch.score).toBeGreaterThanOrEqual(70);
    expect(solarGrowMatch.breakdown).toBeDefined();
    expect(solarGrowMatch.reasons.length).toBeGreaterThan(0);
    expect(matchRes.body.disclaimer).toBeDefined();
  });

  // 4. Investor requests a meeting
  it('Phase 4: Investor requests a pitch meeting with founder', async () => {
    const pitchRes = await request(app)
      .post('/api/v1/pitch-requests')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        startup_id: startupId,
        proposed_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        message: 'Impressive match with our AgriTech fund thesis. Would love a 30-min intro pitch.',
      });

    expect(pitchRes.status).toBe(201);
    expect(pitchRes.body.data.startup_id).toBe(startupId);
    expect(pitchRes.body.data.status).toBe('pending');
    pitchRequestId = pitchRes.body.data.id;
  });

  // 5. Founder accepts meeting request
  it('Phase 5: Founder accepts the meeting request and messaging unlocks', async () => {
    const acceptRes = await request(app)
      .patch(`/api/v1/pitch-requests/${pitchRequestId}/respond`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        action: 'accept',
        message: 'Happy to connect. Calendar invite confirmed.',
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('approved');

    // Investor and founder can now exchange messages directly
    const msgRes = await request(app)
      .post(`/api/v1/conversations/${founderId}/messages`)
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        content: 'Hi Harpreet, look forward to our pitch session this Thursday.',
      });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.data.content).toContain('Thursday');
  });

  // 6. Mentor gives feedback
  it('Phase 6: Mentor gives structured feedback on the startup', async () => {
    // 6.1 Mentor logs in
    const mentorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'kavita@foundersden.test',
        password: 'Password123!',
      });

    expect(mentorLogin.status).toBe(200);
    mentorToken = mentorLogin.body.data.token;

    // 6.2 Mentor submits structured feedback
    const feedbackRes = await request(app)
      .post(`/api/v1/startups/${startupId}/feedback`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        rating: 5,
        feedback: 'Exceptional solar pump efficiency and farmer adoption numbers. Focus on regional dealer distribution next.',
        strengths: ['Low cost hardware BOM', 'Direct farmer validation'],
        areas_for_improvement: ['After-sales support SLA'],
      });

    expect(feedbackRes.status).toBe(201);
    expect(feedbackRes.body.data.rating).toBe(5);
    expect(feedbackRes.body.data.feedback).toContain('Exceptional solar pump efficiency');

    // 6.3 Founder reads feedback
    const readFeedbackRes = await request(app)
      .get(`/api/v1/startups/${startupId}/feedback`)
      .set('Authorization', `Bearer ${founderToken}`);

    expect(readFeedbackRes.status).toBe(200);
    expect(readFeedbackRes.body.data.length).toBeGreaterThan(0);
  });

  // 7. Incubator creates program, founder applies, incubator accepts application
  it('Phase 7: Incubator publishes cohort program, Founder applies, Incubator accepts application', async () => {
    // 7.1 Incubator logs in
    const incubatorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'punjab@foundersden.test',
        password: 'Password123!',
      });

    expect(incubatorLogin.status).toBe(200);
    incubatorToken = incubatorLogin.body.data.token;

    // 7.2 Incubator creates cohort program
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
    expect(programRes.body.data.title).toBe('Northern AgriTech Scale Accelerator 2026');
    programId = programRes.body.data.id;

    // 7.3 Founder applies with startup
    const applyRes = await request(app)
      .post(`/api/v1/programs/${programId}/apply`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        startup_id: startupId,
        pitch_summary: 'We have 25 live pilot sites in Punjab and seek support to manufacture our v2 controllers.',
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.status).toBe('submitted');
    applicationId = applyRes.body.data.id;

    // 7.4 Incubator reviews and advances through state machine
    // Move to under_review
    const reviewRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        status: 'under_review',
        decision_notes: 'Initial documents screened and verified by selection panel.',
      });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe('under_review');

    // Move to shortlisted
    const shortlistRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        status: 'shortlisted',
        decision_notes: 'Shortlisted for in-person jury interview.',
      });
    expect(shortlistRes.status).toBe(200);
    expect(shortlistRes.body.data.status).toBe('shortlisted');

    // Move to accepted
    const acceptRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${incubatorToken}`)
      .send({
        status: 'accepted',
        decision_notes: 'Accepted into Cohort 4! Welcome to the hub.',
      });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('accepted');

    // 7.5 Founder sees accepted status in /me/applications
    const myAppsRes = await request(app)
      .get('/api/v1/me/applications')
      .set('Authorization', `Bearer ${founderToken}`);

    expect(myAppsRes.status).toBe(200);
    const myApp = myAppsRes.body.data.find((a: any) => a.id === applicationId);
    expect(myApp).toBeDefined();
    expect(myApp.status).toBe('accepted');
    expect(myApp.decision_notes).toContain('Accepted into Cohort 4');
  });

  // 8. Documentation route verification
  it('Phase 8: Documentation route /api/docs and openapi.yaml are live', async () => {
    const yamlRes = await request(app).get('/api/docs/openapi.yaml');
    expect(yamlRes.status).toBe(200);
    expect(yamlRes.headers['content-type']).toContain('yaml');
    expect(yamlRes.text).toContain('openapi: 3.0.3');
    expect(yamlRes.text).toContain('Founders Den API');

    const htmlRes = await request(app).get('/api/docs');
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers['content-type']).toContain('html');
    expect(htmlRes.text).toContain('SwaggerUIBundle');
  });
});
