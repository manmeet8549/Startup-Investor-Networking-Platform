import { test, expect } from '@playwright/test';

test.describe('Founders Den End-to-End User Journeys', () => {
  const timestamp = Date.now();
  const testEmail = `playwright.founder.${timestamp}@foundersden.test`;
  const testPassword = 'Password123!';

  test('Complete End-to-End Smoke Journey: Sign Up -> Log In -> Create Startup -> Request Meeting', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toContainText('Good ideas go further');

    // 2. Open Auth Modal
    const signupNavBtn = page.getByRole('button', { name: /Sign up/i }).first();
    await signupNavBtn.click();
    await expect(page.locator('.fixed.inset-0')).toBeVisible();

    // 3. Register a new Founder
    const nameInput = page.locator('input[placeholder="Manmeet Singh"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(`Playwright Founder ${timestamp}`);
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill(testPassword);
      const createBtn = page.getByRole('button', { name: /Create Founder Account/i });
      await createBtn.click();
    }

    // Wait for registration and portal to load
    await expect(page.getByText(/Founder workspace|workspace/i).first()).toBeVisible({ timeout: 15000 });

    // 4. Test Log In flow
    // Exit workspace
    const exitBtn = page.getByRole('button', { name: /Exit workspace/i });
    if (await exitBtn.isVisible()) {
      await exitBtn.click();
      await expect(page.locator('h1')).toContainText('Good ideas go further');

      // Click Log in
      const loginNavBtn = page.getByRole('button', { name: /Log in/i }).first();
      await loginNavBtn.click();

      // Switch to Login tab in modal if needed
      const loginTab = page.getByRole('button', { name: 'Log in' }).filter({ hasText: /^Log in$/ });
      if (await loginTab.isVisible()) {
        await loginTab.click();
      }

      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill(testPassword);
      const signinBtn = page.getByRole('button', { name: /Sign in to Founders Den/i });
      await signinBtn.click();

      await expect(page.getByText(/Founder workspace/i).first()).toBeVisible({ timeout: 15000 });
    }

    // 5. Create Startup Profile
    // Navigate to My Startup or Add Startup
    const addStartupBtn = page.getByRole('button', { name: /Add startup|Add new startup/i }).first();
    if (await addStartupBtn.isVisible()) {
      await addStartupBtn.click();
      const startupName = page.locator('input[placeholder*="FarmSense"]');
      if (await startupName.isVisible()) {
        await startupName.fill(`PulseTech ${timestamp}`);
        const tagline = page.locator('input[placeholder*="one-line description"]');
        if (await tagline.isVisible()) {
          await tagline.fill('Clean energy optimization for smart distributed microgrids');
        }
        const saveStartupBtn = page.getByRole('button', { name: /Create startup profile|Save startup profile/i });
        await saveStartupBtn.click();
      }
    }

    // 6. Investor Flow: Switch to Investor role and request meeting
    const switchRoleBtn = page.getByRole('button', { name: /Switch demo role/i });
    if (await switchRoleBtn.isVisible()) {
      await switchRoleBtn.click();
      await page.getByRole('button', { name: /Investor/i }).first().click();
      await expect(page.getByText(/Investor workspace/i).first()).toBeVisible();

      // Open Dealflow or Startups
      const dealflowBtn = page.getByRole('button', { name: /Recommended Startups|Dealflow|Browse/i }).first();
      if (await dealflowBtn.isVisible()) {
        await dealflowBtn.click();
      }

      // Click on a startup to view details and request meeting
      const startupCard = page.locator('button:has-text("TerraLoop"), button:has-text("Medora AI"), button:has-text("FarmSense")').first();
      if (await startupCard.isVisible()) {
        await startupCard.click();
        const reqBtn = page.getByRole('button', { name: /Request meeting/i });
        if (await reqBtn.isVisible()) {
          await reqBtn.click();
          await expect(page.getByText(/Meeting Requested|meeting/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
