import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 889, height: 889 }, reducedMotion: 'no-preference' });
await page.route('https://fonts.googleapis.com/**', route => route.abort());
async function seed(count) {
  await page.goto(baseURL);
  await page.evaluate(n => localStorage.setItem('love-notes:v1', JSON.stringify({ answers: Array.from({ length: 24 }, (_, i) => i < n ? 0 : null), index: n, screen: 'quiz' })), count);
  await page.reload();
  await page.locator('[data-action="start"]').click();
  await page.locator('.journey-cat').evaluateAll(images => Promise.all(images.map(image => image.decode())));
}
async function senderX() { return (await page.locator('.journey-sender').boundingBox()).x; }
try {
  await seed(0);
  assert.equal(await page.locator('.journey-sender img').getAttribute('src'), './assets/cats/progress-pickup.png');
  const initial = await senderX();
  await page.screenshot({ path: 'test-results/journey-start.png', fullPage: true });
  const routeWidth = (await page.locator('.journey-route').boundingBox()).width;
  await page.locator('[data-answer="1"]').click();
  assert.equal(await page.locator('.journey-sender img').getAttribute('src'), './assets/cats/progress-pickup.png', 'Question one keeps the pickup pose after answering');
  const inMotion = await senderX();
  await page.locator('[data-action="next"]').click();
  assert.equal(await page.locator('.journey-sender img').getAttribute('src'), './assets/cats/progress-sender.png', 'Question two uses the original carrying pose');
  await page.waitForTimeout(720);
  const firstStep = await senderX();
  assert.ok(firstStep > initial && firstStep >= inMotion);
  assert.ok(Math.abs(firstStep - initial - routeWidth / 24) < 1, 'One answer advances exactly one of 24 steps');
  await page.locator('[data-action="previous"]').click();
  assert.equal(await page.locator('.journey-sender img').getAttribute('src'), './assets/cats/progress-pickup.png', 'Returning to question one restores the pickup pose');
  await page.locator('[data-answer="3"]').click();
  assert.ok(Math.abs(await senderX() - firstStep) < 1, 'Changing an existing answer leaves the cat in place');

  for (const width of [320, 390, 889]) {
    await page.setViewportSize({ width, height: 889 });
    const sender = await page.locator('.journey-sender').boundingBox();
    const receiver = await page.locator('.journey-receiver').boundingBox();
    assert.ok(sender.x >= 0 && receiver.x + receiver.width <= width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await seed(23);
  await page.locator('[data-answer="1"]').click();
  await page.locator('[data-action="next"]').click();
  assert.equal(await page.locator('[data-action="next"]').isDisabled(), true);
  assert.equal(await page.locator('.quiz-progress.is-delivered').count(), 1);
  await page.waitForTimeout(760);
  const sender = await page.locator('.journey-sender').boundingBox();
  const receiver = await page.locator('.journey-receiver').boundingBox();
  assert.ok(Math.abs(sender.x + sender.width - receiver.x) < 25, 'Cats meet at the end of the journey');
  await page.screenshot({ path: 'test-results/journey-handoff.png', fullPage: true });
  await page.locator('.result-intro').waitFor();

  // Leaving the quiz during delivery must cancel the scheduled result navigation.
  await seed(23);
  await page.locator('[data-answer="2"]').click();
  await page.locator('[data-action="next"]').click();
  await page.locator('.quiz-topline [data-action="home"]').click();
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.hero').count(), 1);
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="edit"]').click();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '24');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(23);
  await page.locator('[data-answer="1"]').click();
  assert.equal(await page.locator('.journey-sender').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.locator('[data-action="next"]').click();
  assert.equal(await page.locator('.result-intro').count(), 1);
  console.log('小猫送信检查通过：等距24步、连续答题动画、修改不重复计步、响应式布局、递信等待、取消跳转、减少动态效果。');
} finally { await browser.close(); }
