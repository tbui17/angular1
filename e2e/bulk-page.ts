import type { Locator, Page } from 'playwright/test';

export class BulkPage {
  page: Page;
  filter: Locator;
  pokemonCards: Locator;
  pokemonCardsContainer: Locator;
  currentPage: Locator;
  constructor(page: Page) {
    this.page = page;
    this.filter = this.page.getByRole('textbox', { name: 'filter' });
    this.pokemonCardsContainer = this.page.getByTitle('Pokemon Cards');
    this.pokemonCards = this.pokemonCardsContainer.getByRole('listitem');
    this.currentPage = this.page.getByTitle('Current Page');
  }

  async selectRange(startName: string, endName: string) {
    await this.page.getByTitle(startName).click({ modifiers: ['Shift'] });
    await this.page.getByTitle(endName).click({ modifiers: ['Shift'] });
  }

  async sortByNameDescending() {
    await this.page.getByLabel('Sort By').selectOption('Name');

    await this.page.getByRole('button', { name: 'Sort Order' }).click();
  }

  static async auth(page: Page) {
    await page.goto('http://localhost:4200');
    await page.getByText('Log In').click();
    await page.getByLabel('Email').fill('admin@domain.com');
    await page.getByLabel('Password').and(page.getByRole('textbox')).fill('Admin1234');
    await page.getByRole('button', { name: 'Enter' }).click();
    await page.getByRole('link', { name: 'Bulk' }).click();
    return new BulkPage(page);
  }

  async goto() {
    await this.page.goto('http://localhost:4200/bulk');
  }
}
