import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { questions, dimensions, calculateResult } from '../data.js';
import { mkdir } from 'node:fs/promises';

const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
await page.route('https://fonts.googleapis.com/**', route => route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));

async function openResult(answers) {
  await page.goto(baseURL);
  await page.evaluate(answers => localStorage.setItem('love-notes:v1', JSON.stringify({ answers, index: 23, needsGeneration: false })), answers);
  await page.reload();
  await page.locator('[data-action="start"]').click();
}

try {
  // Include both endpoints, a tie and a moderate preference in the same result.
  const mixed = questions.map(q => q.dimension === 0 ? (q.direction === 1 ? 0 : 3)
    : q.dimension === 1 ? (q.direction === 1 ? 3 : 0)
    : q.dimension === 2 ? 1 : (q.direction === 1 ? 2 : 1));
  const result = calculateResult(mixed);
  await page.setViewportSize({ width: 889, height: 889 });
  await openResult(mixed);
  assert.equal(await page.locator('.preference-card').count(), 4);
  for (const [i, d] of dimensions.entries()) {
    const card = page.locator(`.preference-${i}`);
    const expected = result.balanced[i] ? '两种方式都适合' : `更偏向「${result.sides[i] ? d.right : d.left}」`;
    assert.equal(await card.locator('.preference-conclusion').innerText(), expected);
    const comparison = await card.getByRole('img').getAttribute('aria-label');
    assert.ok(comparison.includes(`${d.left} ${100 - result.scores[i]}%`));
    assert.ok(comparison.includes(`${d.right} ${result.scores[i]}%`));
    const grow = await card.locator('.preference-fill').evaluateAll(spans => spans.map(span => ({ grow: Number(span.style.flexGrow), hidden: span.hidden })));
    assert.equal(grow[0].grow, 100 - result.scores[i]);
    assert.equal(grow[1].grow, result.scores[i]);
    assert.equal(grow[0].hidden, result.scores[i] === 100);
    assert.equal(grow[1].hidden, result.scores[i] === 0);
  }
  await page.locator('.result-overview').screenshot({ path: 'test-results/preferences-mixed.png' });
  for (const width of [320, 390, 436, 889, 1440]) {
    await page.setViewportSize({ width, height: 889 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Page overflow at ${width}`);
    assert.equal(await page.locator('.preference-card').evaluateAll(cards => cards.some(card => card.scrollWidth > card.clientWidth)), false, `Card overflow at ${width}`);
    if (width === 390) await page.locator('.result-overview').screenshot({ path: 'test-results/preferences-mobile.png' });
  }
  // All near-center results must retain both preferences in their explanation.
  await openResult(Array(24).fill(1));
  assert.equal(await page.locator('.is-balanced').count(), 4);
  for (const [i, d] of dimensions.entries()) {
    const explanation = await page.locator(`.preference-${i} .preference-explanation`).innerText();
    assert.ok(explanation.includes(d.left) && explanation.includes(d.right));
  }
  await page.setViewportSize({ width: 889, height: 889 });
  await page.locator('.result-overview').screenshot({ path: 'test-results/preferences-balanced.png' });
  const nearCenter = Array(24).fill(1);
  nearCenter[0] = 0;
  await openResult(nearCenter);
  assert.equal(await page.locator('.preference-0 .preference-conclusion').innerText(), '两种方式都适合');
  assert.match(await page.locator('.preference-0').getByRole('img').getAttribute('aria-label'), /56%.*44%/);
  assert.deepEqual(errors, []);
  console.log('Preference cards passed: left/right endpoints, balanced and moderate results, percentage direction, accessible labels, and 320–1440px layouts.');
} finally {
  await browser.close();
}
