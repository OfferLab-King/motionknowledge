import {expect, test} from '@playwright/test';

const email = `creator-${Date.now()}@example.test`;
const password = 'Correct-Horse-42!';

test('user registers and creates a configured project', async ({page}) => {
  // Landing page shows the style showcase, style gallery and template strip.
  await page.goto('/');
  await expect(page.getByRole('heading', {name: /Turn knowledge into/})).toBeVisible();
  await expect(page.getByText('MotionKnowledge Signature')).toBeVisible({timeout: 30_000});
  await expect(page.getByRole('heading', {name: 'Start from a template'})).toBeVisible();

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', {name: 'Create account'}).click();
  await page.getByRole('navigation').getByRole('link', {name: 'New video'}).click();
  await page.getByLabel('Topic').fill('What is a Discounted Cash Flow?');
  await page.getByLabel('Audience').selectOption('beginner');
  await page.getByLabel('Duration').selectOption('5');
  await page.getByRole('button', {name: 'Create project'}).click();
  await expect(page).toHaveURL(/projects\/[a-f0-9-]+/);
});
