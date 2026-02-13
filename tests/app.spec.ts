import { expect, test } from '@playwright/test';

const openNewMatch = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.getByTestId('new-match-btn').click();
  await expect(page.getByTestId('match-form')).toBeVisible();
};

const chooseOption = async (page: import('@playwright/test').Page, testId: string, label: string) => {
  const root = page.getByTestId(testId);
  await root.locator('.custom-select-trigger').click();
  await root.locator('.custom-select-option', { hasText: label }).first().click();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('pickleball-match-journal');
    localStorage.clear();
  });
});

test('create player via modal and appears in player filter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New Player' }).click();
  await page.getByLabel('Name').fill('Jordan');
  await page.getByLabel('Favorite tennis player').fill('Federer');
  await page.getByRole('button', { name: 'Create Player' }).click();

  await chooseOption(page, 'player-filter', 'Jordan');
  await expect(page.getByTestId('player-filter').locator('.custom-select-trigger')).toContainText('Jordan');
});

test('completed singles updates standings', async ({ page }) => {
  await openNewMatch(page);
  await chooseOption(page, 'match-format', 'Singles');
  await chooseOption(page, 'side-a-0', 'Ari');
  await chooseOption(page, 'side-b-0', 'Blake');
  await chooseOption(page, 'set-winner-0', 'A');
  await chooseOption(page, 'set-winner-1', 'A');
  await page.getByTestId('save-match-btn').click();

  await page.goto('/standings');
  await expect(page.getByTestId('standings-table')).toContainText('Ari');
  await expect(page.getByTestId('standings-table')).toContainText('Blake');
});

test('doubles updates all four players', async ({ page }) => {
  await openNewMatch(page);
  await chooseOption(page, 'match-format', 'Doubles');
  await chooseOption(page, 'side-a-0', 'Ari');
  await chooseOption(page, 'side-a-1', 'Casey');
  await chooseOption(page, 'side-b-0', 'Blake');
  await chooseOption(page, 'side-b-1', 'Dev');
  await chooseOption(page, 'set-winner-0', 'B');
  await chooseOption(page, 'set-winner-1', 'B');
  await page.getByTestId('save-match-btn').click();

  await page.goto('/standings');
  await expect(page.getByTestId('standings-table')).toContainText('Casey');
  await expect(page.getByTestId('standings-table')).toContainText('Dev');
});

test('not completed does not affect standings', async ({ page }) => {
  await openNewMatch(page);
  await chooseOption(page, 'match-status', 'Not completed');
  await chooseOption(page, 'side-a-0', 'Ari');
  await chooseOption(page, 'side-b-0', 'Blake');
  await chooseOption(page, 'set-winner-0', 'A');
  await page.getByTestId('save-match-btn').click();

  await page.goto('/standings');
  await expect(page.getByTestId('standings-table')).toContainText('Ari');
});

test('player link opens profile', async ({ page }) => {
  await page.goto('/standings');
  await page.getByRole('link', { name: 'Ari' }).first().click();
  await expect(page.getByTestId('player-profile-screen')).toBeVisible();
});

test('date chips and today jump', async ({ page }) => {
  await page.goto('/');
  const firstChip = page.locator('[data-testid^="date-chip-"]').first();
  await firstChip.click();
  await page.getByTestId('today-jump-btn').click();
  await expect(page.getByTestId('date-chip-row')).toBeVisible();
});

test('edit player profile updates name and favorite tennis player', async ({ page }) => {
  await page.goto('/standings');
  await page.getByRole('link', { name: 'Ari' }).first().click();
  await page.getByTestId('player-profile-screen').locator('.profile-name-row').hover();
  await page.getByRole('button', { name: 'Edit player details' }).click();
  await page.getByLabel('Player name').fill('Ari Prime');
  await page.getByLabel('Favorite tennis player').fill('Nadal');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Ari Prime' })).toBeVisible();
  await expect(page.getByText('Nadal')).toBeVisible();
});
