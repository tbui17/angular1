/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Locator } from '@playwright/test';
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
    const bulkPage = await BulkPage.auth(page);
    await expect(bulkPage.pokemonCards.first()).toBeVisible();

    // Use the fixture value in the test.
    await use(bulkPage);
  },
});
export const expect = baseExpect.extend({
  // eslint-disable-next-line max-lines-per-function
  async toBeSelected(locator: Locator, options?: { timeout?: number }) {
    const assertionName = 'toBeSelected';
    let pass: boolean;
    let matcherResult: any;
    try {
      await expect(locator).toHaveAttribute('aria-selected', 'true', options);
      pass = true;
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/prefer-destructuring
      matcherResult = error.matcherResult;
      pass = false;
    }
    const message = pass
      ? () =>
          `${this.utils.matcherHint(assertionName, undefined, undefined, { isNot: this.isNot }) 
          }\n\n` +
          `Locator: ${locator}\n` +
          `Expected: not ${this.utils.printExpected(true)}\n${ 
          matcherResult ? `Received: ${this.utils.printReceived(matcherResult.actual)}` : ''}`
      : () =>
          `${this.utils.matcherHint(assertionName, undefined, undefined, { isNot: this.isNot }) 
          }\n\n` +
          `Locator: ${locator}\n` +
          `Expected: ${this.utils.printExpected(true)}\n${ 
          matcherResult ? `Received: ${this.utils.printReceived(matcherResult.actual)}` : ''}`;
    return {
      message,
      pass,
      name: assertionName,
      expected: true,
      actual: matcherResult?.actual,
    };
  },
});
