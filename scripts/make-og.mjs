// Собирает картинки для соцсетей (public/og/og-<язык>.png, 1200×630) и apple-touch-icon
// из текстов сайта. Нужен установленный Google Chrome. Запуск: npm run og
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Не найден Chrome. Укажите путь в переменной CHROME_PATH.');

const read = (name) => JSON.parse(readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8'));
const shared = read('content.shared.json');
const LANGS = [
  ['ru', 'Я'], ['en', 'A'], ['tt', 'Ә'], ['tr', 'Ğ'], ['ja', 'あ'], ['de', 'ß'],
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Шрифты — те же, что на сайте: правила @font-face из пакета Golos Text плюс заплатка
// для Ğ и ğ из Onest (в Golos Text они без бревиса, см. src/styles/global.css).
const golos = new URL('../node_modules/@fontsource-variable/golos-text/', import.meta.url);
const fontFace =
  readFileSync(new URL('index.css', golos), 'utf8')
    .replaceAll('Golos Text Variable', 'G')
    .replaceAll('url(./files/', `url(${golos.href}files/`) +
  `@font-face{font-family:G;font-weight:400 900;src:url(${new URL('../src/fonts/onest-gbreve.woff2', import.meta.url).href});unicode-range:U+011E-011F}`;

const page = (lang, c) => `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
${fontFace}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;padding:64px 72px;background:#0E0F0C;color:#EDEAE0;display:flex;flex-direction:column;
font-family:G,'Hiragino Sans',sans-serif}
.keys{display:flex;gap:10px}
.keys i{display:grid;place-items:center;width:64px;height:68px;border:2px solid #2f302a;border-bottom-width:7px;border-radius:14px;
background:#181915;font:600 28px/1 G,'Hiragino Sans',sans-serif;font-style:normal;color:#a3a194}
.keys i.on{background:#FF5A36;border-color:#B93A1E;color:#0E0F0C}
h1{margin-top:auto;font-size:${lang === 'ja' ? 170 : 210}px;line-height:.9;font-weight:800;letter-spacing:-.05em}
p{margin-top:26px;font-size:44px;line-height:1.2;font-weight:500;max-width:1000px}
.h{position:absolute;right:72px;top:80px;font:500 30px/1 ui-monospace,Menlo,monospace;color:#FF5A36}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:#FF5A36}
</style><body>
<div class="keys">${LANGS.map(([code, key]) => `<i class="${code === lang ? 'on' : ''}">${key}</i>`).join('')}</div>
<div class="h">@${shared.person.telegram}</div>
<h1>${esc(c.hero.name)}</h1><p>${esc(c.meta.ogTagline)}</p><div class="bar"></div></body></html>`;

mkdirSync('work', { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
const tab = await browser.newPage();
await tab.setViewport({ width: 1200, height: 630 });
for (const [lang] of LANGS) {
  // через файл, а не setContent: иначе Chrome не отдаёт странице локальные шрифты
  writeFileSync('work/og.html', page(lang, read(`content.${lang}.json`)));
  await tab.goto(new URL('../work/og.html', import.meta.url).href, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `public/og/og-${lang}.png`, type: 'png' });
  console.log(`public/og/og-${lang}.png`);
}
await tab.setViewport({ width: 180, height: 180 });
await tab.setContent(
  `<body style="margin:0;background:#0E0F0C">${readFileSync('public/favicon.svg', 'utf8').replace('<svg ', '<svg width="180" height="180" ')}</body>`,
);
await tab.screenshot({ path: 'public/apple-touch-icon.png', type: 'png' });
await browser.close();
