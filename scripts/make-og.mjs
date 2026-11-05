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

const unb = new URL('../node_modules/@fontsource-variable/unbounded/', import.meta.url);
const unbFace = readFileSync(new URL('wght.css', unb), 'utf8')
  .replaceAll('Unbounded Variable', 'U')
  .replaceAll('url(./files/', `url(${unb.href}files/`);

const page = (lang, c) => `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
${fontFace}${unbFace}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;padding:60px 72px;overflow:hidden;position:relative;color:#E9ECFF;display:flex;flex-direction:column;
font-family:G,'Hiragino Sans',sans-serif;background:radial-gradient(700px 420px at 85% 10%,rgba(139,124,255,.45),transparent 70%),#06081C}
.floor{position:absolute;left:-30%;right:-30%;bottom:-80px;height:330px;transform:perspective(420px) rotateX(62deg);transform-origin:50% 100%;
background-image:linear-gradient(rgba(198,255,61,.75) 2px,transparent 2px),linear-gradient(90deg,rgba(198,255,61,.75) 2px,transparent 2px);background-size:64px 64px;
-webkit-mask-image:linear-gradient(to top,#000 10%,transparent 85%)}
.kata{position:absolute;right:50px;top:40px;writing-mode:vertical-rl;font:900 170px/1 'Hiragino Sans',sans-serif;color:transparent;-webkit-text-stroke:2px rgba(139,124,255,.5)}
.keys{display:flex;gap:10px;position:relative}
.keys i{display:grid;place-items:center;width:62px;height:66px;border:2px solid rgba(139,124,255,.35);border-radius:16px;
background:rgba(20,26,70,.7);font:600 28px/1 G,'Hiragino Sans',sans-serif;font-style:normal;color:#E9ECFF}
.keys i.on{background:#C6FF3D;border-color:#C6FF3D;color:#06081C;box-shadow:0 0 30px rgba(198,255,61,.7)}
h1{position:relative;margin-top:auto;font:900 ${lang === 'ja' ? 170 : 196}px/.9 ${lang === 'tt' ? 'G' : 'U'},'Hiragino Sans',sans-serif;letter-spacing:-.055em;
background:linear-gradient(180deg,#fff 0%,#dfe3f0 24%,#7d8399 47%,#f6f8fc 53%,#b4bacb 72%,#fff 100%);-webkit-background-clip:text;color:transparent;
filter:drop-shadow(0 18px 34px rgba(139,124,255,.55))}
p{position:relative;margin-top:22px;font-size:42px;line-height:1.2;font-weight:600;max-width:900px}
.h{position:absolute;right:72px;bottom:64px;padding:12px 18px;border-radius:14px;background:#C6FF3D;color:#06081C;font:700 28px/1 ui-monospace,Menlo,monospace;transform:rotate(-3deg)}
</style><body><div class="floor"></div><div class="kata">バキル</div>
<div class="keys">${LANGS.map(([code, key]) => `<i class="${code === lang ? 'on' : ''}">${key}</i>`).join('')}</div>
<h1>${esc(c.hero.name)}</h1><p>${esc(c.meta.ogTagline)}</p><div class="h">@${shared.person.telegram}</div></body></html>`;

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
