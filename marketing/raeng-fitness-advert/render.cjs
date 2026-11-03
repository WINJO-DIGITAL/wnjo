// Renders stage.html frame by frame and encodes the advert.
//   node render.cjs                      -> build/video.mp4 (silent, 60 fps)
//   node render.cjs --stills 0.5,3.4,8   -> build/stills/*.png (for checking)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 60, DURATION = 15;
const BUILD = path.join(__dirname, 'build');

(async () => {
  const stillsArg = process.argv.indexOf('--stills');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'stage.html'));
  await page.evaluate(() => window.stageReady);

  if (stillsArg > -1) {
    const times = process.argv[stillsArg + 1].split(',').map(Number);
    fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
    for (const t of times) {
      await page.evaluate((v) => window.renderAt(v), t);
      await page.screenshot({ path: path.join(BUILD, 'stills', `t${t.toFixed(2)}.png`) });
    }
    await browser.close();
    return;
  }

  const out = path.join(BUILD, 'video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = FPS * DURATION;
  for (let f = 0; f < total; f++) {
    await page.evaluate((v) => window.renderAt(v), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('Wrote', out);
})();
