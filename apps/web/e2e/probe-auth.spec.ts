import {expect, test} from '@playwright/test';

test('probe auth flow', async ({page}) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', (err) => logs.push('PAGEERROR: ' + err.message));
  await page.goto('/register');
  await page.getByLabel('Email').fill('probe-' + Date.now() + '@example.test');
  await page.getByLabel('Password').fill('Correct-Horse-42!');
  await page.getByRole('button', {name: 'Create account'}).click();
  await page.waitForTimeout(8000);
  console.log('FINAL URL:', page.url());
  console.log('LOGS:', logs.join('\n'));
});
