import crypto from 'crypto';
import fs from 'fs';

export async function waitForAppIdle(page, waitMs = 800) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}

export async function gotoAndAssert(page, baseUrl, scene) {
  await page.goto(`${baseUrl}${scene.route || '/'}`, {
    waitUntil: 'domcontentloaded',
    timeout: scene.timeout || 20_000,
  }).catch(() => {});

  await waitForAppIdle(page, scene.wait || 800);

  if (scene.assertSelector) {
    await page.locator(scene.assertSelector).first().waitFor({
      state: 'visible',
      timeout: scene.assertTimeout || 15_000,
    });
  }

  if (scene.assertText) {
    await page.getByText(scene.assertText, { exact: false }).first().waitFor({
      state: 'visible',
      timeout: scene.assertTimeout || 15_000,
    });
  }
}

export async function detectBlockedPage(page, scene) {
  if (scene.allowBlockedPage) return null;

  const body = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  const url = page.url();
  const blockedTexts = [
    '软件未激活',
    '请输入激活码',
    '登录',
    '页面未找到',
    '未授权',
    '该入口未授权',
    '该模块未授权',
  ];

  if (/\/login(?:$|[?#])/.test(url)) return 'blocked by login page';
  if (/\/activation(?:$|[?#])/.test(url)) return 'blocked by activation page';

  const matched = blockedTexts.find((text) => body.includes(text));
  return matched ? `blocked by "${matched}"` : null;
}

export async function captureRegion(page, outputPath, scene) {
  if (scene.cropSelector) {
    const locator = page.locator(scene.cropSelector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.screenshot({ path: outputPath });
      return;
    }
  }

  await page.screenshot({ path: outputPath, fullPage: false });
}

export function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export async function clickFirstVisible(page, selectorsOrTexts) {
  for (const item of selectorsOrTexts) {
    const locator = item.startsWith('text=')
      ? page.getByText(item.slice(5), { exact: false }).first()
      : page.locator(item).first();

    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await waitForAppIdle(page, 600);
      return true;
    }
  }
  return false;
}
