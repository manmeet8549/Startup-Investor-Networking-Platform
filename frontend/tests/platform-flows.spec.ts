import { test, expect } from '@playwright/test';

test.describe('Founders Den End-to-End User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local frontend
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Flow 1: User can open auth modal, toggle between sign up and log in, and authenticate', async ({ page }) => {
    // 1. Verify Public landing page loads with key headlines
    await expect(page.locator('h1')).toContainText('Good ideas go further');

    // 2. Open auth modal via "Sign up" button in header or hero
    const signupBtn = page.getByRole('button', { name: /Sign up/i }).first();
    await signupBtn.click();

    // 3. Verify auth modal renders
    const authModal = page.locator('.fixed.inset-0');
    await expect(authModal).toBeVisible();

    // 4. Toggle between Sign in and Sign up
    const toggleToLogin = page.getByRole('button', { name: /Sign in here|Back to login/i });
    if (await toggleToLogin.isVisible()) {
      await toggleToLogin.click();
    }

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // 5. Fill credentials for demo founder
    await emailInput.fill('manmeet@foundersden.test');
    await passwordInput.fill('Password123!');

    // 6. Click sign in button
    const submitBtn = page.getByRole('button', { name: /Sign in to Founders Den|Create/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 7. Verify dashboard portal opens
    await expect(page.getByText(/Founder workspace|Manmeet Singh|My Startup/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Flow 2: Founder can create a new startup with details and pitch ask', async ({ page }) => {
    // 1. Switch to founder workspace directly or via role switcher
    const switchRoleBtn = page.getByRole('button', { name: /Switch demo role/i });
    if (await switchRoleBtn.isVisible()) {
      await switchRoleBtn.click();
      await page.getByRole('button', { name: /Founder/i }).first().click();
    }

    // 2. Click "Add startup" button
    const addStartupBtn = page.getByRole('button', { name: /Add startup/i }).first();
    await expect(addStartupBtn).toBeVisible();
    await addStartupBtn.click();

    // 3. Modal opens with startup creation inputs
    const startupNameInput = page.locator('input[placeholder*="FarmSense"]');
    await expect(startupNameInput).toBeVisible();
    await startupNameInput.fill('SolarPulse AI');

    const taglineInput = page.locator('input[placeholder*="one-line description"]');
    await expect(taglineInput).toBeVisible();
    await taglineInput.fill('Intelligent solar grid forecasting for rural cooperatives');

    // 4. Click "Create startup profile" button
    const saveBtn = page.getByRole('button', { name: /Create startup profile|Save startup profile/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 5. Toast confirms creation and modal closes
    await expect(page.locator('.fixed.bottom-5')).toBeVisible({ timeout: 5000 });
  });

  test('Flow 3: Investor can explore startups and request a meeting', async ({ page }) => {
    // 1. Switch to Investor workspace
    const switchRoleBtn = page.getByRole('button', { name: /Switch demo role/i });
    if (await switchRoleBtn.isVisible()) {
      await switchRoleBtn.click();
      await page.getByRole('button', { name: /Investor/i }).first().click();
    }

    // 2. Verify Investor workspace loads
    await expect(page.getByText(/Investor workspace/i).first()).toBeVisible();

    // 3. Open Recommended Startups or Dealflow tab
    const dealflowNav = page.getByRole('button', { name: /Recommended Startups|Dealflow|Watchlist/i }).first();
    if (await dealflowNav.isVisible()) {
      await dealflowNav.click();
    }

    // 4. Click on a startup card to open its detail modal
    const startupCard = page.locator('button:has-text("FarmSense"), button:has-text("SolarPulse"), button:has-text("View startup")').first();
    if (await startupCard.isVisible()) {
      await startupCard.click();
    } else {
      // Open from dashboard
      const anyCard = page.locator('.rounded-2xl.border.border-slate-100').first();
      await anyCard.click();
    }

    // 5. In modal, click "Request meeting"
    const requestMeetingBtn = page.getByRole('button', { name: /Request meeting/i });
    if (await requestMeetingBtn.isVisible()) {
      await requestMeetingBtn.click();
      // 6. Verify status transitions to "Meeting Requested"
      await expect(page.getByText(/Meeting Requested/i)).toBeVisible();
    }
  });
});
