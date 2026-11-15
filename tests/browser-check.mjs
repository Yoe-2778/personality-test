import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { questions } from '../data.js';

const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', err => errors.push(err.message));
// Keep browser checks deterministic when the external font service is unavailable.
await page.route('https://fonts.googleapis.com/**', route => route.abort());
async function checkImages() {
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  for (const image of await page.locator('img[loading="lazy"]').all()) await image.scrollIntoViewIfNeeded();
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.evaluate(({ x, y }) => window.scrollTo(x, y), scroll);
}
try {
  await page.goto(baseURL);
  await page.evaluate(() => document.fonts.ready);
  await checkImages();
  assert.equal(await page.locator('.hero-cats').count(), 1);
  assert.equal(await page.locator('.dimension-cat').count(), 4);
  assert.match(await page.locator('.brand').innerText(), /亲密来信/);
  assert.equal(await page.locator('.brand-paw').getAttribute('src'), './assets/cats/brand-paw.svg');
  assert.equal(await page.locator('.dimension-0 .dimension-cat').getAttribute('src'), './assets/cats/scene-01.png');
  assert.equal(await page.locator('.dimension-1 .dimension-cat').getAttribute('src'), './assets/cats/guide-care-dry.png');
  assert.equal(await page.locator('.dimension-2 .dimension-cat').getAttribute('src'), './assets/cats/guide-talk-dry.png');
  assert.equal(await page.locator('.dimension-3 .dimension-cat').getAttribute('src'), './assets/cats/guide-rest-dry.png');
  assert.equal(await page.locator('.gentle-cats').getAttribute('src'), './assets/cats/guide-rest-dry.png');
  assert.equal(await page.locator('.hero-cats').getAttribute('src'), './assets/cats/hero-tear-base.png');
  assert.match(await page.locator('.relationship-scope').innerText(), /挚友/);
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '0');
  assert.equal(await page.locator('.journey-cat').count(), 2);
  assert.equal(await page.locator('[data-action="next"]').isDisabled(), true);
  await page.locator('[data-answer="2"]').click();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '1');
  await page.locator('[data-action="next"]').click();
  await page.locator('[data-answer="1"]').click();
  await page.reload();
  assert.match(await page.locator('.saved-note').innerText(), /2\/24/);
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '2');
  await page.locator('[data-action="previous"]').click();
  assert.equal(await page.locator('[data-answer="1"]').getAttribute('aria-checked'), 'true');
  await page.locator('[data-action="previous"]').click();
  assert.equal(await page.locator('[data-answer="2"]').getAttribute('aria-checked'), 'true');
  await page.locator('[data-answer="0"]').click();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '2', 'Editing an answer must not advance the cat');
  await page.locator('[data-action="next"]').click();
  for (let i = 1; i < 24; i++) {
    const choice = questions[i].direction === 1 ? [3, 0, 3, 0][questions[i].dimension] : [0, 3, 0, 3][questions[i].dimension];
    await page.locator(`[data-answer="${choice}"]`).click();
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), String(i + 1));
    if (i === 23) {
      assert.equal(await page.locator('.quiz-progress.is-delivered').count(), 1);
      assert.match(await page.locator('.journey-status').innerText(), /读懂了你的委屈/);
      await page.screenshot({ path: 'test-results/quiz-delivered.png', fullPage: true });
    }
    if (i === 8) { await checkImages(); await page.screenshot({ path: 'test-results/quiz-desktop.png', fullPage: true }); }
    await page.locator('[data-action="next"]').click();
  }
  assert.match(await page.locator('.result-intro h1').innerText(), /慢慢猫/);
  assert.equal(await page.locator('.guide-card').count(), 4);
  await checkImages();
  assert.equal(await page.locator('.guide-cat').count(), 4);
  await page.screenshot({ path: 'test-results/result-desktop.png', fullPage: true });
  await page.locator('[data-action="share"]').click();
  await page.locator('#share-name').fill('小林');
  await page.locator('#share-message').fill('给我一点空间。\n让承诺落在小事里。\n有分歧时，和我约好再谈的时间。');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#share-form button[type="submit"]').click();
  const download = await downloadPromise;
  await download.saveAs('test-results/share-card.png');
  assert.equal(await download.failure(), null);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('[data-action="copy"]').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /慢慢猫/);
  await page.locator('[data-action="edit"]').click();
  assert.equal(await page.locator('[data-answer="0"]').getAttribute('aria-checked'), 'true');
  await page.locator('.quiz-topline [data-action="home"]').click();
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="restart"]').click();
  await page.getByRole('button', { name: '保留这次进度' }).click();
  assert.equal(await page.locator('.result-intro').count(), 1);
  await page.locator('[data-action="privacy"]').click();
  await page.locator('[data-action="clear"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('love-notes:v1')), null);
  await page.locator('#toast').evaluate(el => el.classList.remove('visible'));
  await page.setViewportSize({ width: 390, height: 844 });
  await checkImages();
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-answer="1"]').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('[data-answer="2"]').getAttribute('aria-checked'), 'true');
  await checkImages();
  await page.screenshot({ path: 'test-results/quiz-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('.quiz-topline [data-action="home"]').click();
  await page.locator('[data-action="preview"]').click();
  await checkImages();
  await page.screenshot({ path: 'test-results/result-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 320, height: 740 });
  await checkImages();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('[data-action="share"]').click();
  await page.locator('#share-name').fill('这是十四个字以内的超长测试称呼');
  await page.locator('#share-message').fill('希望你知道我的需要，也愿意听听你的想法。'.repeat(8).slice(0,160));
  const longDownloadPromise = page.waitForEvent('download');
  await page.locator('#share-form button[type="submit"]').click();
  await (await longDownloadPromise).saveAs('test-results/share-card-long.png');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.locator('.brand').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('浏览器检查通过：24题完整流程、刷新恢复、修改答案、16型结果示例、PNG下载、复制、数据清除、键盘及320/390/1440布局。');
} finally { await browser.close(); }
