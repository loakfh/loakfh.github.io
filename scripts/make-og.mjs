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
  .replaceAll('url(./files/', `url(${unb.href}files/`); // для картинок соцсетей берём полный пакет

const page = (lang, c) => `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
${fontFace}${unbFace}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;padding:56px 70px;overflow:hidden;position:relative;color:#141414;background:#F1EEE6;font-family:G,'Hiragino Sans',sans-serif}
.kata{position:absolute;right:-10px;top:-10px;writing-mode:vertical-rl;font:900 300px/1 'Hiragino Sans',sans-serif;color:transparent;-webkit-text-stroke:2px rgba(20,20,20,.1)}
.stripes{position:absolute;right:-60px;top:-40px;width:330px;height:130%;transform:skewX(-18deg);background:linear-gradient(90deg,#FF4F1F 0 20%,transparent 20% 30%,#1F3FFF 30% 44%,transparent 44% 54%,#141414 54% 60%,transparent 60%)}
.keys{position:relative;display:flex;gap:10px}
.keys i{display:grid;place-items:center;width:58px;height:62px;border:3px solid #141414;border-radius:14px;background:#fff;box-shadow:4px 4px 0 #141414;font:700 26px/1 G,'Hiragino Sans',sans-serif;font-style:normal}
.keys i.on{background:#FF4F1F}
.bib{position:relative;margin-top:44px;width:760px;padding:22px 30px 26px;background:#fff;border:3px solid #141414;border-radius:20px;box-shadow:10px 10px 0 #141414;transform:rotate(-1.5deg)}
.bib b{position:absolute;width:18px;height:18px;border-radius:50%;border:4px solid #9a9a9a;background:#e6e6e6}
.top{display:flex;justify-content:space-between;padding:0 26px;font:700 18px/1 ui-monospace,Menlo,monospace;color:#C2330A;letter-spacing:.08em}
h1{margin-top:6px;text-align:center;font:900 ${lang === 'ja' ? 150 : 170}px/1 ${lang === 'tt' ? 'G' : 'U'},'Hiragino Sans',sans-serif;letter-spacing:-.055em}
p{position:relative;margin-top:30px;font-size:40px;font-weight:800;max-width:760px}
.h{position:absolute;right:70px;bottom:56px;padding:12px 18px;border:3px solid #141414;border-radius:14px;background:#FF4F1F;font:700 28px/1 ui-monospace,Menlo,monospace;box-shadow:5px 5px 0 #141414}
</style><body><div class="kata">バキル</div><div class="stripes"></div>
<div class="keys">${LANGS.map(([code, key]) => `<i class="${code === lang ? 'on' : ''}">${key}</i>`).join('')}</div>
<div class="bib"><b style="top:12px;left:12px"></b><b style="top:12px;right:12px"></b><b style="bottom:12px;left:12px"></b><b style="bottom:12px;right:12px"></b>
<div class="top"><span>MOW → VIE</span><span>${esc(c.ui.langLabel)}</span></div><h1>${esc(c.hero.name)}</h1></div>
<p>${esc(c.hero.tagline)}</p><div class="h">@${shared.person.telegram}</div></body></html>`;

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
