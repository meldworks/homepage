/**
 * main.js — meldworks Inc. コーポレートサイト
 *
 * 機能:
 *  1. ヘッダースクロール検知
 *  2. ハンバーガーメニュー
 *  3. スクロールリビール（Intersection Observer）
 *  4. タブ切り替え（活用シーン）
 *  5. ヒーローEEG波形Canvas（背景）
 *  6. ライブシグナルパネル（波形＋メトリクス）
 *  7. ビジョンセクションCanvas（揺れる粒子）
 *  8. スムーズスクロール（アンカーリンク）
 *  9. スクロールプログレスバー
 * 10. 見出しの1文字ずつリビール
 * 11. カードのスポットライトホバー
 * 12. 流れ星Canvas（全ページ共通・fixed背景）
 */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   Utility: デバウンス
   ============================================================ */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ============================================================
   1. ヘッダー：スクロールでスタイル変更
   ============================================================ */
(function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // 初期実行
})();


/* ============================================================
   2. ハンバーガーメニュー
   ============================================================ */
(function initHamburger() {
  const btn    = document.getElementById('nav-hamburger');
  const mobile = document.getElementById('nav-mobile');
  if (!btn || !mobile) return;

  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('open');
    mobile.classList.toggle('open', isOpen);
    btn.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });

  // モバイルメニュー内リンクをクリックしたら閉じる
  mobile.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      mobile.classList.remove('open');
    });
  });
})();


/* ============================================================
   3. スクロールリビール（Intersection Observer）
   ============================================================ */
(function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  if (REDUCED_MOTION) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // 一度表示したら監視解除
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
})();


/* ============================================================
   4. タブ切り替え（活用シーン）
   ============================================================ */
