import {test} from '@playwright/test';

test('probe register flow', async ({page}) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', (err) => logs.push('PAGEERROR: ' + err.message));
  page.on('dialog', (d) => { logs.push('DIALOG: ' + d.message()); d.dismiss().catch(() => {}); });
  await page.goto('/register');
  await page.getByLabel('Email').fill('probe2-' + Date.now() + '@example.test');
  await page.getByLabel('Password').fill('Correct-Horse-42!');
  await page.getByRole('button', {name: 'Create account'}).click();
  await page.waitForTimeout(10000);
  console.log('FINAL URL:', page.url());
  console.log('LOGS:', logs.slice(-8).join('\n'));
});
