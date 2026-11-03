// Captures the live RAENG Fitness website (raengfitness.co.uk) for the advert.
// Everything the advert shows on a screen comes from these captures: real
// pages, the real hero video, real scrolling and the real booking flow.
//
//   node capture.cjs            -> writes build/capture/*
//
// Nothing is submitted: the booking flow stops after choosing a date and time.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = 'https://raengfitness.co.uk';
const OUT = path.join(__dirname, 'build', 'capture');
const pad = (n) => String(n).padStart(4, '0');

function dir(name) {
  const d = path.join(OUT, name);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// Scroll the whole page once so every scroll-triggered reveal has played.
async function prereveal(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 250) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
}

// Step the hero <video> frame by frame and screenshot the real page each time.
async function heroFrames(page, outDir, { from = 0, count, clip }) {
  await page.evaluate(() => document.querySelector('video').pause());
  for (let k = 0; k < count; k++) {
    await page.evaluate(
      (t) =>
        new Promise((resolve) => {
          const v = document.querySelector('video');
          v.addEventListener('seeked', () => requestAnimationFrame(() => requestAnimationFrame(resolve)), { once: true });
          v.currentTime = t;
        }),
      (from + k / 30) % 11.9,
    );
    await page.screenshot({ path: path.join(outDir, pad(k) + '.jpg'), type: 'jpeg', quality: 94, clip });
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Brand lockup, as served by the site.
  const logo = await fetch(SITE + '/brand/raeng-lockup-black.png');
  fs.writeFileSync(path.join(OUT, 'raeng-lockup-black.png'), Buffer.from(await logo.arrayBuffer()));

  // Desktop homepage: 1440x900 viewport.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 / 3 });
    await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 });
    await prereveal(page);
    await heroFrames(page, dir('hero-desktop'), { count: 240 });
    await page.close();
  }

  // Extreme close-up source: the hero headline and buttons rendered at 3x.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
    await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await heroFrames(page, dir('hero-macro'), { from: 3, count: 75, clip: { x: 150, y: 380, width: 900, height: 420 } });
    await page.close();
  }

  // Full desktop homepage at 2x for the section close-ups.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 });
    await prereveal(page);
    await page.screenshot({ path: path.join(OUT, 'desktop-full.png'), fullPage: true });
    await page.close();
  }

  // Real booking flow on desktop: pick the first available date, then its time.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(SITE + '/book/group-class', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, 'book-0.png') });
    const date = page.locator('label[data-status=available]').first();
    const dateBox = await date.boundingBox();
    await date.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, 'book-1.png') });
    const slot = page.locator('input[name=slot-choice]').first().locator('xpath=ancestor::label[1]');
    const slotBox = await slot.boundingBox();
    await slot.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, 'book-2.png') });
    fs.writeFileSync(path.join(OUT, 'book-targets.json'), JSON.stringify({ date: dateBox, slot: slotBox }, null, 2));
    await page.close();
  }

  // Mobile: a real eased scroll from the hero down to Memberships.
  {
    const page = await browser.newPage({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 });
    await prereveal(page);
    const target = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2')].find((e) => /Memberships/.test(e.textContent));
      return h.getBoundingClientRect().top + scrollY - 90;
    });
    await page.evaluate(() => document.querySelector('video').play());
    const out = dir('mobile-scroll');
    for (let k = 0; k < 150; k++) {
      const u = k / 149;
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(e * target));
      await page.waitForTimeout(30);
      await page.screenshot({ path: path.join(out, pad(k) + '.jpg'), type: 'jpeg', quality: 93 });
    }
    await page.close();
  }

  await browser.close();
  console.log('Captured to', OUT);
})();