(function initTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // ボタン状態更新
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // パネル表示切り替え
      tabPanels.forEach(panel => {
        if (panel.id === `tab-${target}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
})();


/* ============================================================
   5. ヒーロー EEG 波形 Canvas（背景）
   複数の脳波トレースがゆっくり流れる
   ============================================================ */
(function initHeroEEG() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || REDUCED_MOTION) return;

  const ctx = canvas.getContext('2d');
  let W, H;

  // 各トレースの定義（色・位置・振幅・速度）
  const TRACES = [
    { y: 0.24, amp: 26, speed: 0.9,  color: 'rgba(255, 122, 69, 0.30)', width: 1.4, seed: 11 },
    { y: 0.40, amp: 18, speed: 0.6,  color: 'rgba(82, 183, 255, 0.20)', width: 1.2, seed: 47 },
    { y: 0.58, amp: 32, speed: 1.15, color: 'rgba(255, 122, 69, 0.15)', width: 1.6, seed: 83 },
    { y: 0.74, amp: 14, speed: 0.45, color: 'rgba(160, 186, 255, 0.13)', width: 1.0, seed: 29 },
    { y: 0.88, amp: 22, speed: 0.75, color: 'rgba(255, 160, 110, 0.10)', width: 1.3, seed: 63 },
  ];

  // 擬似脳波：複数のサイン波＋スパイクの合成
  function eeg(x, t, seed) {
    return (
      Math.sin(x * 0.011 + t + seed) * 0.45 +
      Math.sin(x * 0.023 - t * 1.7 + seed * 2) * 0.3 +
      Math.sin(x * 0.047 + t * 2.3 + seed * 3) * 0.18 +
      Math.sin(x * 0.005 - t * 0.6 + seed) * 0.4 +
      Math.sin(x * 0.09 + t * 4.1 + seed * 5) * 0.07
    );
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let running = true;
  function loop(now) {
    if (!running) return;
    const t = now * 0.001;
    ctx.clearRect(0, 0, W, H);

    TRACES.forEach(tr => {
      ctx.beginPath();
      const step = 6;
      for (let x = -step; x <= W + step; x += step) {
        const y = tr.y * H + eeg(x, t * tr.speed, tr.seed) * tr.amp;
        if (x === -step) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = tr.width;
      ctx.stroke();
    });

    requestAnimationFrame(loop);
  }

  // ヒーローが画面外の間は描画を止める（省電力）
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const wasRunning = running;
      running = e.isIntersecting;
      if (running && !wasRunning) requestAnimationFrame(loop);
    });
  });
  io.observe(canvas);

  window.addEventListener('resize', debounce(resize, 200));
  resize();
  requestAnimationFrame(loop);
})();


/* ============================================================
   6. ライブシグナルパネル（ヒーロー右のガラスカード）
   EEGトレース描画＋FOCUS/CALM/ALERTメトリクスのドリフト
   ============================================================ */
(function initSignalPanel() {
  const canvas = document.getElementById('signal-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;

  const TRACES = [
    { y: 0.28, amp: 16, speed: 1.3,  color: 'rgba(255, 122, 69, 0.9)',  width: 1.5, seed: 7 },
    { y: 0.55, amp: 12, speed: 0.85, color: 'rgba(82, 183, 255, 0.75)', width: 1.2, seed: 31 },
    { y: 0.8,  amp: 8,  speed: 0.6,  color: 'rgba(232, 236, 245, 0.35)', width: 1.0, seed: 53 },
  ];

  function eeg(x, t, seed) {
    return (
      Math.sin(x * 0.05 + t * 2 + seed) * 0.4 +
      Math.sin(x * 0.11 - t * 3.1 + seed * 2) * 0.3 +
      Math.sin(x * 0.023 + t * 1.2 + seed * 3) * 0.35 +
      Math.sin(x * 0.21 + t * 5.4 + seed) * 0.08
    );
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawStatic() {
    // reduced-motion時：静止した1フレームだけ描画
    ctx.clearRect(0, 0, W, H);
    TRACES.forEach(tr => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = tr.y * H + eeg(x, 1, tr.seed) * tr.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = tr.width;
      ctx.stroke();
    });
  }

  window.addEventListener('resize', debounce(() => {
    resize();
    if (REDUCED_MOTION) drawStatic();
  }, 200));
  resize();

  if (REDUCED_MOTION) {
    drawStatic();
    return;
  }

  function loop(now) {
    const t = now * 0.001;
    ctx.clearRect(0, 0, W, H);

    TRACES.forEach(tr => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = tr.y * H + eeg(x, t * tr.speed, tr.seed) * tr.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = tr.width;
      ctx.stroke();
    });

    // 走査線
    const sx = ((t * 60) % (W + 80)) - 40;
    const grad = ctx.createLinearGradient(sx - 40, 0, sx, 0);
    grad.addColorStop(0, 'rgba(255, 122, 69, 0)');
    grad.addColorStop(1, 'rgba(255, 122, 69, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 40, 0, 40, H);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ── メトリクスのゆらぎ ──
  const metrics = document.querySelectorAll('.signal-metric');
  if (!metrics.length) return;

  const state = [];
  metrics.forEach(el => {
    const base = 40 + Math.random() * 40; // 40〜80%
    state.push({
      el,
      value: base,
      target: base,
      valueEl: el.querySelector('.metric-value'),
      fillEl: el.querySelector('.metric-fill'),
    });
  });

  function tick() {
    state.forEach(m => {
      // ときどき目標値を変える
      if (Math.random() < 0.35) {
        m.target = Math.max(18, Math.min(96, m.target + (Math.random() - 0.5) * 26));
      }
      m.value += (m.target - m.value) * 0.4;
      const v = Math.round(m.value);
      if (m.valueEl) m.valueEl.innerHTML = `${v}<em>%</em>`;
      if (m.fillEl) m.fillEl.style.width = `${v}%`;
    });
  }
  tick();
  setInterval(tick, 1100);
})();


/* ============================================================
   7. ビジョン Canvas：揺れる光の粒子
   ============================================================ */
(function initVisionCanvas() {
  const canvas = document.getElementById('vision-canvas');
  if (!canvas || REDUCED_MOTION) return;

  const ctx = canvas.getContext('2d');
  let W, H, dots, animId;

  const DOT_COUNT = 50;
  const COLORS = [
    [255, 122, 69],   // シグナルオレンジ
    [82, 183, 255],   // ニューラルブルー
    [255, 179, 122],  // アンバー
  ];

  class Dot {
    constructor() {
      this.x     = Math.random();
      this.y     = Math.random();
      this.size  = Math.random() * 2 + 0.5;
      this.speed = Math.random() * 0.0005 + 0.0002;
      this.angle = Math.random() * Math.PI * 2;
      this.amp   = Math.random() * 0.04 + 0.01;
      this.ox    = this.x;
      this.oy    = this.y;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.t     = Math.random() * 1000;
      this.rgb   = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    update() {
      this.t++;
      this.x = this.ox + Math.sin(this.t * this.speed * 3) * this.amp;
      this.y = this.oy + Math.cos(this.t * this.speed * 2) * this.amp * 0.5;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x * W, this.y * H, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${this.alpha})`;
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => { d.update(); d.draw(); });
    animId = requestAnimationFrame(loop);
  }

  function init() {
    cancelAnimationFrame(animId);
    resize();
    dots = Array.from({ length: DOT_COUNT }, () => new Dot());
    loop();
  }

  window.addEventListener('resize', debounce(init, 200));
  init();
})();


/* ============================================================
   8. スムーズスクロール（ページ内アンカー）
   ============================================================ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const headerH = document.getElementById('site-header')?.offsetHeight || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    });
  });
})();


/* ============================================================
   9. スクロールプログレスバー（全ページ共通）
   ============================================================ */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);

  let ticking = false;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();


/* ============================================================
   10. 見出しの1文字ずつリビール（.split-chars）
   ============================================================ */
