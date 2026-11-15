import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const prefix = '/cati/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

// Serve the checkout under a repository prefix, with no root-path fallback or application backend.
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    if (relative.split('/').some(part => part.startsWith('.'))) { res.writeHead(404).end(); return; }
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) { res.writeHead(404).end(); return; }
    // Windows is case-insensitive, while GitHub Pages requires exact filename case.
    let directory = root;
    for (const part of relative.split('/')) {
      if (!(await readdir(directory)).includes(part)) { res.writeHead(404).end(); return; }
      directory = resolve(directory, part);
    }
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseURL = `http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
try {
  async function filesIn(directory) {
    const entries = await readdir(resolve(root, directory), { withFileTypes: true });
    const groups = await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]));
    return groups.flat();
  }
  const assets = await filesIn('assets');
  for (const file of [...assets, 'index.html', 'app.js', 'data.js', 'styles.css', 'cats.css', 'gallery.css', 'cat-reference.html', 'cat-concepts.html']) {
    const response = await fetch(new URL(file, baseURL));
    assert.equal(response.status, 200, `${file} is reachable below /cati/`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(resolve(root, file)), `${file} is served unchanged`);
  }
  assert.equal((await fetch(new URL('/app.js', baseURL))).status, 404, 'Root fallback must not conceal broken paths');
  assert.equal((await stat(resolve(root, '.nojekyll'))).isFile(), true);
  console.log(`Static files: all ${assets.length} assets and all page/script/style entry files load with exact filename case.`);

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 889, height: 889 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(new URL(baseURL).origin) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (request.url().startsWith(new URL(baseURL).origin)) failures.push(request.url());
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  async function decodeImages() {
    for (const image of await page.locator('img[loading="lazy"]').all()) await image.scrollIntoViewIfNeeded();
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  }
  for (const filename of ['index.html', 'cat-reference.html', 'cat-concepts.html']) {
    await page.goto(new URL(filename, baseURL).href);
    await decodeImages();
    if (filename === 'cat-concepts.html') {
      for (const index of [0, 1, 2]) {
        await page.locator(`[data-index="${index}"]`).click();
        await decodeImages();
      }
    }
    for (const width of [320, 390, 889, 1440]) {
      await page.setViewportSize({ width, height: 889 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${filename}: no overflow at ${width}`);
    }
    if (filename !== 'index.html') {
      const home = page.locator('header a').last();
      assert.equal(await home.evaluate(link => link.href), baseURL);
      await home.click();
      await page.locator('.home-main').waitFor();
    }
  }
  for (let type = 1; type <= 16; type++) {
    await page.goto(`${baseURL}#cat-${type}`);
    await page.locator('.result-main').waitFor();
    await decodeImages();
    assert.ok(await page.locator('.support-code-link').evaluate(link => link.href.startsWith(location.origin + '/cati/assets/')));
    await page.reload();
    await page.locator('.result-main').waitFor();
  }
  // Decode every original and production image without adding it to a production page.
  const imageFiles = assets.filter(file => ['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(extname(file)));
  for (const file of imageFiles) {
    await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); }, new URL(file, baseURL).href);
  }
  assert.deepEqual(failures, []);
  await browser.close(); browser = undefined;
  console.log(`Pages: home, both reference pages, all 3 concept variants, all 16 report deep links and ${imageFiles.length} images passed.`);

  for (const script of ['browser-check.mjs', 'gallery-check.mjs', 'preference-check.mjs', 'journey-check.mjs', 'hero-tears-check.mjs', 'count-check.mjs']) {
    const { stdout, stderr } = await run(process.execPath, [`tests/${script}`], {
      cwd: root, env: { ...process.env, TEST_BASE_URL: baseURL }, timeout: 240000, maxBuffer: 1024 * 1024,
    });
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }
  console.log('GitHub Pages /cati/ simulation passed. No production backend was used.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
