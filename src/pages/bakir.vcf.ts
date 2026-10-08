import type { APIRoute } from 'astro';
import { getContent, shared, siteUrl } from '../lib/i18n';

// vCard для кнопки «Скачать vCard». Данные — из content.shared.json.
export const GET: APIRoute = () => {
  const { person, site } = shared;
  const role = getContent(site.defaultLang as any).contact.card.role;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${person.nameLatin};;;`,
    `FN:${person.nameLatin}`,
    `TITLE:${role}`,
    `URL:${siteUrl('/')}`,
    `URL;TYPE=Telegram:https://t.me/${person.telegram}`,
    `URL;TYPE=GitHub:https://github.com/${person.github}`,
    person.email ? `EMAIL;TYPE=INTERNET:${person.email}` : '',
    `NOTE:Telegram: @${person.telegram}`,
    'END:VCARD',
  ].filter(Boolean);
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
  });
};
