import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4311/hospital-training-intro/index.html', { waitUntil: 'networkidle' });
  await page.locator('deck-stage').evaluate((element) => {
    element.setAttribute('noscale', '');
    const style = document.createElement('style');
    style.textContent = '.overlay { display: none !important; }';
    element.shadowRoot.appendChild(style);
  });
  for (let index = 0; index < 5; index += 1) {
    await page.locator('deck-stage').evaluate((element, slide) => element.goTo(slide), index);
    const filename = index === 4 ? 'thank-you.png' : `slide-${String(index + 1).padStart(2, '0')}.png`;
    await page.locator('deck-stage > [data-deck-active]').screenshot({ path: path.join(baseDir, filename) });
    process.stdout.write(`${filename}\n`);
  }
} finally {
  await browser.close();
}
