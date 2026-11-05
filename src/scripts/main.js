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

/* ---------- курсор: точка и кольцо, без свечения ---------- */
(function cursor() {
  const box = $('cursor');
  if (!box || !fineHover || calm) return;
  const root = document.documentElement;
  const ring = box.querySelector('.cursor-ring');
  const dot = box.querySelector('.cursor-dot');
  const HOT = 'a, button, .pc, .book, [role="button"]';
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let rx = x;
  let ry = y;
  let running = false;

  root.classList.add('has-cursor');
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      box.classList.add('is-on');
      box.classList.toggle('is-hot', !!(e.target.closest && e.target.closest(HOT)));
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => box.classList.remove('is-on'));
  addEventListener('blur', () => box.classList.remove('is-on'));
  addEventListener('pointerdown', () => box.classList.add('is-down'));
  addEventListener('pointerup', () => box.classList.remove('is-down'));

  // кадры рисуем, только пока кольцо догоняет точку — без вечного цикла
  function tick() {
    rx += (x - rx) * 0.25;
    ry += (y - ry) * 0.25;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    if (Math.abs(x - rx) > 0.3 || Math.abs(y - ry) > 0.3) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }
})();
