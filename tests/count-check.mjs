import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 889, height: 889 }, reducedMotion: 'reduce' });
await page.route('https://fonts.googleapis.com/**', route => route.abort());
const value = () => page.locator('.test-count strong').innerText();
try {
  await page.goto(baseURL);
  await page.locator('[data-action="preview"]').click();
  assert.equal(await value(), '0', 'Example results do not count');
  await page.evaluate(() => localStorage.setItem('love-notes:v1', JSON.stringify({ answers: [...Array(23).fill(0), null], index: 23, screen: 'quiz' })));
  await page.reload();
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-answer="1"]').click();
  await page.locator('[data-action="next"]').click();
  assert.equal(await value(), '1', 'Completing a test adds one');
  assert.doesNotMatch(await page.locator('.test-count').innerText(), /本机累计/);
  await page.locator('.share-section').screenshot({ path: 'test-results/test-count-preview.png' });
  await page.reload();
  await page.locator('[data-action="start"]').click();
  assert.equal(await value(), '1', 'Refreshing and reopening a result do not count');
  await page.locator('[data-action="edit"]').click();
  await page.locator('[data-answer="2"]').click();
  await page.locator('.quiz-topline [data-action="home"]').click();
  await page.reload();
  await page.locator('[data-action="start"]').click();
  assert.equal(await value(), '2', 'Generating changed answers after refresh adds one');
  await page.locator('[data-action="edit"]').click();
  for (let i = 0; i < 24; i++) await page.locator('[data-action="next"]').click();
  assert.equal(await value(), '3', 'Clicking generate again adds one even with unchanged answers');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.locator('[data-action="restart"]').click();
  await page.locator('[data-action="confirm-restart"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('closer-notes:test-count:v1')), '3', 'Restart preserves the lifetime local count');
  await page.locator('[data-action="privacy"]').click();
  await page.locator('[data-action="clear"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('closer-notes:test-count:v1')), null);
  await page.locator('[data-action="preview"]').click();
  assert.equal(await value(), '0', 'Clearing local data resets the count');
  console.log('Counter verified: generation, edit/regeneration, preview, refresh, restart, clear, and mobile layouts.');
} finally { await browser.close(); }
