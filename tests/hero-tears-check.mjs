import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 889, height: 889 }, reducedMotion: 'no-preference' });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(baseURL);
  await page.locator('.hero-cats').evaluate(img => img.decode());
  assert.equal(await page.locator('.hero-tear').count(), 2);
  const frames = await page.locator('.hero-tear-left').evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause();
    return [430, 1260, 1980, 2600].map(time => {
      animation.currentTime = time;
      const style = getComputedStyle(el);
      return { y: new DOMMatrix(style.transform).m42, opacity: Number(style.opacity) };
    });
  });
  assert.ok(frames[0].y < frames[1].y && frames[1].y < frames[2].y, 'Tears travel downward');
  assert.ok(frames[2].y - frames[1].y > frames[1].y - frames[0].y, 'Falling tears accelerate');
  assert.equal(frames[3].opacity, 0, 'Tears fade before restarting');
  await page.locator('.hero-cat-scene').evaluate(el => { el.getAnimations()[0]?.finish(); });
  for (const width of [1440, 889, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const image = await page.locator('.hero-cats').boundingBox();
    const layer = await page.locator('.hero-tears').boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(image[key] - layer[key]) < 1, 'Tear layer stays registered to the image');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.setViewportSize({ width: 889, height: 889 });
  await page.locator('.hero-tear').evaluateAll(elements => elements.forEach((el, i) => {
    const animation = el.getAnimations()[0]; animation.pause(); animation.currentTime = i ? 500 : 1800;
  }));
  await page.locator('.hero-visual').screenshot({ path: 'test-results/hero-tears-preview.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.hero-tear').evaluateAll(els => els.flatMap(el => el.getAnimations()).length), 0);
  console.log('Homepage tears verified: downward motion, acceleration, fading, responsive alignment and reduced motion.');
} finally { await browser.close(); }
