import { query } from '../db/index.js';
import { app } from '../app.js';
import request from 'supertest';

async function verifySignupEndToEnd() {
  const timestamp = Date.now();
  const email = `phase0.founder.${timestamp}@foundersden.test`;
  const fullName = `Phase0 Founder ${timestamp}`;

  console.log(`[Phase 0 Verification] Registering founder: ${email}`);

  // 1. Create founder via API
  const signupRes = await request(app)
    .post('/api/v1/auth/signup')
    .send({
      email,
      password: 'Password123!',
      full_name: fullName,
      role: 'founder',
      organization: 'Founders Den Demo Org',
      is_student: false,
    });

  if (signupRes.status !== 201) {
    console.error('Signup failed:', signupRes.status, signupRes.body);
    process.exit(1);
  }

  const { token, user } = signupRes.body.data;
  console.log(`[Phase 0 Verification] Signup API response HTTP ${signupRes.status} created user ID: ${user.id}`);

  // 2. Query auth.users
  const authUserRes = await query<{
    id: string;
    email: string;
    role: string;
    created_at: string;
  }>(
    `SELECT id, email, role, created_at FROM auth.users WHERE id = $1`,
    [user.id]
  );
  console.log('[Phase 0 Verification] Row in auth.users:');
  console.table(authUserRes.rows);

  // 3. Query public.profiles
  const profileRes = await query<{
    id: string;
    email: string;
    role: string;
    full_name: string;
    verification_status: string;
    created_at: string;
  }>(
    `SELECT id, email, role, full_name, verification_status, created_at FROM public.profiles WHERE id = $1`,
    [user.id]
  );
  console.log('[Phase 0 Verification] Row in public.profiles:');
  console.table(profileRes.rows);

  // 4. Call GET /api/v1/me with the token
  const meRes = await request(app)
    .get('/api/v1/me')
    .set('Authorization', `Bearer ${token}`);

  console.log(`[Phase 0 Verification] GET /api/v1/me response status: ${meRes.status}`);
  console.log('[Phase 0 Verification] GET /api/v1/me profile data:');
  console.log(JSON.stringify(meRes.body.data, null, 2));

  process.exit(0);
}

verifySignupEndToEnd().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
