// Весь интерактив страницы. Тексты сюда не попадают — они приходят из разметки (data-атрибуты).
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (id) => document.getElementById(id);
const store = {
  get(area, key) {
    try {
      return window[area].getItem(key);
    } catch {
      return null;
    }
  },
  set(area, key, value) {
    try {
      window[area].setItem(key, value);
    } catch {
      /* приватный режим — живём без памяти */
    }
  },
};

/* ---------- интро: «привет» на шести языках ---------- */
(function intro() {
  const root = document.documentElement;
  const box = $('intro');
  if (!box || !root.classList.contains('intro-on')) return;
  store.set('sessionStorage', 'intro', '1');
  const word = $('introWord');
  const hellos = JSON.parse(box.dataset.hellos);
  let i = 0;
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    box.classList.add('is-out');
    setTimeout(() => root.classList.remove('intro-on'), 360);
    removeEventListener('keydown', close);
  };
  const timer = setInterval(() => {
    i += 1;
    if (i >= hellos.length) return close();
    word.textContent = hellos[i].text;
    word.lang = hellos[i].lang;
  }, 150);
  box.addEventListener('click', close);
  addEventListener('keydown', close);
})();

/* ---------- светлая и тёмная тема ---------- */
$('theme')?.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  store.set('localStorage', 'theme', next);
});

/* ---------- переключатель языков: запоминаем выбор ---------- */
document.querySelectorAll('.key').forEach((key) => {
  key.addEventListener('click', () => {
    store.set('localStorage', 'lang', key.dataset.lang);
    store.set('sessionStorage', 'scramble', '1');
  });
});
// Зашли на /ru/ напрямую — это тоже выбор, пока человек не нажал другую клавишу.
if (!store.get('localStorage', 'lang')) store.set('localStorage', 'lang', document.documentElement.lang);

/* имя «пересобирается» через письменности после смены языка */
(function scramble() {
  const el = $('nameFx');
  if (!el || calm || store.get('sessionStorage', 'scramble') !== '1') return;
  store.set('sessionStorage', 'scramble', '');
  const finalText = el.textContent;
  const pool = 'ЯБЖФЫAGKRSӘҖҢӨҮĞŞİÇÖあきるバキルßÄÜ';
  const total = 9;
  let frame = 0;
  const timer = setInterval(() => {
    frame += 1;
    const fixed = Math.floor((frame / total) * finalText.length);
    el.textContent = [...finalText]
      .map((ch, idx) => (idx < fixed ? ch : pool[Math.floor(Math.random() * pool.length)]))
      .join('');
    if (frame >= total) {
      clearInterval(timer);
      el.textContent = finalText;
    }
  }, 55);
})();

/* ---------- появление блоков и счёт цифр ---------- */
const countUp = (el) => {
  const target = Number(el.dataset.count);
  if (calm || !Number.isFinite(target)) return;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / 900);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        if (entry.target.dataset.count) countUp(entry.target);
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  document.querySelectorAll('.reveal, [data-count]').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
}

/* ---------- плавающая кнопка: после первого экрана, но не поверх контактов ---------- */
(function fab() {
  const btn = $('fab');
  const hero = $('hero');
  const contact = $('contact');
  if (!btn || !hero || !contact || !('IntersectionObserver' in window)) return;
  const seen = { hero: true, contact: false };
  const sync = () => btn.classList.toggle('is-on', !seen.hero && !seen.contact);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      seen[entry.target.id] = entry.isIntersecting;
    });
    sync();
  });
  io.observe(hero);
  io.observe(contact);
})();

/* ---------- книжная полка: листается кнопками, колесом и пальцем ---------- */
(function shelf() {
  const list = $('shelf');
  if (!list) return;
  document.querySelectorAll('.shelf-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = list.clientWidth * 0.8;
      list.scrollBy({ left: Number(btn.dataset.dir) * step, behavior: calm ? 'auto' : 'smooth' });
    });
  });
})();

/* ---------- билет: скопировать контакт, поделиться ---------- */
(function ticket() {
  const vc = $('vc');
  if (!vc) return;
  const toast = $('vcToast');
  let toastTimer;
  const say = (text) => {
    toast.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.textContent = '';
    }, 2400);
  };
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      say(toast.dataset.ok);
    } catch {
      say(toast.dataset.fail);
    }
  };
  $('vcCopy').addEventListener('click', () => copy(vc.dataset.copy));
  $('vcShare').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: vc.dataset.title, url: vc.dataset.url });
      } catch {
        /* человек закрыл окно «поделиться» */
      }
    } else {
      copy(vc.dataset.url);
    }
  });
})();

/* ---------- мягкий свет за стрелкой курсора ---------- */
(function glow() {
  const el = $('glow');
  if (!el || !fineHover || calm) return;
  const HOT = 'a, button, .pc, .book, .medal, .fact, .gallery li, [role="button"]';
  let x = 0;
  let y = 0;
  let gx = 0;
  let gy = 0;
  let running = false;
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!el.classList.contains('is-on')) {
        gx = x;
        gy = y;
        el.classList.add('is-on');
      }
      el.classList.toggle('is-hot', !!(e.target.closest && e.target.closest(HOT)));
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  addEventListener('blur', () => el.classList.remove('is-on'));
  // свет догоняет стрелку с задержкой — получается мягкий след; кадры только пока догоняет
  function tick() {
    gx += (x - gx) * 0.16;
    gy += (y - gy) * 0.16;
    el.style.transform = `translate(${gx}px, ${gy}px)`;
    if (Math.abs(x - gx) > 0.4 || Math.abs(y - gy) > 0.4) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }
})();
