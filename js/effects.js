/* =========================================================
   EFFECTS — preloader · cursor · magnetismo · partículas
   marquee guiado pela velocidade do scroll
   ========================================================= */
(() => {
  'use strict';

  const ME = window.ME;
  const { clamp, lerp, ease } = ME.u;

  /* ---------- Mouse global (posição + suavização) ---------- */
  const mouse = (ME.mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, sx: 0, sy: 0 });
  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.nx = (e.clientX / innerWidth) * 2 - 1;
      mouse.ny = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true }
  );
  ME.ticker.add((now, dt) => {
    const k = 1 - Math.pow(1 - 0.06, dt * 60);
    mouse.sx = lerp(mouse.sx, mouse.nx, k);
    mouse.sy = lerp(mouse.sy, mouse.ny, k);
  }, 5);

  /* ---------- Preloader ----------
     Progresso real do carregamento das imagens + fontes,
     com um mínimo de tempo para a animação respirar. */
  ME.preload = () =>
    new Promise((resolve) => {
      const loader = document.querySelector('.loader');
      const num = loader.querySelector('.loader__num');
      const imgs = Array.from(document.images).filter((img) => img.loading !== 'lazy');
      let loaded = 0;
      const total = imgs.length + 1;
      const done = () => loaded++;
      imgs.forEach((img) => {
        if (img.complete) done();
        else {
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        }
      });
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(done);

      const minTime = ME.reduced ? 200 : 2200;
      const t0 = performance.now();
      let shown = 0;
      const fn = (now) => {
        const real = loaded / total;
        const time = clamp((now - t0) / minTime);
        const target = Math.min(real, ease.inOutCubic(time));
        shown = lerp(shown, target, 0.08);
        if (target >= 1 && shown > 0.995) shown = 1;
        loader.style.setProperty('--p', shown.toFixed(4));
        num.textContent = String(Math.round(shown * 100)).padStart(3, '0');
        if (shown >= 1) {
          ME.ticker.remove(fn);
          setTimeout(() => {
            loader.classList.add('is-done');
            document.documentElement.classList.remove('is-loading');
            resolve();
            setTimeout(() => loader.classList.add('is-gone'), 1500);
          }, 250);
        }
      };
      ME.ticker.add(fn, 15);
    });

  /* ---------- Cursor customizado ---------- */
  ME.cursor = () => {
    if (ME.touch) return;
    document.documentElement.classList.add('has-cursor');
    const el = document.querySelector('.cursor');
    const dot = el.querySelector('.cursor__dot');
    const ring = el.querySelector('.cursor__ring');
    const label = el.querySelector('.cursor__label');
    let rx = mouse.x;
    let ry = mouse.y;
    let lastX = mouse.x;
    let lastY = mouse.y;

    ME.ticker.add((now, dt) => {
      const k = 1 - Math.pow(1 - 0.18, dt * 60);
      rx = lerp(rx, mouse.x, k);
      ry = lerp(ry, mouse.y, k);
      // deformação pela velocidade
      const vx = mouse.x - lastX;
      const vy = mouse.y - lastY;
      lastX = mouse.x;
      lastY = mouse.y;
      const speed = clamp(Math.hypot(vx, vy) / 60, 0, 0.35);
      const angle = Math.atan2(vy, vx);
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${angle}rad) scale(${1 + speed}, ${1 - speed * 0.6})`;
      label.style.transform = `rotate(${-angle}rad)`;
    }, 20);

    const setState = (target) => {
      const view = target && target.closest('[data-cursor="view"], .tile');
      const hover = target && target.closest('a, button, [data-cursor="hover"], .svc');
      el.classList.toggle('is-view', !!view);
      el.classList.toggle('is-hover', !view && !!hover);
      label.textContent = view ? view.dataset.cursorLabel || 'Ver' : '';
    };
    document.addEventListener('pointerover', (e) => setState(e.target));
    document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => el.classList.remove('is-hidden'));
    window.addEventListener('blur', () => el.classList.add('is-hidden'));
    window.addEventListener('focus', () => el.classList.remove('is-hidden'));
  };

  /* ---------- Botões magnéticos ---------- */
  ME.magnetic = () => {
    if (ME.touch) return;
    document.querySelectorAll('.magnetic').forEach((btn) => {
      const inner = btn.querySelector('.magnetic__inner');
      const strength = btn.classList.contains('contact__cta') ? 0.45 : 0.35;
      let tx = 0;
      let ty = 0;
      let x = 0;
      let y = 0;
      let active = false;
      const fn = (now, dt) => {
        const k = 1 - Math.pow(1 - 0.15, dt * 60);
        x = lerp(x, tx, k);
        y = lerp(y, ty, k);
        btn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (inner) inner.style.transform = `translate3d(${x * 0.5}px, ${y * 0.5}px, 0)`;
        if (!active && Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
          btn.style.transform = '';
          if (inner) inner.style.transform = '';
          ME.ticker.remove(fn);
          running = false;
        }
      };
      let running = false;
      const start = () => {
        if (!running) {
          running = true;
          ME.ticker.add(fn, 20);
        }
      };
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        tx = (e.clientX - (r.left + r.width / 2)) * strength;
        ty = (e.clientY - (r.top + r.height / 2)) * strength;
        active = true;
        start();
      });
      btn.addEventListener('pointerleave', () => {
        tx = ty = 0;
        active = false;
        start();
      });
    });
  };

  /* ---------- Poeira dourada (canvas 2D) ---------- */
  ME.dust = (canvas) => {
    if (!canvas || ME.reduced) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let w = 0;
    let h = 0;
    let parts = [];
    let visible = true;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 16000, 30, 110));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.35 + 0.08),
        tw: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.03 + 0.008,
        depth: Math.random() * 0.8 + 0.2,
      }));
    };
    resize();
    window.addEventListener('resize', resize);
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

    ME.ticker.add((now, dt) => {
      if (!visible) return;
      const f = dt * 60;
      ctx.clearRect(0, 0, w, h);
      const r0 = canvas.getBoundingClientRect();
      const mx = mouse.x - r0.left;
      const my = mouse.y - r0.top;
      const vel = ME.scroll ? ME.scroll.velocity : 0;
      for (const p of parts) {
        p.tw += p.ts * f;
        // repulsão do mouse
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22000) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / 148) * 1.4;
          p.x += (dx / d) * force * f;
          p.y += (dy / d) * force * f;
        }
        p.x += (p.vx + mouse.sx * 0.15 * p.depth) * f;
        p.y += (p.vy - vel * 0.0016 * p.depth) * f;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        const a = (0.35 + Math.sin(p.tw) * 0.35) * p.depth + 0.05;
        const rad = p.r * (0.8 + p.depth);
        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 200, 110, ${a})`;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
        ctx.shadowBlur = rad * 6;
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }, 20);
  };

  /* ---------- Marquee com velocidade do scroll + skew ---------- */
  ME.marquee = (row, track = row.querySelector('.marquee__track')) => {
    if (!track) return;
    // duplica o conteúdo até cobrir 2x a largura da tela
    const base = track.innerHTML;
    let guard = 0;
    while (track.scrollWidth < innerWidth * 2.2 && guard++ < 12) track.innerHTML += base;
    track.innerHTML += track.innerHTML;

    const speed = parseFloat(row.dataset.speed) || 60;
    const dir = parseFloat(row.dataset.dir) || 1;
    let x = 0;
    let half = track.scrollWidth / 2;
    let skew = 0;
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '200px' }).observe(row);
    ME.onRefresh(() => (half = track.scrollWidth / 2));

    ME.ticker.add((now, dt) => {
      if (!visible) return;
      const vel = ME.scroll ? ME.scroll.velocity : 0;
      const scrollDir = ME.scroll ? ME.scroll.direction : 1;
      const boost = Math.min(Math.abs(vel) * 0.35, 900);
      x += (speed + boost) * dt * dir * scrollDir;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      skew = lerp(skew, clamp(vel * -0.004, -9, 9), 0.1);
      track.style.transform = `translate3d(${x}px, 0, 0) skewX(${skew}deg)`;
    }, 20);
  };

  /* ---------- Ouro líquido (WebGL, shader próprio) ----------
     fbm com domain warping (duas camadas) gera um "cetim" de veios
     dourados; o mouse age como lente e o hero controla zoom e brilho. */
  ME.goldShader = (canvas) => {
    if (!canvas || ME.reduced) return null;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    } catch (e) {
      gl = null;
    }
    if (!gl) return null;

    const vsrc = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const fsrc = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uZoom;
