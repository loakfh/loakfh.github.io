import shared from '../../content/content.shared.json';

// Порядок = порядок клавиш в переключателе. key — характерная буква языка.
export const LANGS = [
  { code: 'ru', key: 'Я', name: 'Русский', locale: 'ru_RU', hello: 'Привет' },
  { code: 'en', key: 'A', name: 'English', locale: 'en_US', hello: 'Hello' },
  { code: 'tt', key: 'Ә', name: 'Татарча', locale: 'tt_RU', hello: 'Сәлам' },
  { code: 'tr', key: 'Ğ', name: 'Türkçe', locale: 'tr_TR', hello: 'Merhaba' },
  { code: 'ja', key: 'あ', name: '日本語', locale: 'ja_JP', hello: 'こんにちは' },
  { code: 'de', key: 'ß', name: 'Deutsch', locale: 'de_DE', hello: 'Hallo' },
] as const;

export type LangCode = (typeof LANGS)[number]['code'];

const files = import.meta.glob('../../content/content.*.json', { eager: true, import: 'default' });

export function getContent(lang: LangCode): any {
  const entry = files[`../../content/content.${lang}.json`];
  if (!entry) throw new Error(`Нет файла content/content.${lang}.json`);
  return entry;
}

export { shared };

export const PLACEHOLDER = '[ЗАГЛУШКА]';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Экранирует текст и превращает маркер [ЗАГЛУШКА] в заметную плашку. */
export function fmt(text: string, label: string): string {
  return escapeHtml(text).replaceAll(
    PLACEHOLDER,
    `<mark class="ph">${escapeHtml(label)}</mark>`,
  );
}

/** Текст без маркера — для alt, title и meta. */
export const plain = (text: string) => text.replaceAll(PLACEHOLDER, '').replace(/\s+/g, ' ').trim();

export const siteUrl = (path = '/') => new URL(path, shared.site.url).href;
