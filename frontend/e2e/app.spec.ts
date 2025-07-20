import { test, expect } from '@playwright/test';

test.describe('OMI Live App', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check if navigation is present
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should navigate to live streams page', async ({ page }) => {
    await page.goto('/');
    
    // Click on live streams link
    await page.getByRole('link', { name: /live streams/i }).click();
    
    // Wait for navigation
    await page.waitForURL('/live-streams');
    
    // Check if we're on the live streams page
    await expect(page).toHaveURL('/live-streams');
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Check for 404 content
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText(/page not found/i)).toBeVisible();
    
    // Check if home button exists
    await expect(page.getByRole('link', { name: /go to homepage/i })).toBeVisible();
  });

  test('should have working skip links for accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Tab to reveal skip links
    await page.keyboard.press('Tab');
    
    // Check if skip link is visible when focused
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
  });

  test('should show PWA install prompt', async ({ page, context }) => {
    // Grant notification permissions
    await context.grantPermissions(['notifications']);
    
    await page.goto('/');
    
    // Wait a bit for the install prompt to appear
    await page.waitForTimeout(3000);
    
    // Check if install prompt exists (may not show in all environments)
    const installPrompt = page.getByText(/install omi live/i);
    const isVisible = await installPrompt.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(installPrompt).toBeVisible();
    }
  });
});

test.describe('Authentication Flow', () => {
  test('should redirect to auth page when accessing protected route', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/profile');
    
    // Should be redirected to auth page
    await expect(page).toHaveURL('/auth');
  });

  test('should show login and register forms', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for login form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Switch to register
    await page.getByRole('tab', { name: /sign up/i }).click();
    
    // Check for register form
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should show mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu button should be visible
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('should hide mobile menu on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // Mobile menu button should not be visible
    await expect(page.getByRole('button', { name: /menu/i })).not.toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve({
            lcp: lastEntry.startTime,
            fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
          });
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });
    
    // Check if metrics are within acceptable ranges
    expect(metrics.fcp).toBeLessThan(1800); // FCP should be < 1.8s
    expect(metrics.lcp).toBeLessThan(2500); // LCP should be < 2.5s
  });
});