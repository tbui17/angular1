import { test, expect } from './fixtures';

test.describe('Startup', () => {
  test('should load first page of cards', async ({ bulkPage }) => {
    await test.step('get container', async () => {
      await expect(bulkPage.pokemonCardsContainer).toBeVisible({ timeout: 10_000 });
    });
    await test.step('get cards', async () => {
      expect(await bulkPage.pokemonCards.all()).not.toHaveLength(0);
    });
    await test.step('get bulbasaur', async () => {
      await expect(bulkPage.pokemonCards.getByText('Bulbasaur').first()).toBeVisible();
    });
  });
});

test.describe('Filter', () => {
  test('should be able to filter', async ({ bulkPage }) => {
    await bulkPage.filter.fill('Bulbasaur');
    expect(await bulkPage.pokemonCards.all()).toHaveLength(1);
  });
});

test.describe('Selection', () => {
  test('should be able to select a card', async ({ bulkPage }) => {
    await bulkPage.page.getByTitle('Bulbasaur').click();
    await expect(bulkPage.page.getByTitle('Bulbasaur')).toBeSelected();
  });

  test('should deselect other cards', async ({ bulkPage }) => {
    await bulkPage.page.getByTitle('Bulbasaur').click();
    await expect(bulkPage.page.getByTitle('Bulbasaur')).toBeSelected();
    await bulkPage.page.getByTitle('Charmander').click();
    await expect(bulkPage.page.getByTitle('Charmander')).toBeSelected();
    await expect(bulkPage.page.getByTitle('Bulbasaur')).not.toBeSelected();
  });

  test('should be able to select a range', async ({ bulkPage }) => {
    await bulkPage.selectRange('Ivysaur', 'Squirtle');
    await expect(bulkPage.page.getByTitle('Ivysaur')).toBeSelected();
    await expect(bulkPage.page.getByTitle('Squirtle')).toBeSelected();
    await expect(bulkPage.page.getByTitle('Wartortle')).not.toBeSelected();
  });

  test('should clear selection on filter', async ({ bulkPage }) => {
    await bulkPage.page.getByTitle('Bulbasaur').click();
    await expect(bulkPage.page.getByTitle('Bulbasaur')).toBeSelected();
    await bulkPage.filter.fill('Bulbasaur');
    await expect(bulkPage.page.getByTitle('Bulbasaur')).not.toBeSelected();
  });
});

test.describe('Sorting', () => {
  test('should sort by name in descending order', async ({ bulkPage }) => {
    await bulkPage.sortByNameDescending();
    const cards = await bulkPage.pokemonCards.all();
    const names = await Promise.all(
      cards.slice(0, 3).map(async (element) => element.getByLabel('Name').textContent()),
    );
    const lowerNames = names.map((name) => name?.toLowerCase());
    expect(lowerNames).toStrictEqual(['weedle', 'wartortle', 'venusaur']);
  });
});
