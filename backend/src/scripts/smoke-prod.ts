// Smoke test runner against deployed or local production environment
// Configurable via SMOKE_API_URL and SMOKE_WEB_URL

const apiUrl = (process.env.SMOKE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const webUrl = (process.env.SMOKE_WEB_URL || 'http://localhost:3000').replace(/\/$/, '');

async function runProductionSmokeCheck() {
  console.log('====================================================');
  console.log('--- Founders Den: Production Smoke Verification ---');
  console.log(`Target API URL: ${apiUrl}`);
  console.log(`Target Web Origin: ${webUrl}`);
  console.log('====================================================\n');

  let failed = false;

  // 1. Root /health (platform monitor)
  try {
    const res = await fetch(`${apiUrl}/health`);
    const body = (await res.json()) as any;
    if (res.status === 200 && body.status === 'ok') {
      console.log(`[PASS] 1. GET /health returned HTTP 200 OK:`, body);
    } else {
      console.error(`[FAIL] 1. GET /health failed (Status: ${res.status}):`, body);
      failed = true;
    }
  } catch (err: any) {
    console.error(`[FAIL] 1. GET /health error:`, err.message);
    failed = true;
  }

  // 2. /api/v1/ready (database readiness check)
  try {
    const res = await fetch(`${apiUrl}/api/v1/ready`);
    const body = (await res.json()) as any;
    if (res.status === 200 && body?.data?.database === 'connected') {
      console.log(`[PASS] 2. GET /api/v1/ready returned HTTP 200 (DB connected, latency: ${body.data.latency_ms}ms)`);
    } else {
      console.error(`[FAIL] 2. GET /api/v1/ready failed (Status: ${res.status}):`, body);
      failed = true;
    }
  } catch (err: any) {
    console.error(`[FAIL] 2. GET /api/v1/ready error:`, err.message);
    failed = true;
  }

  // 3. CORS Preflight Check from Web Origin
  try {
    const res = await fetch(`${apiUrl}/api/v1/auth/signup`, {
      method: 'OPTIONS',
      headers: {
        Origin: webUrl,
        'Access-Control-Request-Method': 'POST',
      },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowCredentials = res.headers.get('access-control-allow-credentials');

    if (allowOrigin === webUrl && allowCredentials === 'true') {
      console.log(`[PASS] 3. CORS preflight succeeded for origin "${webUrl}" (Credentials: true)`);
    } else {
      console.error(
        `[FAIL] 3. CORS preflight mismatch: Origin=${allowOrigin}, Credentials=${allowCredentials}`
      );
      failed = true;
    }
  } catch (err: any) {
    console.error(`[FAIL] 3. CORS preflight error:`, err.message);
    failed = true;
  }

  // 4. Unauthenticated Public Discovery GET /api/v1/startups
  try {
    const res = await fetch(`${apiUrl}/api/v1/startups?limit=5`);
    const body = (await res.json()) as any;
    if (res.status === 200 && Array.isArray(body?.data)) {
      console.log(`[PASS] 4. GET /api/v1/startups returned HTTP 200 (${body.data.length} startups found)`);
    } else {
      console.error(`[FAIL] 4. GET /api/v1/startups failed (Status: ${res.status}):`, body);
      failed = true;
    }
  } catch (err: any) {
    console.error(`[FAIL] 4. GET /api/v1/startups error:`, err.message);
    failed = true;
  }

  console.log('\n====================================================');
  if (failed) {
    console.error('Smoke tests FAILED. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('All production smoke checks PASSED successfully!');
    process.exit(0);
  }
}

runProductionSmokeCheck();
