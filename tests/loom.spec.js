import { test, expect } from '@playwright/test';

const USER_A_EMAIL = 'your_email_here';
const USER_A_PASSWORD = 'your_password_here';
const BASE_URL = 'http://localhost:5173';

test.use({ 
  browserName: 'chromium',
  headless: false,
  slowMo: 500,
});

test('TEST 1 — Login works', async ({ page }) => {
  console.log('Navigating to login page...');
  await page.goto(BASE_URL + '/login');
  
  await page.waitForTimeout(2000);
  await page.screenshot({ 
    path: 'tests/screenshots/1-login-page.png' 
  });
  console.log('Screenshot taken of login page');

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  const emailVisible = await emailInput.isVisible();
  const passwordVisible = await passwordInput.isVisible();
  console.log('Email input visible:', emailVisible);
  console.log('Password input visible:', passwordVisible);

  if (!emailVisible || !passwordVisible) {
    console.log('FAIL — Login form inputs not found');
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    return;
  }

  await emailInput.fill(USER_A_EMAIL);
  await passwordInput.fill(USER_A_PASSWORD);
  
  await page.screenshot({ 
    path: 'tests/screenshots/2-filled-form.png' 
  });

  const submitButton = page.locator('button').filter({ 
    hasText: /sign in/i 
  }).first();
  
  const buttonVisible = await submitButton.isVisible();
  console.log('Submit button visible:', buttonVisible);
  
  if (!buttonVisible) {
    const allButtons = await page.locator('button')
      .allTextContents();
    console.log('All buttons on page:', allButtons);
    return;
  }

  console.log('Clicking Sign in...');
  await submitButton.click();
  
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log('URL after login attempt:', currentUrl);
  
  await page.screenshot({ 
    path: 'tests/screenshots/3-after-login.png' 
  });

  const isOnLogin = currentUrl.includes('/login');
  const isOnHome = currentUrl === BASE_URL + '/' || 
    currentUrl === BASE_URL + '/discover' ||
    currentUrl === BASE_URL + '/onboarding';
  
  if (isOnLogin) {
    console.log('FAIL — Still on login page after submit');
    const errorText = await page.locator(
      '[class*="error"], [class*="alert"]'
    ).allTextContents();
    console.log('Error messages:', errorText);
  } else {
    console.log('PASS — Login successful, now on:', 
      currentUrl);
  }
});

test('TEST 2 — Discovery feed', async ({ page }) => {
  await page.goto(BASE_URL + '/login');
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="email"]', USER_A_EMAIL);
  await page.fill('input[type="password"]', USER_A_PASSWORD);
  
  await page.locator('button').filter({ 
    hasText: /sign in/i 
  }).first().click();
  
  await page.waitForTimeout(5000);
  
  console.log('After login URL:', page.url());
  
  if (page.url().includes('/login')) {
    console.log('FAIL — Could not log in');
    return;
  }

  if (page.url().includes('/onboarding')) {
    console.log('NOTE — User needs onboarding first');
    return;
  }

  await page.goto(BASE_URL + '/discover');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ 
    path: 'tests/screenshots/4-discover.png',
    fullPage: true 
  });
  
  console.log('Discover page URL:', page.url());
  
  const pageContent = await page.content();
  
  const hasNoOne = pageContent.includes('No one nearby');
  const hasCards = await page.locator(
    '[class*="card"], [class*="Card"]'
  ).count();
  const hasEmpty = await page.locator(
    'text=No one nearby'
  ).isVisible().catch(() => false);
  
  console.log('Empty state visible:', hasEmpty);
  console.log('Card elements found:', hasCards);
  
  if (hasEmpty) {
    console.log('RESULT — Discovery is empty');
    
    const apiResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/discovery');
        const data = await res.json();
        return { 
          status: res.status, 
          keys: Object.keys(data),
          cardCount: data.cards?.length ?? 
            data.users?.length ?? 'unknown'
        };
      } catch(e) {
        return { error: e.message };
      }
    });
    console.log('Direct API call result:', 
      JSON.stringify(apiResponse));
  } else if (hasCards > 0) {
    console.log('PASS — Discovery shows', hasCards, 
      'card elements');
  } else {
    console.log('UNCLEAR — Check screenshot');
  }
});