/* =========================================================
   ENGINE — motor de animação em JS puro
   ticker · tween · smooth scroll inercial · cenas de scroll
   split de texto · reveal por interseção
   ========================================================= */
(() => {
  'use strict';

  const ME = (window.ME = window.ME || {});

  /* ---------- Utilidades ---------- */
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // mapeia v do intervalo [a,b] para [c,d], com clamp
  const map = (v, a, b, c = 0, d = 1) => c + (d - c) * clamp((v - a) / (b - a));
  const ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inOutExpo: (t) =>
      t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  };
  ME.u = { clamp, lerp, map, ease };

  ME.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ME.touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  ME.mobile = () => window.matchMedia('(max-width: 900px)').matches;

  /* ---------- Ticker (um único rAF para tudo) ---------- */
  const subs = [];
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.064, (now - last) / 1000) || 0.016;
    last = now;
    for (let i = 0; i < subs.length; i++) subs[i].fn(now, dt);
    requestAnimationFrame(tick);
  };
  ME.ticker = {
    // prioridade menor roda primeiro (scroll = 0, cenas = 10, efeitos = 20)
    add(fn, priority = 20) {
      subs.push({ fn, priority });
      subs.sort((a, b) => a.priority - b.priority);
      return () => ME.ticker.remove(fn);
    },
    remove(fn) {
      const i = subs.findIndex((s) => s.fn === fn);
      if (i > -1) subs.splice(i, 1);
    },
  };
  requestAnimationFrame(tick);

  /* ---------- Tween ---------- */
  ME.tween = ({ from = 0, to = 1, duration = 1000, delay = 0, easing = ease.outCubic, onUpdate, onComplete }) => {
    let start = null;
    const fn = (now) => {
      if (start === null) start = now + delay;
      if (now < start) return;
      const t = clamp((now - start) / duration);
      onUpdate && onUpdate(lerp(from, to, easing(t)), t);
      if (t >= 1) {
        ME.ticker.remove(fn);
        onComplete && onComplete();
      }
    };
    ME.ticker.add(fn, 15);
    return { kill: () => ME.ticker.remove(fn) };
  };
  ME.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Smooth scroll inercial (estilo Lenis) ----------
     Mantém o scroll nativo do documento (position: sticky continua
     funcionando) e apenas interpola a posição com inércia. */
  class SmoothScroll {
    constructor() {
      this.enabled = !ME.touch && !ME.reduced;
      this.y = this.target = window.scrollY;
      this.velocity = 0;
      this.direction = 1;
      this.animating = false;
      this.locked = false;
      this.tw = null;
      this.lerp = 0.085;
      this.max = this.limit();

      this.onWheel = this.onWheel.bind(this);
      this.onScroll = this.onScroll.bind(this);
      if (this.enabled) window.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', () => (this.max = this.limit()));
      ME.ticker.add((now, dt) => this.raf(now, dt), 0);
    }
    limit() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    onWheel(e) {
      if (e.ctrlKey) return; // zoom do navegador
      if (this.locked) {
        e.preventDefault();
        return;
      }
      const t = e.target;
      if (t && t.closest && t.closest('[data-native-scroll]')) return;
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 40;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      if (!this.animating && !this.tw) this.y = this.target = window.scrollY;
      this.tw = null;
      this.max = this.limit();
      this.target = clamp(this.target + d, 0, this.max);
      this.animating = true;
    }
    onScroll() {
      // teclado, barra de rolagem, âncoras: sincroniza
      if (!this.animating && !this.tw) this.y = this.target = window.scrollY;
    }
    scrollTo(dest, { duration = 1600, offset = 0, immediate = false } = {}) {
      if (typeof dest !== 'number') {
        const el = typeof dest === 'string' ? document.querySelector(dest) : dest;
        if (!el) return;
        dest = el.getBoundingClientRect().top + window.scrollY + offset;
      }
      dest = clamp(dest, 0, this.limit());
      if (immediate || ME.reduced) {
        this.animating = false;
        this.tw = null;
        window.scrollTo(0, dest);
        this.y = this.target = dest;
        return;
      }
      if (!this.enabled) {
        window.scrollTo({ top: dest, behavior: 'smooth' });
        return;
      }
      const dist = Math.abs(dest - window.scrollY);
      this.tw = {
        from: window.scrollY,
        to: dest,
        start: performance.now(),
        duration: clamp(dist * 0.35, 900, duration + 600),
      };
      this.animating = false;
    }
    lock() {
      this.locked = true;
      this.animating = false;
      this.tw = null;
      // com o smooth ativo a roda já é bloqueada; no touch trava o overflow
      if (!this.enabled) document.documentElement.classList.add('is-locked');
    }
    unlock() {
      this.locked = false;
      this.y = this.target = window.scrollY;
      document.documentElement.classList.remove('is-locked');
    }
    raf(now, dt) {
      const prev = this.y;
      if (this.tw) {
        const tw = this.tw;
        const t = clamp((now - tw.start) / tw.duration);
        this.y = this.target = lerp(tw.from, tw.to, ease.inOutQuart(t));
        window.scrollTo(0, this.y);
        if (t >= 1) this.tw = null;
      } else if (this.animating) {
        const k = 1 - Math.pow(1 - this.lerp, dt * 60);
        this.y = lerp(this.y, this.target, k);
        if (Math.abs(this.target - this.y) < 0.35) {
          this.y = this.target;
          this.animating = false;
        }
        window.scrollTo(0, this.y);
      } else {
        this.y = window.scrollY;
      }
      const v = (this.y - prev) / Math.max(dt, 0.001);
      this.velocity = lerp(this.velocity, v, 0.18);
      if (Math.abs(this.y - prev) > 0.1) this.direction = this.y > prev ? 1 : -1;
    }
  }
  ME.SmoothScroll = SmoothScroll;

  /* ---------- Cenas de scroll (estilo ScrollTrigger) ----------
     start/end: "<borda do elemento> <borda da viewport>"
     ex.: "top bottom" = quando o topo do elemento toca o fundo da tela */
  const edge = (s) => {
    if (s === 'top') return 0;
    if (s === 'center') return 0.5;
    if (s === 'bottom') return 1;
    if (s && s.endsWith('%')) return parseFloat(s) / 100;
    return 0;
  };
  const resolve = (str, top, h, vh) => {
    const [a, b = 'top'] = str.split(' ');
    return top + edge(a) * h - edge(b) * vh;
  };

  class Scene {
    constructor(el, o) {
      this.el = el;
      this.o = o;
      this.progress = -1;
      this.inside = false;
      this.refresh();
    }
    refresh() {
      // intervalo calculado manualmente (útil para elementos sticky)
      if (this.o.range) {
        [this.start, this.end] = this.o.range();
        if (this.end <= this.start) this.end = this.start + 1;
        return;
      }
      const r = this.el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const vh = window.innerHeight;
      this.start = resolve(this.o.start || 'top bottom', top, r.height, vh);
      this.end = resolve(this.o.end || 'bottom top', top, r.height, vh);
      if (this.end <= this.start) this.end = this.start + 1;
    }
    update(y, force) {
      const p = clamp((y - this.start) / (this.end - this.start));
      const inside = y > this.start && y < this.end;
      if (force || p !== this.progress) {
        this.progress = p;
        this.o.onUpdate && this.o.onUpdate(p, this);
      }
      if (inside !== this.inside) {
        this.inside = inside;
        if (inside) this.o.onEnter && this.o.onEnter(this);
        else this.o.onLeave && this.o.onLeave(this);
      }
    }
  }

  const scenes = [];
  ME.scene = (el, o) => {
    if (!el) return null;
    const s = new Scene(el, o);
    scenes.push(s);
    return s;
  };
  ME.refresh = () => {
    for (const fn of refreshHooks) fn();
    for (const s of scenes) s.refresh();
    if (ME.scroll) ME.scroll.max = ME.scroll.limit();
    for (const s of scenes) s.update(ME.scroll ? ME.scroll.y : window.scrollY, true);
  };
  const refreshHooks = [];
  ME.onRefresh = (fn) => refreshHooks.push(fn);

  ME.ticker.add(() => {
    const y = ME.scroll ? ME.scroll.y : window.scrollY;
    for (let i = 0; i < scenes.length; i++) scenes[i].update(y);
  }, 10);

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(ME.refresh, 180);
  });

  /* ---------- Split de texto ----------
     Mantém elementos inline (em, b...) e gera .w (palavra) > .wi > .c (letra) */
  ME.split = (el, { chars = true } = {}) => {
    if (!el || el.dataset.splitDone) return el && el._split;
    el.dataset.splitDone = '1';
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    let wi = 0;
    let ci = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--wi', wi++);
            const inner = document.createElement('span');
            inner.className = 'wi';
            if (chars) {
              // NFC + agrupa marcas combinantes para acentos não se soltarem
              (part.normalize('NFC').match(/\P{M}\p{M}*/gu) || []).forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'c';
                c.textContent = ch;
                c.style.setProperty('--ci', ci++);
                inner.appendChild(c);
              });
            } else inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    // leitores de tela leem o texto inteiro, não as letras soltas
    Array.from(el.children).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    if (!el.closest('[aria-label]')) {
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      el.appendChild(sr);
    }
    el.style.setProperty('--wc', wi);
    el.style.setProperty('--cc', ci);
    el._split = { words: el.querySelectorAll('.w'), chars: el.querySelectorAll('.c') };
    return el._split;
  };

  // índice de linha por palavra (para revelar linha a linha)
  ME.lineIndex = (el) => {
    const words = el.querySelectorAll('.w');
    let line = -1;
    let lastTop = null;
    words.forEach((w) => {
      const t = w.offsetTop;
      if (lastTop === null || Math.abs(t - lastTop) > 4) {
        line++;
        lastTop = t;
      }
      w.style.setProperty('--li', line);
    });
  };

  // posição de um nó relativa a um ancestral posicionado (ignora transforms)
  ME.offsetIn = (node, root) => {
    let x = 0;
    let y = 0;
    while (node && node !== root) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y };
  };

  /* ---------- Decodificação de texto (scramble) ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ✦/•&';
  ME.scramble = (el, { duration = 1100 } = {}) => {
    const node = el.classList.contains('scr') ? el : el.querySelector('.scr');
    if (!node) return;
    const final = node.dataset.final || (node.dataset.final = node.textContent);
    const n = final.length;
    const settle = Array.from({ length: n }, (_, i) => (i / n) * 0.62 + Math.random() * 0.3 + 0.08);
    node.textContent = '';
    ME.tween({
      duration,
      easing: ease.linear,
      onUpdate: (_, t) => {
        let out = '';
        for (let i = 0; i < n; i++) {
          const ch = final[i];
          if (ch === ' ' || t >= settle[i]) out += ch;
          else if (t >= settle[i] - 0.3) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        node.textContent = out;
      },
      onComplete: () => (node.textContent = final),
    });
  };

  /* ---------- Reveal por interseção ---------- */
  ME.reveal = (els, { rootMargin = '0px 0px -12% 0px', once = true, onIn } = {}) => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            onIn && onIn(e.target);
            if (once) io.unobserve(e.target);
          } else if (!once) e.target.classList.remove('is-in');
        });
      },
      { rootMargin, threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return io;
  };
})();
