/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Locator, Page } from '@playwright/test';
import { test as base, expect as baseExpect } from '@playwright/test';
import { BulkPage } from './bulk-page';

type TestFixtures = {
  bulkPage: BulkPage;
};

// Extend base test by providing "todoPage" and "settingsPage".
// This new "test" can be used in multiple test files, and each of them will get the fixtures.
export const test = base.extend<TestFixtures>({
  bulkPage: async ({ page }, use) => {
    // Set up the fixture.
    page.setDefaultTimeout(5000);
    const bulkPage = new BulkPage(page);
    await bulkPage.goto();
    await expect(bulkPage.pokemonCards.first()).toBeVisible();

    // Use the fixture value in the test.
    await use(bulkPage);
  },
});
export const expect = baseExpect.extend({
  // eslint-disable-next-line max-lines-per-function
  async toBeSelected(locator: Locator, options?: { timeout?: number }) {
    // playwright will retry until timeout if used with .not, causes long tests
    try {
      await expect(locator).toHaveAttribute('aria-selected', 'true');
      return {
        message: () => 'Passed',
        timeout: options?.timeout,
        pass: true,
      };
    } catch (e: any) {
      return {
        message: () => (e as Error).message,
        timeout: options?.timeout,
        pass: false,
      };
    }
  },

  async notToBeSelected(locator: Locator, options?: { timeout?: number }) {
    try {
      await expect(locator).not.toHaveAttribute('aria-selected', 'true');
      return {
        message: () => 'Passed',
        timeout: options?.timeout,
        pass: true,
      };
    } catch (e: any) {
      return {
        message: () => (e as Error).message,
        timeout: options?.timeout,
        pass: false,
      };
    }
  },
});

export async function auth(page: Page) {
  await page.goto('http://localhost:4200');
  await page.getByText('Log In').click();
  await page.getByLabel('Email').fill('admin@domain.com');
  await page.getByLabel('Password').and(page.getByRole('textbox')).fill('Admin1234');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.waitForLoadState('networkidle');
}
