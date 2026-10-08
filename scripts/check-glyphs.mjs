// Проверяет шрифты на буквы шести языков сайта: что глиф есть и что буква со знаком
// действительно нарисована со знаком (в Golos Text Ğ и ğ есть, но без бревиса).
// Запуск: npm run check:glyphs
import * as fontkit from 'fontkit';
import { readdirSync } from 'node:fs';

const REQUIRED = {
  татарский: 'әөүҗңһӘӨҮҖҢҺ',
  турецкий: 'ıİşŞğĞçÇöÖüÜ',
  немецкий: 'äöüßÄÖÜ',
  русский: 'йёЙЁ',
};
// Golos Text — весь переводимый текст. JetBrains Mono — только цифры и латинские
// подписи (татарских букв в нём нет), поэтому для него татарский не требуется.
const FAMILIES = {
  'golos-text': { langs: ['русский', 'татарский', 'турецкий', 'немецкий'], patches: ['src/fonts/onest-gbreve.woff2'] },
  'jetbrains-mono': { langs: ['турецкий', 'немецкий'], patches: [] },
};
let failed = false;

for (const [family, { langs, patches }] of Object.entries(FAMILIES)) {
  const dir = `node_modules/@fontsource-variable/${family}/files`;
  // заплатки идут первыми — как в CSS, где они главнее основного шрифта
  const fonts = [
    ...patches,
    ...readdirSync(dir).filter((f) => f.endsWith('-wght-normal.woff2')).map((f) => `${dir}/${f}`),
  ].map((f) => fontkit.openSync(f));
  const glyph = (ch) => fonts.find((font) => font.hasGlyphForCodePoint(ch.codePointAt(0)))?.glyphForCodePoint(ch.codePointAt(0));
  for (const lang of langs) {
    const bad = [];
    for (const ch of REQUIRED[lang]) {
      const g = glyph(ch);
      if (!g) {
        bad.push(`${ch} — нет глифа`);
        continue;
      }
      const base = ch.normalize('NFD')[0];
      const baseGlyph = base !== ch && glyph(base);
      if (baseGlyph && g.path.commands.length <= baseGlyph.path.commands.length) bad.push(`${ch} — без знака`);
    }
    if (bad.length) failed = true;
    console.log(`${family} · ${lang}: ${bad.length ? bad.join(', ') : 'ок'}`);
  }
}
process.exit(failed ? 1 : 0);
