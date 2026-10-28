/* =========================================================
   MAIN — coreografia de cada seção
   ========================================================= */
(() => {
  'use strict';

  const ME = window.ME;
  const { clamp, lerp, map, ease } = ME.u;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const MOBILE = ME.mobile();
  ME.scroll = new ME.SmoothScroll();

  /* ---------- Preparação de texto ---------- */
  $$('[data-split]').forEach((el) => ME.split(el, { chars: el.dataset.split === 'chars' }));

  const wrapWords = (el) => {
    const walk = (node) =>
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else {
              const s = document.createElement('span');
              s.className = 'sw';
              s.textContent = part;
              frag.appendChild(s);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    walk(el);
    return $$('.sw', el);
  };
  const scrubWords = (words, p) => {
    const f = p * words.length;
    for (let i = 0; i < words.length; i++) {
      const o = clamp(f - i);
      words[i].style.opacity = (0.13 + o * 0.87).toFixed(3);
      words[i].classList.toggle('is-lit', o > 0.5);
    }
  };
  $$('[data-scrub-words]').forEach((el) => (el._words = wrapWords(el)));

  // texto dos eyebrows vira um span decodificável
  $$('.eyebrow').forEach((e) =>
    Array.from(e.childNodes).forEach((n) => {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const sp = document.createElement('span');
        sp.className = 'scr';
        sp.textContent = n.textContent;
        n.replaceWith(sp);
      }
    })
  );

  const lineEls = $$('[data-split="lines"]');
  ME.onRefresh(() => lineEls.forEach(ME.lineIndex));

  /* =========================================================
     NAV · MENU · HUD · PROGRESSO
     ========================================================= */
  const nav = () => {
    const bar = $('.nav');
    const html = document.documentElement;
    const burger = $('.nav__burger');
    const menu = $('.menu');

    const closeMenu = () => {
      if (!html.classList.contains('menu-open')) return;
      html.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      ME.scroll.unlock();
    };
    burger.addEventListener('click', () => {
      const open = !html.classList.contains('menu-open');
      html.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      open ? ME.scroll.lock() : ME.scroll.unlock();
    });

    $$('[data-scrollto]').forEach((a) =>
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href[0] !== '#') return;
        e.preventDefault();
        const wasOpen = html.classList.contains('menu-open');
        closeMenu();
        setTimeout(() => ME.scroll.scrollTo(href), wasOpen ? 450 : 0);
      })
    );

    ME.ticker.add(() => {
      const y = ME.scroll.y;
      bar.classList.toggle('is-scrolled', y > 40);
      const hide = y > innerHeight * 0.7 && ME.scroll.direction > 0 && !html.classList.contains('menu-open');
      bar.classList.toggle('is-hidden', hide);
    }, 30);

    const links = $$('.nav__links a');
    links.forEach((link) => {
      ME.scene($(link.getAttribute('href')), {
        start: 'top center',
        end: 'bottom center',
        onEnter: () => links.forEach((l) => l.classList.toggle('is-active', l === link)),
        onLeave: () => link.classList.remove('is-active'),
      });
    });

    const prog = $('.progress');
    ME.ticker.add(() => {
      const max = ME.scroll.max || 1;
      prog.style.setProperty('--p', clamp(ME.scroll.y / max).toFixed(4));
    }, 30);
  };

  const hud = () => {
    const el = $('.hud');
    const num = $('.hud__num .hud__roll');
    const name = $('.hud__name .hud__roll');
    const secs = $$('[data-section]');
    let current = 0;
    let timer;
    let contactTop = Infinity;
    ME.onRefresh(() => (contactTop = $('#contato').getBoundingClientRect().top + window.scrollY));
    const set = (i) => {
      if (i === current) return;
      current = i;
      clearTimeout(timer);
      [num, name].forEach((r) => r.classList.add('is-out'));
      timer = setTimeout(() => {
        num.textContent = String(i + 1).padStart(2, '0');
        name.textContent = secs[i].dataset.section;
        [num, name].forEach((r) => {
          r.classList.remove('is-out');
          r.classList.add('is-pre');
          void r.offsetWidth;
          r.classList.remove('is-pre');
        });
      }, 280);
    };
    secs.forEach((s, i) => ME.scene(s, { start: 'top center', end: 'bottom center', onEnter: () => set(i) }));
    ME.ticker.add(() => {
      const y = ME.scroll.y;
      el.classList.toggle('is-visible', y > innerHeight * 1.6 && y < contactTop - innerHeight * 0.4);
    }, 30);
  };

  /* =========================================================
     HERO — ouro líquido + mergulho dentro do "o" de "conectam"
     ========================================================= */
  const hero = () => {
    const sec = $('.hero');
    const content = $('.hero__content');
    const title = $('.hero__title');
    const eyebrow = $('.hero__eyebrow');
    const lead = $('.hero__lead');
    const pillars = $('.hero__pillars');
    const cue = $('.hero__scroll');
    const rings = $('.hero__rings');
    const veil = $('.hero__veil');
    const dust = $('.hero__dust');
    $('.hero__line--2').style.setProperty('--d', '260ms');
    lead.style.setProperty('--d', '700ms');

    let sp = 0;
    ME.dust(dust);
    const gl = ME.goldShader($('.hero__gl'));
    ME.magneticText(title, { radius: 170, strength: 30, active: () => sp < 0.01 });

    // ponto de mergulho: centro do "o" de "conectam."
    const target = $$('.hero__line--1 em .c')[1];
    const g = { dx: 0, dy: 0 };
    ME.onRefresh(() => {
      const o = ME.offsetIn(target, title);
      const ox = o.x + target.offsetWidth * 0.5;
      const oy = o.y + target.offsetHeight * 0.6;
      title.style.transformOrigin = `${ox}px ${oy}px`;
      const t = ME.offsetIn(title, content);
      g.dx = innerWidth / 2 - (t.x + ox);
      g.dy = innerHeight / 2 - (t.y + oy);
    });

    ME.scene(sec, { start: 'top top', end: 'bottom bottom', onUpdate: (p) => (sp = p) });

    const S = MOBILE ? 70 : 120;
    let spin = 0;
    ME.ticker.add((now, dt) => {
      spin += dt * (4 + Math.min(Math.abs(ME.scroll.velocity) * 0.02, 40));
      if (sp >= 1) return;
      const out = ease.inOutCubic(map(sp, 0, 0.14));
      const z = map(sp, 0.05, 0.86);
      const ez = Math.pow(z, 1.6);
      const scale = Math.pow(S, ez);
      const move = ease.inOutCubic(map(sp, 0.03, 0.55));
      title.style.transform =
        sp > 0.0005 ? `translate3d(${(g.dx * move).toFixed(2)}px, ${(g.dy * move).toFixed(2)}px, 0) scale(${scale.toFixed(4)})` : '';

      const tilt = MOBILE ? 0 : 1 - out;
      content.style.transform =
        tilt > 0.001 ? `perspective(1200px) rotateX(${(ME.mouse.sy * -4 * tilt).toFixed(3)}deg) rotateY(${(ME.mouse.sx * 6 * tilt).toFixed(3)}deg)` : '';

      eyebrow.style.opacity = lead.style.opacity = (1 - out).toFixed(3);
      eyebrow.style.transform = `translate3d(0, ${(-out * 50).toFixed(1)}px, 0)`;
      lead.style.transform = `translate3d(0, ${(out * 50).toFixed(1)}px, 0)`;
      pillars.style.opacity = cue.style.opacity = sp > 0.001 ? (1 - out).toFixed(3) : '';

      rings.style.transform = `translate(-50%, -50%) rotate(${(spin + sp * 140).toFixed(2)}deg) scale(${(1 + ez * 7).toFixed(4)})`;
      rings.style.opacity = (1 - map(sp, 0.25, 0.6)).toFixed(3);
      dust.style.opacity = (1 - map(sp, 0.3, 0.7)).toFixed(3);
      veil.style.opacity = ease.inOutCubic(map(sp, 0.76, 0.98)).toFixed(3);
      if (gl) {
        gl.zoom = 1 + ez * 2.6;
        gl.glow = 1 + ez * 1.1;
        gl.calm = 1 - out;
      }
    }, 20);
  };

  /* =========================================================
     PRAZER — retrato abre, manifesto acende palavra a palavra
     ========================================================= */
  const about = () => {
    const sec = $('.about');
    const portrait = $('.about__portrait');
    const badge = $('.about__badge');
    const words = $('.about__manifesto')._words;
    const values = $('.about__values');

    ME.scene(sec, {
      start: MOBILE ? 'top 75%' : 'top top',
      end: 'bottom bottom',
      onUpdate: (p) => {
        const a = ease.outCubic(map(p, 0, MOBILE ? 0.3 : 0.38));
        portrait.style.setProperty('--ci', `${((1 - a) * 30).toFixed(2)}%`);
        portrait.style.setProperty('--cx', `${((1 - a) * 22).toFixed(2)}%`);
        portrait.style.setProperty('--is', (1.25 - a * 0.25).toFixed(4));
        scrubWords(words, map(p, MOBILE ? 0.25 : 0.08, MOBILE ? 0.85 : 0.78));
        values.classList.toggle('is-in', p > (MOBILE ? 0.85 : 0.8));
      },
    });
    ME.scene(sec, {
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (p) => (badge.style.transform = `rotate(${p * 540}deg)`),
    });
  };

  /* =========================================================
     MARQUEES
     ========================================================= */
  const marquees = () => {
    $$('.marquee__row').forEach((row) => ME.marquee(row));
    const tags = $('.tags');
    tags.dataset.speed = '40';
    tags.dataset.dir = '-1';
    ME.marquee(tags, $('.tags__track'));
  };

  /* =========================================================
     DIFERENCIAL — cards empilhados com entrada e inclinação 3D
     ========================================================= */
  const diff = () => {
    const stack = $('.diff__stack');
    const cards = $$('.diff-card');
    const inners = cards.map((c) => $('.diff-card__inner', c));
    const shades = cards.map((c) => $('.diff-card__shade', c));
    const geo = { stackTop: 0, h: 0, gap: 0 };
    ME.onRefresh(() => {
      geo.stackTop = stack.getBoundingClientRect().top + window.scrollY;
      geo.h = cards[0].offsetHeight;
      geo.gap = parseFloat(getComputedStyle(cards[0]).marginBottom) || 0;
    });
    const stickyTop = (i) => parseFloat(getComputedStyle(cards[i]).top) || 0;
    const naturalTop = (i) => geo.stackTop + i * (geo.h + geo.gap);
    const st = cards.map(() => ({ e: 0, ein: 0, tx: 0, ty: 0, x: 0, y: 0, last: '' }));

    cards.forEach((card, i) => {
      // entrada: o card sobe "deitado" e se endireita
      ME.scene(card, {
        range: () => [naturalTop(i) - innerHeight, naturalTop(i) - innerHeight * 0.3],
        onUpdate: (p) => (st[i].ein = ease.outCubic(p)),
      });
      // empilhamento: encolhe e escurece quando o próximo chega
      if (cards[i + 1]) {
        ME.scene(card, {
          range: () => [naturalTop(i + 1) - innerHeight, naturalTop(i + 1) - stickyTop(i + 1)],
          onUpdate: (p) => (st[i].e = ease.inOutCubic(p)),
        });
      }
      if (!ME.touch) {
        const inner = inners[i];
        inner.addEventListener('pointermove', (e) => {
          const r = inner.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          st[i].tx = ny * -7;
          st[i].ty = nx * 9;
          inner.style.setProperty('--mx', `${e.clientX - r.left}px`);
          inner.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
        inner.addEventListener('pointerleave', () => (st[i].tx = st[i].ty = 0));
      }
    });

    ME.ticker.add((now, dt) => {
      const k = 1 - Math.pow(1 - 0.1, dt * 60);
      for (let i = 0; i < cards.length; i++) {
        const s = st[i];
        s.x = lerp(s.x, s.tx, k);
        s.y = lerp(s.y, s.ty, k);
        const enter = 1 - s.ein;
        const tf =
          `perspective(1400px) translate3d(0, ${(-s.e * 2 + enter * 10).toFixed(2)}vh, 0) ` +
          `scale(${(1 - s.e * 0.08 - enter * 0.08).toFixed(4)}) ` +
          `rotateX(${(s.e * 5 - enter * 22 + s.x).toFixed(2)}deg) rotateY(${s.y.toFixed(2)}deg)`;
        if (tf !== s.last) {
          inners[i].style.transform = tf;
          shades[i].style.opacity = Math.min(0.8, s.e * 0.7 + enter * 0.6).toFixed(3);
          s.last = tf;
        }
      }
    }, 20);
  };

  /* =========================================================
     MÉTODO — trilho horizontal curvo em 3D, onda e números
     ========================================================= */
  const method = () => {
    const sec = $('.method');
    const track = $('.method__track');
    const panels = $$('.method__panel');
    const steps = $$('.method__step');
    const endPanel = $('.method__end');
    const endTxt = $('.method__end-txt');
    const bar = $('.method__bar');
    const wave = $('.method__wave');
    const fg = $('.method__wave-fg');
    const bgp = $('.method__wave-bg');
    const dot = $('.method__dot');

    if (MOBILE) {
      endTxt.style.setProperty('--es', 1);
      endTxt.style.setProperty('--eo', 1);
      steps.forEach((s) =>
        ME.scene(s, {
          start: 'top 90%',
          end: 'top 45%',
          onUpdate: (p) => s.style.setProperty('--fill', ease.outCubic(p).toFixed(3)),
        })
      );
      return;
    }

    const g = { dist: 0, len: 0, startX: 0, endX: 0, offY: 0, centers: [], pc: [], endC: 0 };
    const H = 240;
    ME.onRefresh(() => {
      track.style.transform = 'none';
      const trackW = track.scrollWidth;
      g.dist = trackW - innerWidth;
      sec.style.height = `${g.dist + innerHeight * 1.2}px`;

      wave.setAttribute('width', trackW);
      wave.setAttribute('height', H);
      wave.setAttribute('viewBox', `0 0 ${trackW} ${H}`);
      wave.style.width = `${trackW}px`;
      g.startX = $('.method__intro').offsetWidth * 0.94;
      g.endX = endPanel.offsetLeft + endPanel.offsetWidth * 0.25;
      const segs = steps.length * 2;
      const segW = (g.endX - g.startX) / segs;
      let d = `M ${g.startX} ${H / 2}`;
      for (let i = 0; i < segs; i++) {
        const x0 = g.startX + i * segW;
        const amp = (i % 2 ? 1 : -1) * H * 0.42;
        d += ` C ${x0 + segW * 0.36} ${H / 2 + amp}, ${x0 + segW * 0.64} ${H / 2 + amp}, ${x0 + segW} ${H / 2}`;
      }
      fg.setAttribute('d', d);
      bgp.setAttribute('d', d);
      g.len = fg.getTotalLength();
      fg.style.strokeDasharray = `${g.len}`;
      g.offY = track.offsetHeight / 2 - H / 2;
      g.centers = steps.map((s) => s.offsetLeft + s.offsetWidth / 2);
      g.pc = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
      g.endC = endPanel.offsetLeft + endPanel.offsetWidth / 2;
    });

    ME.scene(sec, {
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (p) => {
        // um respiro no começo e no fim do trilho
        const x = ease.inOutCubic(map(p, 0.04, 0.96)) * g.dist;
        track.style.transform = `translate3d(${-x}px, 0, 0)`;
        bar.style.setProperty('--p', p.toFixed(4));

        const cx = x + innerWidth * 0.5;
        const tp = clamp((cx - g.startX) / (g.endX - g.startX));
        fg.style.strokeDashoffset = `${g.len * (1 - tp)}`;
        const pt = fg.getPointAtLength(g.len * tp);
        dot.style.transform = `translate3d(${pt.x}px, ${pt.y + g.offY}px, 0) scale(${tp > 0 && tp < 1 ? 1 : 0})`;

        // painéis curvam como num cilindro conforme saem do centro
        panels.forEach((pn, i) => {
          const a = clamp((g.pc[i] - cx) / innerWidth, -1.3, 1.3);
          pn.style.transform = `translate3d(0, 0, ${(-Math.abs(a) * 260).toFixed(1)}px) rotateY(${(a * 26).toFixed(2)}deg)`;
        });
        steps.forEach((s, i) => {
          const local = (g.centers[i] - cx) / innerWidth;
          s.style.setProperty('--fill', ease.inOutCubic(map(local, 0.55, 0.0)).toFixed(3));
          s.style.setProperty('--shift', (local * 160).toFixed(1));
          s.style.setProperty('--o', (1 - clamp(Math.abs(local) - 0.2) * 1.6).toFixed(3));
        });
        const el = ease.outCubic(map((g.endC - cx) / innerWidth, 0.6, 0.05));
        endTxt.style.setProperty('--es', (0.7 + el * 0.3).toFixed(4));
        endTxt.style.setProperty('--eo', el.toFixed(3));
      },
    });
  };

  /* =========================================================
     CASE REAL (um único reel) — círculo dourado, contadores, celular 3D
     ========================================================= */
  const results = () => {
    const sec = $('.results');
    const bg = $('.results__bg');
    const content = $('.results__content');
    const left = $('.results__left');
    const title = $('.results__title');
    const lead = $('.results__lead');
    const badge = $('.results__badge');
    const stats = $$('.stat');
    const nums = $$('.stat strong');
    const phone = $('.phone');
    const chart = $('.results__chart');
    const chips = $$('.results__chip');
    const after = $('.results__after');
    const afterWords = $('.results__after p')._words;

    const count = (p) =>
      nums.forEach((n) => {
        const to = parseFloat(n.dataset.count);
        n.textContent = ME.formatCount(to * p, +n.dataset.decimals || 0, n.dataset.suffix || '');
      });

    if (MOBILE) {
      ME.scene(sec, {
        start: 'top bottom',
        end: 'top 25%',
        onUpdate: (p) => bg.style.setProperty('--rm', `${((1 - ease.outCubic(p)) * 45).toFixed(2)}%`),
      });
      ME.scene($('.stats'), { start: 'top 90%', end: 'top 35%', onUpdate: (p) => count(ease.outQuart(p)) });
      ME.scene($('.results__right'), {
        start: 'top bottom',
        end: 'center center',
        onUpdate: (p) => {
          const e = ease.outCubic(p);
          phone.style.transform = `translate3d(0, ${(1 - e) * 80}px, 0) rotateY(${(1 - e) * -28}deg) rotateX(${(1 - e) * 14}deg)`;
          chart.style.setProperty('--draw', e.toFixed(4));
          chips.forEach((c, i) => c.style.setProperty('--cs', ease.outBack(map(p, 0.55 + i * 0.15, 0.85 + i * 0.15)).toFixed(4)));
        },
      });
      ME.scene(after, { start: 'top 85%', end: 'bottom 65%', onUpdate: (p) => scrubWords(afterWords, p) });
      return;
    }

    let prog = 0;
    const render = () => {
      const p = prog;
      const open = ease.inOutCubic(map(p, 0, 0.15));
      const close = ease.inOutCubic(map(p, 0.92, 1));
      bg.style.setProperty('--r', `${(open * (1 - close) * 90).toFixed(2)}%`);
      content.style.opacity = (map(p, 0.08, 0.17) * (1 - map(p, 0.86, 0.92))).toFixed(3);

      const tIn = ease.outCubic(map(p, 0.1, 0.22));
      title.style.transform = `translate3d(0, ${(1 - tIn) * 60}px, 0)`;
      title.style.opacity = tIn.toFixed(3);
      const bIn = ease.outCubic(map(p, 0.12, 0.24));
      badge.style.transform = `translate3d(0, ${(1 - bIn) * 30}px, 0)`;
      badge.style.opacity = bIn.toFixed(3);
      const lIn = ease.outCubic(map(p, 0.14, 0.26));
      lead.style.transform = `translate3d(0, ${(1 - lIn) * 40}px, 0)`;
      lead.style.opacity = lIn.toFixed(3);

      count(ease.outQuart(map(p, 0.18, 0.46)));
      stats.forEach((s, i) => {
        const sIn = ease.outCubic(map(p, 0.16 + i * 0.03, 0.28 + i * 0.03));
        s.style.transform = `translate3d(0, ${(1 - sIn) * 40}px, 0)`;
        s.style.opacity = sIn.toFixed(3);
      });

      const ph = ease.outCubic(map(p, 0.12, 0.44));
      const tilt = ME.mouse.sx * 8;
      const tiltY = ME.mouse.sy * -5;
      phone.style.transform =
        `translate3d(0, ${(1 - ph) * 50}vh, 0) rotateY(${(1 - ph) * -32 + tilt}deg) ` +
        `rotateX(${(1 - ph) * 16 + tiltY}deg) rotateZ(${(1 - ph) * -8}deg)`;
      chart.style.setProperty('--draw', ease.inOutCubic(map(p, 0.24, 0.56)).toFixed(4));
      chips.forEach((c, i) => c.style.setProperty('--cs', ease.outBack(map(p, 0.4 + i * 0.06, 0.48 + i * 0.06)).toFixed(4)));

      const sw = ease.inOutCubic(map(p, 0.54, 0.64));
      left.style.transform = `translate3d(0, ${-sw * 10}vh, 0)`;
      left.style.opacity = (1 - sw).toFixed(3);
      after.style.setProperty('--ao', map(p, 0.6, 0.68).toFixed(3));
      after.style.transform = `translateY(calc(-50% + ${(1 - ease.outCubic(map(p, 0.6, 0.7))) * 8}vh))`;
      scrubWords(afterWords, map(p, 0.64, 0.86));
    };

    ME.scene(sec, { start: 'top top', end: 'bottom bottom', onUpdate: (p) => ((prog = p), render()) });
    ME.ticker.add(() => prog > 0.12 && prog < 0.92 && render(), 20);
  };

  /* =========================================================
     TRABALHOS — colunas em velocidades opostas, cliente ativo acende
     ========================================================= */
  const CLIENTS = { make: 'Make', 'mister-wiz': 'Mister Wiz', 'silva-guimaraes': 'Silva&Guimarães', stayley: 'Stayley' };

  const works = () => {
    const sec = $('.works');
    const cols = $$('.works__col');
    const clients = $$('.works__clients li');
    const counter = $('.works__counter-n');
    const ids = clients.map((c) => c.dataset.client);
    $$('.tile').forEach((t) => {
      t.dataset.label = `${CLIENTS[t.dataset.client]} · ${t.dataset.type}`;
      t.dataset.clientName = CLIENTS[t.dataset.client];
    });

    let active = -1;
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      sec.dataset.active = ids[i];
      clients.forEach((c, j) => c.classList.toggle('is-active', j === i));
      counter.textContent = String(i + 1).padStart(2, '0');
    };
    setActive(0);
    if (MOBILE) return;

    let ranges = [];
    ME.onRefresh(() => {
      cols.forEach((c) => (c.style.transform = 'none'));
      ranges = cols.map((c) => Math.max(0, c.scrollHeight - c.parentElement.clientHeight));
    });
    let prog = 0;
    let skew = 0;
    const scn = ME.scene(sec, {
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (p) => {
        prog = p;
        setActive(Math.min(ids.length - 1, Math.floor(p * ids.length)));
      },
    });
    let pre = 0;
    ME.scene(sec, { start: 'top bottom', end: 'bottom top', onUpdate: (p) => (pre = p) });

    ME.ticker.add(() => {
      if (pre <= 0 || pre >= 1) return;
      skew = lerp(skew, clamp(ME.scroll.velocity * 0.0018, -3.5, 3.5), 0.1);
      cols.forEach((c, i) => {
        const sp = parseFloat(c.dataset.speed);
        const r = ranges[i] * Math.min(1, Math.abs(sp));
        const y = sp > 0 ? -prog * r : -(1 - prog) * r;
        c.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) skewY(${(i % 2 ? skew : -skew).toFixed(3)}deg)`;
      });
    }, 20);

    // inclinação 3D do bloco sob o cursor
    $$('.tile').forEach((t) => {
      t.addEventListener('pointermove', (e) => {
        const r = t.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        t.style.transform = `perspective(700px) rotateX(${(ny * -10).toFixed(2)}deg) rotateY(${(nx * 12).toFixed(2)}deg) scale(1.03)`;
      });
      t.addEventListener('pointerleave', () => (t.style.transform = ''));
    });

    clients.forEach((c, i) =>
      c.querySelector('button').addEventListener('click', () => {
        ME.scroll.scrollTo(scn.start + ((i + 0.5) / ids.length) * (scn.end - scn.start));
      })
    );
  };

  /* ---------- Lightbox ---------- */
  const lightbox = () => {
    const lb = $('.lightbox');
    const img = $('.lightbox__img');
    const client = $('.lightbox__client');
    const type = $('.lightbox__type');
    const closeBtn = $('.lightbox__close');
    const order = Object.keys(CLIENTS);

    const seen = new Set();
    const items = [];
    $$('.tile').forEach((t) => {
      const im = t.querySelector('img');
      const src = im.getAttribute('src');
      if (!seen.has(src)) {
        seen.add(src);
        items.push({ src, client: t.dataset.client, type: t.dataset.type, alt: im.alt });
      }
    });
    items.sort((a, b) => order.indexOf(a.client) - order.indexOf(b.client));

    let idx = 0;
    let lastFocus = null;
    const fill = (i) => {
      const it = items[i];
      img.src = it.src;
      img.alt = it.alt;
      client.textContent = CLIENTS[it.client];
      type.textContent = it.type;
    };
    const show = (i) => {
      idx = (i + items.length) % items.length;
      img.classList.add('is-swap');
      setTimeout(() => {
        fill(idx);
        img.classList.remove('is-swap');
      }, 280);
    };
    const open = (src) => {
      idx = Math.max(0, items.findIndex((it) => it.src === src));
      fill(idx);
      lastFocus = document.activeElement;
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      ME.scroll.lock();
      setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      ME.scroll.unlock();
      lastFocus && lastFocus.focus({ preventScroll: true });
    };

    $$('.tile').forEach((t) => {
      t.setAttribute('tabindex', '0');
      t.setAttribute('role', 'button');
      t.setAttribute('aria-label', `Ampliar: ${t.querySelector('img').alt}`);
      const go = () => open(t.querySelector('img').getAttribute('src'));
      t.addEventListener('click', go);
      t.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
    });
    $('.lightbox__bg').addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    $('.lightbox__prev').addEventListener('click', () => show(idx - 1));
    $('.lightbox__next').addEventListener('click', () => show(idx + 1));
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  };

  /* =========================================================
     SERVIÇOS — prévia de imagem que segue o cursor
     ========================================================= */
  const services = () => {
    const items = $$('.svc');
    items.forEach((it, i) => it.style.setProperty('--i', i % 3));
    ME.reveal(items, { rootMargin: '0px 0px -8% 0px' });
    if (ME.touch) return;

    const list = $('.svc-list');
    const prev = $('.svc-preview');
    const inner = $('.svc-preview__inner');
    const imgs = {};
    items.forEach((it) => {
      const src = it.dataset.img;
      if (!imgs[src]) {
        const im = new Image();
        im.src = src;
        im.alt = '';
        im.decoding = 'async';
        inner.appendChild(im);
        imgs[src] = im;
      }
    });

    let on = false;
    let x = ME.mouse.x;
    let y = ME.mouse.y;
    let rot = 0;
    list.addEventListener('pointerenter', () => {
      on = true;
      inner.style.setProperty('--ps', 1);
    });
    list.addEventListener('pointerleave', () => {
      on = false;
      inner.style.setProperty('--ps', 0);
    });
    items.forEach((it) =>
      it.addEventListener('pointerenter', () => {
        Object.values(imgs).forEach((im) => im.classList.toggle('is-on', im === imgs[it.dataset.img]));
        inner.appendChild(imgs[it.dataset.img]);
      })
    );
    ME.ticker.add((now, dt) => {
      const k = 1 - Math.pow(1 - 0.12, dt * 60);
      const nx = lerp(x, ME.mouse.x, k);
      const ny = lerp(y, ME.mouse.y, k);
      rot = lerp(rot, clamp((ME.mouse.x - nx) * 0.12, -14, 14), 0.15);
      x = nx;
      y = ny;
      if (!on && inner.style.getPropertyValue('--ps') === '0' && Math.abs(rot) < 0.01) return;
      const w = prev.offsetWidth;
      const h = prev.offsetHeight;
      prev.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0) rotate(${rot}deg)`;
    }, 20);
  };

  /* =========================================================
     TRAJETÓRIA — retrato revelado em mosaico, linha do tempo
     ========================================================= */
  const journey = () => {
    const sec = $('.journey');
    const frame = $('.journey__frame');
    const img = $('.journey__frame img');
    const tl = $('.timeline');
    const line = $('.timeline__line');
    const items = $$('.tl');

    const C = 7;
    const R = 9;
    const mosaic = document.createElement('div');
    mosaic.className = 'mosaic';
    mosaic.style.setProperty('--mc', C);
    mosaic.style.setProperty('--mr', R);
    const rnd = (i) => {
      const v = Math.sin(i * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const cells = [];
    for (let i = 0; i < C * R; i++) {
      const c = document.createElement('i');
      mosaic.appendChild(c);
      const col = i % C;
      const row = Math.floor(i / C);
      // onda diagonal + ruído: cada bloco tem seu próprio momento
      cells.push({ el: c, t: ((col / C) * 0.3 + (1 - row / R) * 0.35 + rnd(i) * 0.35) * 0.72 });
    }
    frame.appendChild(mosaic);

    ME.scene(sec, {
      start: 'top 92%',
      end: MOBILE ? 'top 5%' : 'top 12%',
      onUpdate: (p) => {
        for (const c of cells) {
          const o = clamp((p - c.t) / 0.26);
          c.el.style.opacity = (1 - o).toFixed(3);
          c.el.style.transform = `scale(${(1 - o * 0.6).toFixed(3)}) rotate(${(o * 50).toFixed(1)}deg)`;
        }
        mosaic.style.visibility = p >= 1 ? 'hidden' : '';
      },
    });
    ME.scene(sec, {
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (p) => img.style.setProperty('--jy', `${((0.5 - p) * 90).toFixed(1)}px`),
    });
    ME.scene(tl, {
      start: 'top 75%',
      end: 'bottom 55%',
      onUpdate: (p) => {
        line.style.setProperty('--tl', p.toFixed(4));
        const h = tl.offsetHeight * p;
        items.forEach((it) => it.classList.toggle('is-lit', it.offsetTop + 34 < h));
      },
    });
  };

  /* =========================================================
     PARCERIA — dois cards se encontram e viram uma frase
     ========================================================= */
  const partner = () => {
    const sec = $('.partner');
    const a = $('.partner__card--a');
    const b = $('.partner__card--b');
    const flash = $('.partner__flash');
    const result = $('.partner__result');
    const txt = $('.partner__result-txt');
    const star = $('.partner__result svg');
    const chars = ME.split(txt).chars;
    txt.querySelectorAll('.w').forEach((w) => (w.style.display = 'inline-block'));
    if (MOBILE) {
      // no celular os cards entram pelas laterais (translate/rotate individuais)
      [a, b].forEach((card, i) =>
        ME.scene(card, {
          start: 'top bottom',
          end: 'top 55%',
          onUpdate: (p) => {
            const e = ease.outCubic(p);
            const dir = i ? 1 : -1;
            card.style.translate = `${((1 - e) * 70 * dir).toFixed(2)}vw 0`;
            card.style.rotate = `${((1 - e) * 14 * dir).toFixed(2)}deg`;
          },
        })
      );
      return;
    }

    ME.scene(sec, {
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (p) => {
        const vw = innerWidth;
        const inA = ease.outCubic(map(p, 0, 0.36));
        const inB = ease.outCubic(map(p, 0.06, 0.4));
        const merge = ease.inOutCubic(map(p, 0.44, 0.6));
        const gap = Math.min(vw * 0.21, 270);
        const ax = lerp(lerp(-vw * 0.8, -gap, inA), 0, merge);
        const bx = lerp(lerp(vw * 0.8, gap, inB), 0, merge);
        const ar = lerp(lerp(-24, -5, inA), 0, merge);
        const br = lerp(lerp(24, 5, inB), 0, merge);
        const ry = lerp(55, 0, inA);
        const sc = 1 - merge * 0.4;
        const fade = 1 - map(p, 0.54, 0.62);
        a.style.transform = `perspective(1200px) translate3d(calc(-50% + ${ax}px), calc(-50% + ${(1 - inA) * 18}vh), 0) rotate(${ar}deg) rotateY(${ry}deg) scale(${sc})`;
        b.style.transform = `perspective(1200px) translate3d(calc(-50% + ${bx}px), calc(-50% + ${(1 - inB) * -18}vh), 0) rotate(${br}deg) rotateY(${-lerp(55, 0, inB)}deg) scale(${sc})`;
        a.style.opacity = b.style.opacity = fade.toFixed(3);

        flash.style.setProperty('--fs', (ease.outCubic(map(p, 0.56, 0.78)) * 1.6).toFixed(3));
        flash.style.setProperty('--fo', (map(p, 0.55, 0.6) * (1 - map(p, 0.7, 0.88))).toFixed(3));

        star.style.setProperty('--rs', ease.outBack(map(p, 0.6, 0.7)).toFixed(3));
        const f = map(p, 0.62, 0.9) * (chars.length + 8);
        for (let i = 0; i < chars.length; i++) {
          const o = clamp((f - i) / 8);
          const c = chars[i].style;
          c.opacity = o.toFixed(3);
          c.transform = `perspective(400px) translate3d(0, ${((1 - o) * 0.5).toFixed(3)}em, 0) rotateX(${((1 - o) * -80).toFixed(1)}deg)`;
          c.filter = o >= 1 ? 'none' : `blur(${((1 - o) * 10).toFixed(1)}px)`;
        }
        result.style.transform = `scale(${(0.94 + map(p, 0.6, 1) * 0.06).toFixed(4)})`;
      },
    });
  };

  /* =========================================================
     CONVITE + FOOTER
     ========================================================= */
  const contact = () => {
    const sec = $('.contact');
    const glow = $('.contact__glow');
    const badge = $('.contact__badge svg');
    const portraitImg = $('.contact__portrait img');
    const closing = $('.contact__closing');

    // a seção "abre" das laterais ao entrar
    ME.scene(sec, {
      start: 'top bottom',
      end: 'top 20%',
      onUpdate: (p) => {
        const e = ease.outCubic(p);
        sec.style.setProperty('--cs', `${((1 - e) * (MOBILE ? 3 : 6)).toFixed(2)}%`);
        sec.style.setProperty('--cr', `${((1 - e) * 56).toFixed(1)}px`);
      },
    });
    ME.scene($('.contact__portrait'), {
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (p) => portraitImg.style.setProperty('--cy', `${((0.5 - p) * 70).toFixed(1)}px`),
    });
    ME.scene(closing, {
      start: 'top 88%',
      end: 'bottom 50%',
      onUpdate: (p) => closing.style.setProperty('--cf', ease.inOutCubic(p).toFixed(4)),
    });
    ME.magneticText($('.contact__title'), { radius: 170, strength: 30 });

    let visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
    let angle = 0;
    let gx = innerWidth / 2;
    let gy = innerHeight / 2;
    ME.ticker.add((now, dt) => {
      if (!visible) return;
      angle += dt * (14 + Math.min(Math.abs(ME.scroll.velocity) * 0.06, 220)) * ME.scroll.direction;
      badge.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      if (ME.touch) return;
      const r = sec.getBoundingClientRect();
      const k = 1 - Math.pow(1 - 0.06, dt * 60);
      gx = lerp(gx, ME.mouse.x - r.left, k);
      gy = lerp(gy, ME.mouse.y - r.top, k);
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    }, 20);
  };

  const footer = () => {
    const foot = $('.footer');
    const inner = $('.footer__inner');
    ME.scene(foot, {
      range: () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        return [max - foot.offsetHeight, max];
      },
      onUpdate: (p) => {
        inner.style.transform = `translate3d(0, ${((1 - ease.outCubic(p)) * -22).toFixed(2)}vh, 0)`;
        inner.style.opacity = (0.2 + p * 0.8).toFixed(3);
      },
    });
    ME.magneticText($('.footer__name'), { radius: 220, strength: 24 });
    $('.footer__top-btn').addEventListener('click', () => ME.scroll.scrollTo(0, { duration: 2400 }));
    const year = $('.js-year');
    if (year) year.textContent = new Date().getFullYear();
  };

  /* =========================================================
     BOOT
     ========================================================= */
  const boot = async () => {
    ME.cursor();
    ME.magnetic();
    nav();
    hud();
    hero();
    about();
    marquees();
    diff();
    method();
    results();
    works();
    lightbox();
    services();
    journey();
    partner();
    contact();
    footer();

    ME.refresh();
    await ME.preload();
    ME.refresh();
    document.body.classList.add('is-ready');
    ME.reveal($$('[data-split], [data-reveal]'));
    ME.reveal($$('.eyebrow'), { rootMargin: '0px 0px -5% 0px', onIn: (el) => ME.scramble(el) });

    let t;
    let lastH = document.documentElement.scrollHeight;
    new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h;
      clearTimeout(t);
      t = setTimeout(ME.refresh, 150);
    }).observe(document.body);
    // fontes podem mudar as medidas depois do primeiro cálculo
    if (document.fonts) document.fonts.ready.then(() => ME.refresh());
  };

  window.addEventListener('resize', () => {
    if (ME.mobile() !== MOBILE) location.reload();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
