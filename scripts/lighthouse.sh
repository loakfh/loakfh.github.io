#!/bin/sh
# Lighthouse одной командой: три прогона на страницу, в отчёт идёт медиана.
# Запуск: сначала `npm run build && npm run preview`, потом `npm run lighthouse`
# (или `sh scripts/lighthouse.sh https://loakfh.github.io` для живого сайта).
BASE="${1:-http://localhost:4321}"
mkdir -p work/lighthouse
for LANG_CODE in ru en tt tr ja de; do
  for RUN in 1 2 3; do
    npx --yes lighthouse "$BASE/$LANG_CODE/" --quiet --only-categories=performance,accessibility,seo,best-practices \
      --chrome-flags="--headless=new" --output=json --output-path="work/lighthouse/$LANG_CODE-$RUN.json" >/dev/null 2>&1
  done
  node -e '
    const [lang] = process.argv.slice(1);
    const runs = [1, 2, 3].map((n) => require(`./work/lighthouse/${lang}-${n}.json`).categories);
    const median = (key) => runs.map((r) => Math.round(r[key].score * 100)).sort((a, b) => a - b)[1];
    console.log(`${lang}: performance ${median("performance")} · accessibility ${median("accessibility")} · seo ${median("seo")} · best-practices ${median("best-practices")}`);
  ' "$LANG_CODE"
done