uniform float uGlow;
uniform float uCalm;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float md = length(p - uMouse);
  p += (p - uMouse) * 0.22 * exp(-md * md * 7.0);
  p /= uZoom;
  float t = uTime * 0.05;
  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.4 + 2.6 * q + vec2(1.7, 9.2) + t * 1.3), fbm(p * 1.4 + 2.6 * q + vec2(8.3, 2.8) - t * 0.9));
  float f = fbm(p * 1.4 + 2.8 * r);
  float silk = sin(f * 10.0 + r.x * 6.0 - t * 4.0);
  float vein = pow(1.0 - abs(silk), 7.0);
  float body = smoothstep(0.25, 0.9, f);
  vec3 ink = vec3(0.028, 0.026, 0.022);
  vec3 gold = vec3(0.80, 0.62, 0.20);
  vec3 pale = vec3(1.0, 0.88, 0.58);
  vec3 col = ink + gold * body * 0.16;
  col += gold * vein * (0.18 + body * 0.55);
  col += pale * pow(vein, 4.0) * body * 0.5;
  float vig = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(1.25, 1.0)));
  col *= mix(0.22, 1.0, vig);
  float calm = smoothstep(0.0, 0.5, length((uv - 0.5) * vec2(1.0, 1.7)));
  col *= mix(1.0, mix(0.45, 1.0, calm), uCalm);
  col += gold * 0.12 * exp(-md * md * 5.0);
  col *= uGlow;
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.014;
  gl_FragColor = vec4(col, 1.0);
}`;
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uRes', 'uTime', 'uMouse', 'uZoom', 'uGlow', 'uCalm'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

    const state = { zoom: 1, glow: 1, calm: 1 };
    const quality = (window.devicePixelRatio > 1 ? 0.85 : 0.65) * (ME.mobile() ? 0.7 : 1);
    const resize = () => {
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * quality));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * quality));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

    let time = Math.random() * 50;
    ME.ticker.add((now, dt) => {
      if (!visible) return;
      const vel = ME.scroll ? Math.abs(ME.scroll.velocity) : 0;
      time += dt * (1 + Math.min(vel / 900, 4));
      const aspect = canvas.width / canvas.height;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, mouse.sx * 0.5 * aspect, -mouse.sy * 0.5);
      gl.uniform1f(U.uZoom, state.zoom);
      gl.uniform1f(U.uGlow, state.glow);
      gl.uniform1f(U.uCalm, state.calm);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }, 20);
    return state;
  };

  /* ---------- Letras magnéticas ----------
     cada letra (.c) foge do cursor; usa as propriedades individuais
     translate/rotate para não brigar com o transform da revelação. */
  ME.magneticText = (el, { radius = 150, strength = 26, active = () => true } = {}) => {
    if (!el || ME.touch || ME.reduced) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const chars = Array.from(el.querySelectorAll('.c'));
    const st = chars.map(() => ({ cx: 0, cy: 0, x: 0, y: 0, r: 0, live: false }));
    ME.onRefresh(() =>
      chars.forEach((c, i) => {
        const o = ME.offsetIn(c, el);
        st[i].cx = o.x + c.offsetWidth / 2;
        st[i].cy = o.y + c.offsetHeight / 2;
      })
    );
    let visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);
    ME.ticker.add((now, dt) => {
      if (!visible) return;
      const on = active();
      const b = el.getBoundingClientRect();
      const mx = mouse.x - b.left;
      const my = mouse.y - b.top;
      const k = 1 - Math.pow(1 - 0.14, dt * 60);
      for (let i = 0; i < chars.length; i++) {
        const s = st[i];
        let tx = 0;
        let ty = 0;
        if (on) {
          const dx = s.cx - mx;
          const dy = s.cy - my;
          const d = Math.hypot(dx, dy) || 1;
          if (d < radius) {
            const f = Math.pow(1 - d / radius, 2) * strength;
            tx = (dx / d) * f;
            ty = (dy / d) * f;
          }
        }
        s.x = lerp(s.x, tx, k);
        s.y = lerp(s.y, ty, k);
        s.r = lerp(s.r, tx * 0.5, k);
        const moving = Math.abs(s.x) > 0.02 || Math.abs(s.y) > 0.02;
        if (moving || s.live) {
          chars[i].style.translate = moving ? `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px` : '';
          chars[i].style.rotate = moving ? `${s.r.toFixed(2)}deg` : '';
          s.live = moving;
        }
      }
    }, 20);
  };

  /* ---------- Contador formatado pt-BR ---------- */
  ME.formatCount = (v, decimals = 0, suffix = '') =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
})();
