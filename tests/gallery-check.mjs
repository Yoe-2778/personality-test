import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { archetypes, questions } from '../data.js';

const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
await page.route('https://fonts.googleapis.com/**', route => route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const savedProgress = () => page.evaluate(() => localStorage.getItem('love-notes:v1'));
const savedCount = () => page.evaluate(() => localStorage.getItem('closer-notes:test-count:v1'));
try {
  await page.goto(baseURL);
  await page.locator('.header [data-action="gallery"]').click();
  assert.equal(new URL(page.url()).hash, '#cats');
  assert.equal(await page.locator('.catalog-card').count(), 16);
  assert.deepEqual(await page.locator('.catalog-card h2').allTextContents(), archetypes.map(cat => cat[0]));
  const illustrationSources = await page.locator('.catalog-cats').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')));
  assert.equal(new Set(illustrationSources).size, 16, 'Each portrait has its own illustration');
  assert.ok(illustrationSources.every((src, i) => src === `./assets/cats/gallery/cat-${String(i + 1).padStart(2, '0')}.png`));
  const hashes = await Promise.all(illustrationSources.map(async src => createHash('sha256').update(await readFile(new URL(`../${src}`, import.meta.url))).digest('hex')));
  assert.equal(new Set(hashes).size, 16, 'All sixteen illustration files have different content');
  await page.locator('.gallery-main img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  assert.equal(await page.locator('.catalog-cats').evaluateAll(imgs => imgs.every(img => img.alt && img.naturalWidth === 420 && img.naturalHeight === 420)), true);
  await page.screenshot({ path: 'test-results/gallery-desktop.png', fullPage: true });
  for (const type of Array.from({ length: 16 }, (_, i) => i)) {
    const expected = [3, 2, 1, 0].map((shift, i) => (type >> shift & 1) ? ['保留空间', '行动关怀', '沉淀再谈', '灵活随兴'][i] : ['经常连接', '明确表达', '及时沟通', '清晰约定'][i]);
    assert.deepEqual(await page.locator('.catalog-card').nth(type).locator('li').allTextContents(), expected);
    await page.locator(`[data-action="catalog-preview"][data-type="${type}"]`).click();
    assert.equal(await page.locator('.result-intro h1').innerText(), archetypes[type][0]);
    const portraitSource = `./assets/cats/gallery/cat-${String(type + 1).padStart(2, '0')}.png`;
    assert.equal(await page.locator('.result-cats').getAttribute('src'), portraitSource);
    assert.equal(await page.locator('.mini-share-cats').getAttribute('src'), portraitSource);
    await page.locator('[data-action="share"]').click();
    assert.equal(await page.locator('.share-modal-cats img').getAttribute('src'), portraitSource);
    await page.keyboard.press('Escape');
    assert.match(await page.locator('.sample-banner').innerText(), /图鉴示例/);
    assert.equal(new URL(page.url()).hash, `#cat-${type + 1}`);
    await page.locator('.result-gallery-link').click();
  }
  assert.equal(await savedProgress(), null);
  assert.equal(await savedCount(), null);
  for (const [filter, names] of [['together', archetypes.slice(0, 8)], ['space', archetypes.slice(8)]]) {
    await page.locator(`[data-filter="${filter}"]`).click();
    assert.equal(await page.locator('.catalog-card').count(), 8);
    assert.deepEqual(await page.locator('.catalog-card h2').allTextContents(), names.map(cat => cat[0]));
    assert.equal(await page.locator(`[data-filter="${filter}"]`).evaluate(el => el === document.activeElement), true);
    await page.locator('.catalog-open').first().click();
    await page.locator('.result-gallery-link').click();
    assert.equal(await page.locator(`[data-filter="${filter}"]`).getAttribute('aria-pressed'), 'true');
  }
  await page.locator('[data-filter="all"]').click();
  for (const width of [320, 390, 436, 889, 1440]) {
    await page.setViewportSize({ width, height: 889 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Gallery overflow at ${width}`);
    assert.equal(await page.locator('.catalog-card').evaluateAll(cards => cards.some(card => card.scrollWidth > card.clientWidth)), false);
    const brand = await page.locator('.brand').boundingBox();
    const nav = await page.locator('.header nav').boundingBox();
    assert.ok(brand.x + brand.width <= nav.x, `Header collision at ${width}`);
    if (width === 390) await page.screenshot({ path: 'test-results/gallery-mobile.png', fullPage: true });
  }
  await page.goto(`${baseURL}#cat-11`);
  assert.equal(await page.locator('.result-intro h1').innerText(), '慢慢猫');
  await page.reload();
  assert.equal(await page.locator('.result-intro h1').innerText(), '慢慢猫');
  await page.goto(`${baseURL}#cats`);
  assert.equal(await page.locator('.catalog-card').count(), 16);
  const answers = questions.map(q => q.direction === 1 ? 0 : 3);
  await page.evaluate(answers => {
    localStorage.setItem('love-notes:v1', JSON.stringify({ answers, index: 23, needsGeneration: false }));
    localStorage.setItem('closer-notes:test-count:v1', '7');
  }, answers);
  await page.reload();
  assert.equal(await page.locator('.catalog-own').innerText(), '你的小猫');
  const progress = await savedProgress();
  await page.locator('[data-type="15"]').click();
  await page.locator('.sample-banner [data-action="gallery-return"]').click();
  assert.equal(await savedProgress(), progress);
  assert.equal(await savedCount(), '7');
  await page.locator('.gallery-intro [data-action="start"]').click();
  assert.equal(await page.locator('.result-intro h1').innerText(), '暖暖猫');
  assert.equal(await page.locator('.result-cats').getAttribute('src'), './assets/cats/gallery/cat-01.png');
  assert.equal(await savedCount(), '7');
  await page.locator('.brand').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.home-gallery').screenshot({ path: 'test-results/gallery-home-entry.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Gallery verified: all 16 names and combinations, previews, filters, deep links, saved answers/count, own-cat badge and 320–1440px layouts.');
} finally {
  await browser.close();
}
