/**
 * main.js — meldworks Inc. コーポレートサイト
 *
 * 機能:
 *  1. ヘッダースクロール検知
 *  2. ハンバーガーメニュー
 *  3. スクロールリビール（Intersection Observer）
 *  4. タブ切り替え（活用シーン）
 *  5. ヒーローパーティクルCanvas
 *  6. ビジョンセクションCanvas（ネットワーク粒子）
 *  7. スムーズスクロール（アンカーリンク）
 */

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
   5. ヒーロー Canvas（グローバル流れ星Canvasに統合済み）
   ============================================================ */


/* ============================================================
   6. ビジョン Canvas：揺れる光の粒子
   ============================================================ */
(function initVisionCanvas() {
  const canvas = document.getElementById('vision-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, dots, animId;

  const DOT_COUNT = 50;

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
    }

    update() {
      this.t++;
      this.x = this.ox + Math.sin(this.t * this.speed * 3) * this.amp;
      this.y = this.oy + Math.cos(this.t * this.speed * 2) * this.amp * 0.5;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x * W, this.y * H, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240, 112, 48, ${this.alpha})`;
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
   7. スムーズスクロール（ページ内アンカー）
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
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ============================================================
   流れ星 Canvas（全ページ共通・fixed背景）
   ページ座標で星を管理し、スクロールに合わせて上下に動かす
   ============================================================ */
(function initGlobalShootingStars() {
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
      // ページ座標 → 画面座標（スクロール量を引いて変換）
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
