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
  }, 230);
  box.addEventListener('click', close);
  addEventListener('keydown', close);
})();

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

/* ---------- подсветка карточек за курсором ---------- */
if (fineHover && !calm) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener(
      'pointermove',
      (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      },
      { passive: true },
    );
  });
}

/* ---------- плавающая кнопка: после hero, но не поверх контактов ---------- */
(function fab() {
  const btn = $('fab');
  const hero = $('hero');
  const contact = $('contact');
  if (!btn || !hero || !contact || !('IntersectionObserver' in window)) return;
  // и не поверх пайплайна: там свой главный экран
  const seen = { hero: true, contact: false, pipe: false };
  const sync = () => btn.classList.toggle('is-on', !seen.hero && !seen.contact && !seen.pipe);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      seen[entry.target.id] = entry.isIntersecting;
    });
    sync();
  });
  [hero, contact, $('pipe')].forEach((el) => el && io.observe(el));
})();

/* ---------- «Запустить пайплайн» ---------- */
(function pipeline() {
  const pipe = $('pipe');
  const run = $('pipeRun');
  const log = $('pipeLog');
  if (!pipe || !run || !log) return;
  const steps = [...pipe.querySelectorAll('.step')];
  const STEP_MS = 1500;
  let timers = [];

  const paint = (stage) => {
    pipe.dataset.stage = String(stage);
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i + 1 === stage && pipe.hasAttribute('data-running'));
      step.classList.toggle('is-done', i + 1 < stage || (i + 1 === stage && !pipe.hasAttribute('data-running')));
    });
    if (stage > 0) log.textContent = steps[stage - 1].dataset.log;
  };

  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    pipe.removeAttribute('data-running');
    paint(0);
    log.textContent = log.dataset.idle;
    run.textContent = pipe.dataset.run;
    run.disabled = false;
  };

  const finish = () => {
    pipe.removeAttribute('data-running');
    paint(steps.length);
    run.textContent = pipe.dataset.rerun;
    run.disabled = false;
  };

  const start = () => {
    reset();
    if (calm) return finish(); // без анимации — сразу итог
    pipe.setAttribute('data-running', '');
    run.disabled = true;
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => paint(i + 1), 350 + i * STEP_MS));
    });
    timers.push(setTimeout(finish, 350 + steps.length * STEP_MS));
  };

  // Без JS страница показывает готовый результат; с JS начинаем с «до».
  reset();
  run.addEventListener('click', () => {
    // на телефоне подводим макет под шапку, чтобы шаги и результат были на одном экране
    if (pipe.querySelector('.mock').getBoundingClientRect().top < 60 || innerHeight < 800) {
      pipe.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
    }
    if (calm && pipe.dataset.stage === String(steps.length)) return reset();
    start();
  });
})();

/* ---------- цифровая визитка ---------- */
(function card() {
  const vc = $('vc');
  if (!vc) return;
  const front = $('vcFront');
  const back = $('vcBack');
  const toast = $('vcToast');
  let toastTimer;
  let gyroOn = false;
  let visible = false;

  const say = (text) => {
    toast.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.textContent = '';
    }, 2400);
  };

  const flip = (toBack) => {
    vc.classList.toggle('is-flipped', toBack);
    front.inert = toBack;
    back.inert = !toBack;
    (toBack ? $('vcCopy') : front).focus({ preventScroll: true });
  };

  front.addEventListener('click', () => {
    flip(true);
    askGyro();
  });
  $('vcFlipBack').addEventListener('click', () => flip(false));
  back.addEventListener('click', (e) => {
    if (!e.target.closest('button, a')) flip(false);
  });
  vc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && vc.classList.contains('is-flipped')) flip(false);
  });

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

  if (calm) return;

  /* наклон: курсор на десктопе, гироскоп на телефоне */
  const tilt = (x, y) => {
    vc.style.setProperty('--ry', `${(x * 20).toFixed(2)}deg`);
    vc.style.setProperty('--rx', `${(-y * 16).toFixed(2)}deg`);
    vc.style.setProperty('--gx', `${(50 + x * 60).toFixed(1)}%`);
    vc.style.setProperty('--gy', `${(50 + y * 60).toFixed(1)}%`);
  };

  if (fineHover) {
    vc.addEventListener(
      'pointermove',
      (e) => {
        const r = vc.getBoundingClientRect();
        vc.classList.add('is-tilting');
        tilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      },
      { passive: true },
    );
    vc.addEventListener('pointerleave', () => {
      vc.classList.remove('is-tilting');
      tilt(0, 0);
    });
    return;
  }

  const clamp = (v) => Math.max(-0.5, Math.min(0.5, v));
  const onTilt = (e) => {
    if (!visible || e.gamma == null) return;
    vc.classList.add('is-tilting');
    tilt(clamp(e.gamma / 50), clamp((e.beta - 45) / 60));
  };
  const listen = () => {
    if (gyroOn) return;
    gyroOn = true;
    addEventListener('deviceorientation', onTilt, { passive: true });
  };
  // iOS отдаёт гироскоп только после разрешения, спрошенного по нажатию.
  function askGyro() {
    const D = window.DeviceOrientationEvent;
    if (calm || fineHover || gyroOn || !D || typeof D.requestPermission !== 'function') return;
    D.requestPermission()
      .then((state) => state === 'granted' && listen())
      .catch(() => {});
  }
  if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== 'function') listen();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(vc);
  } else {
    visible = true;
  }
})();
