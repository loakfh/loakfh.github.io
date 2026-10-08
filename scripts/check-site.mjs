// Проверка собранного сайта в настоящем Chrome: шесть языков × телефон и десктоп.
// Сначала `npm run build && npm run preview`, потом `npm run check:site`.
// Скриншоты кладёт в work/shots (папка вне git).
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Не найден Chrome. Укажите путь в переменной CHROME_PATH.');

const LANGS = ['ru', 'en', 'tt', 'tr', 'ja', 'de'];
const VIEWS = [
  { name: 'mobile', width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];
mkdirSync('work/shots', { recursive: true });
const problems = [];
const note = (ok, text) => {
  console.log(`${ok ? '✓' : '✗'} ${text}`);
  if (!ok) problems.push(text);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME });
await browser.defaultBrowserContext().overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);

for (const view of VIEWS) {
  for (const lang of LANGS) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewport(view);
    await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle0' });
    await sleep(2200); // интро
    await page.screenshot({ path: `work/shots/${lang}-${view.name}-top.png` });

    // прокрутка, чтобы сработало появление блоков
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 300) {
        scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 60));
      }
      scrollTo({ top: 0, behavior: 'instant' });
    });
    await sleep(700);

    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => !el.closest('.intro, .vc-inner, .badges') && el.getClientRects().length)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > vw + 1 || r.left < -1;
        })
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
      const clipped = [...document.querySelectorAll('.key, .btn, .pill, .vc-btn, .cap, h2, h3, .stat dt, .mo-btns span')]
        .filter((el) => !el.closest('.mock-page') && el.scrollWidth > el.clientWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}: ${el.textContent.trim().slice(0, 30)}`);
      const small = [...document.querySelectorAll('a, button')]
        .filter((el) => el.getClientRects().length && !el.closest('[inert]') && !el.classList.contains('skip'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width < 40 || r.height < 40;
        })
        .map((el) => `${el.className}: ${el.textContent.trim().slice(0, 20)}`);
      return {
        scroll: document.documentElement.scrollWidth - vw,
        wide: [...new Set(wide)],
        clipped,
        small,
        hidden: document.querySelectorAll('.reveal:not(.is-in)').length,
        hreflang: document.querySelectorAll('link[hreflang]').length,
        noindex: !!document.querySelector('meta[name=robots][content*=noindex]'),
        og: document.querySelector('meta[property="og:image"]')?.content,
        htmlLang: document.documentElement.lang,
      };
    });
    const id = `${lang}/${view.name}`;
    note(report.scroll <= 0 && !report.wide.length, `${id}: нет горизонтальной прокрутки ${report.wide.join(', ')}`);
    note(!report.clipped.length, `${id}: текст не обрезан ${report.clipped.join(' | ')}`);
    if (view.isMobile) note(!report.small.length, `${id}: зоны нажатия ≥ 40px ${report.small.join(' | ')}`);
    note(report.hidden === 0, `${id}: все блоки появились (скрыто ${report.hidden})`);
    note(report.htmlLang === lang && report.hreflang === 7 && report.noindex, `${id}: lang, hreflang ×7, noindex`);
    note(!errors.length, `${id}: консоль чистая ${errors.join(' | ')}`);
    await page.screenshot({ path: `work/shots/${lang}-${view.name}-full.png`, fullPage: true });

    if (lang === 'ru' || lang === 'de') {
      // пайплайн
      await page.evaluate(() => document.getElementById('pipe').scrollIntoView({ block: 'center' }));
      const before = await page.$eval('#pipe', (el) => el.dataset.stage);
      await page.click('#pipeRun');
      await sleep(900);
      await page.screenshot({ path: `work/shots/${lang}-${view.name}-pipe-audit.png` });
      await sleep(6200);
      const after = await page.$eval('#pipe', (el) => el.dataset.stage);
      const label = await page.$eval('#pipeRun', (el) => el.textContent.trim() + '|' + el.disabled);
      note(before === '0' && after === '4' && label.endsWith('false'), `${id}: пайплайн 0 → 4 (${before} → ${after}, ${label})`);
      await page.screenshot({ path: `work/shots/${lang}-${view.name}-pipe-done.png` });

      // визитка
      await page.evaluate(() => document.getElementById('vc').scrollIntoView({ block: 'center' }));
      await sleep(300);
      await page.screenshot({ path: `work/shots/${lang}-${view.name}-card-front.png` });
      await page.click('#vcFront');
      await sleep(900);
      const flipped = await page.$eval('#vc', (el) => el.classList.contains('is-flipped') && !document.getElementById('vcBack').inert);
      note(flipped, `${id}: визитка переворачивается`);
      const backFits = await page.evaluate(() => {
        const box = document.getElementById('vcBack').getBoundingClientRect();
        return [...document.querySelectorAll('#vcBack .vc-btn, #vcBack .vc-qr')].every((el) => {
          const r = el.getBoundingClientRect();
          return r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.left >= box.left - 1 && r.right <= box.right + 1;
        });
      });
      note(backFits, `${id}: оборот визитки помещается`);
      await page.screenshot({ path: `work/shots/${lang}-${view.name}-card-back.png` });
      await page.bringToFront();
      await page.click('#vcCopy');
      await sleep(200);
      const toast = await page.$eval('#vcToast', (el) => el.textContent);
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
      note(clip.includes('t.me/Loakfh2'), `${id}: «Скопировать контакт» → «${toast}»`);
      await page.click('#vcFlipBack');
      await sleep(300);
      note(await page.$eval('#vc', (el) => !el.classList.contains('is-flipped')), `${id}: визитка возвращается`);
    }
    await page.close();
  }
}

// корень: язык браузера → нужная версия, запасной — английский, выбор запоминается
for (const [accept, expected] of [['de-DE', 'de'], ['ja', 'ja'], ['tt-RU', 'tt'], ['fr-FR', 'en']]) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument((l) => {
    Object.defineProperty(navigator, 'languages', { get: () => [l] });
    Object.defineProperty(navigator, 'language', { get: () => l });
  }, accept);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  note(new URL(page.url()).pathname === `/${expected}/`, `корень при языке ${accept} → /${expected}/ (${page.url()})`);
  if (accept === 'fr-FR') {
    await sleep(2000);
    await page.click('.key[data-lang="tr"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    note(new URL(page.url()).pathname === '/tr/', `выбор языка запоминается (${page.url()})`);
  }
  await ctx.close();
}

// спокойный режим: без интро, блоки видны сразу
{
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport(VIEWS[0]);
  await page.goto(`${BASE}/ru/`, { waitUntil: 'networkidle0' });
  const calm = await page.evaluate(() => ({
    intro: document.documentElement.classList.contains('intro-on'),
    opaque: [...document.querySelectorAll('.reveal')].every((el) => getComputedStyle(el).opacity === '1'),
  }));
  note(!calm.intro && calm.opaque, 'reduced-motion: нет интро, блоки видны без анимации');
  await page.click('#pipeRun');
  note((await page.$eval('#pipe', (el) => el.dataset.stage)) === '4', 'reduced-motion: пайплайн сразу показывает итог');
  await page.close();
}

const vcf = await fetch(`${BASE}/bakir.vcf`).then((r) => r.text());
note(vcf.startsWith('BEGIN:VCARD') && vcf.includes('t.me/Loakfh2'), 'vCard отдаётся');

await browser.close();
console.log(problems.length ? `\nПроблем: ${problems.length}` : '\nВсё чисто');
process.exit(problems.length ? 1 : 0);