(function initSplitChars() {
  const targets = document.querySelectorAll('.split-chars');
  if (!targets.length || REDUCED_MOTION) return;

  // CJK1文字 / 欧文単語 / 空白 のいずれかにトークン化
  // （欧文は単語単位でまとめないと単語の途中で改行されてしまう）
  const TOKEN_RE = /([　-鿿豈-﫿぀-ヿ！-｠])|(\s+)|([^\s　-鿿豈-﫿぀-ヿ！-｠]+)/g;

  targets.forEach(el => {
    let charIndex = 0;

    function makeChar(ch) {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--char-i', charIndex++);
      span.textContent = ch;
      return span;
    }

    // テキストノードだけを分割し、<br> や .grad などの構造は保持する
    function split(node) {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const m of child.textContent.matchAll(TOKEN_RE)) {
            const [, cjk, space, word] = m;
            if (space) {
              frag.appendChild(document.createTextNode(space));
            } else if (cjk) {
              frag.appendChild(makeChar(cjk));
            } else if (word) {
              const w = document.createElement('span');
              w.className = 'word';
              for (const ch of word) w.appendChild(makeChar(ch));
              frag.appendChild(w);
            }
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          split(child);
        }
      });
    }

    split(el);
  });
})();


/* ============================================================
   11. カードのスポットライトホバー
   （--mx / --my をマウス位置に追従させる）
   ============================================================ */
(function initSpotlight() {
  const selector = '.why-card, .tech-item';
  document.addEventListener('pointermove', e => {
    const card = e.target.closest(selector);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, { passive: true });
})();


/* ============================================================
   12. 流れ星 Canvas（全ページ共通・fixed背景）
   ページ座標で星を管理し、スクロールに合わせて上下に動かす
   ============================================================ */
(function initGlobalShootingStars() {
  if (REDUCED_MOTION) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'global-star-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, stars = [];
  let docH = 0;

  // 1.0 = ページに完全アンカー（スクロールと同期）/ 0.5 = 半分の速度で追従（パララックス）
  const PARALLAX = 1.0;
  const STARS_PER_VIEWPORT = 5;

  class ShootingStar {
    constructor() { this.reset(true); }

    reset(init = false) {
      // 遅めに偏らせて、突出して速い星が出ないようにする
      this.speed   = 0.35 + Math.pow(Math.random(), 1.6) * 0.9; // 0.35 〜 1.25
      this.length  = 30  + Math.random() * 180;
      this.alpha   = 0.30 + Math.random() * 0.55;
      this.width   = 0.4 + Math.random() * 1.8;
      this.fadeIn  = 8   + Math.random() * 24;
      this.fadeOut = 20  + Math.random() * 70;
      const active = 60  + Math.random() * 240;
      this.maxLife = this.fadeIn + active + this.fadeOut;

      const angle = (25 + Math.random() * 15) * (Math.PI / 180);
      this.vx = -Math.cos(angle) * this.speed;   // マイナスで右→左へ
      this.vy = Math.sin(angle) * this.speed;

      this.x = Math.random() * W;
      // y はページ全体の高さに分散（ビューポートに固定しない）
      this.y = Math.random() * docH;
      this.age = init ? Math.random() * this.maxLife : 0;
    }

    update(dt) {
      // dt は「60fps相当のフレーム数」。タブ復帰や120Hz画面でも速度を一定化
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.age += dt;
      if (this.age >= this.maxLife || this.y > docH + this.length || this.x < -this.length) {
        this.reset();
      }
    }

    draw() {
      // ページ座標 → 画面座標(スクロール量を引いて変換)
      const drawY = this.y - window.scrollY * PARALLAX;
      // 画面外はスキップ
      if (drawY < -this.length - 20 || drawY > H + 20) return;

      let t;
      if (this.age < this.fadeIn) {
        t = this.age / this.fadeIn;
      } else if (this.age < this.maxLife - this.fadeOut) {
        t = 1.0;
      } else {
        t = (this.maxLife - this.age) / this.fadeOut;
      }
      const a = this.alpha * Math.max(0, t);
      if (a <= 0.01) return;

      const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const tx = this.x - (this.vx / len) * this.length;
      const ty = drawY - (this.vy / len) * this.length;

      const grad = ctx.createLinearGradient(tx, ty, this.x, drawY);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(1, `rgba(255,255,255,${a})`);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(this.x, drawY);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = this.width;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    docH = Math.max(document.documentElement.scrollHeight, H);

    // ページが長いほど星の数を増やして密度を維持
    const target = Math.max(5, Math.round(STARS_PER_VIEWPORT * docH / H));
    while (stars.length < target) stars.push(new ShootingStar());
    if (stars.length > target) stars.length = target;
  }

  let lastT = 0;
  function loop(now) {
    // dt = 60fps基準のフレーム比。タブ復帰時の暴走を防ぐため最大2フレームで頭打ち
    const elapsed = lastT ? now - lastT : 16.67;
    const dt = Math.min(2, elapsed / 16.67);
    lastT = now;

    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => { s.update(dt); s.draw(); });
    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    lastT = 0;
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', debounce(init, 200));

  // ページの高さ変化（画像読み込み等）にも追従
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(debounce(resize, 200));
    ro.observe(document.body);
  }

  init();
})();
