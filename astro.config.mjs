import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const shared = JSON.parse(readFileSync(new URL('./content/content.shared.json', import.meta.url), 'utf8'));

export default defineConfig({
  site: shared.site.url,
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
});
