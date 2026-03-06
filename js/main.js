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
   5. ヒーロー Canvas：パーティクル & ニューロンネットワーク
   ============================================================ */
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, stars, animId;

  const PARTICLE_COUNT = 80;
  const MAX_DIST       = 140;
  const SPEED          = 0.35;

  // Shooting star constants（値の調整ポイント）
  const STAR_COUNT      = 8;      // 同時表示数 → 増やすと賑やか
  const STAR_ANGLE      = 210 * (Math.PI / 180); // 流れる角度（deg）→ 210 = 左下方向
  const STAR_DX         = Math.cos(STAR_ANGLE);  // ≈ -0.866
  const STAR_DY         = Math.sin(STAR_ANGLE);  // ≈  0.500
  const STAR_SPEED_MIN  = 3.5;   // 最低速度（px/frame）→ 遅くすると優雅
  const STAR_SPEED_MAX  = 7.5;   // 最高速度
  const STAR_LENGTH_MIN = 60;    // 最短の尾（px）
  const STAR_LENGTH_MAX = 160;   // 最長の尾
  const STAR_ALPHA_MIN  = 0.30;  // 最低透明度（CSS opacity 0.6 でさらに減衰）
  const STAR_ALPHA_MAX  = 0.65;  // 最高透明度
  const STAR_WIDTH_MIN  = 0.8;   // 最細線幅（px）
  const STAR_WIDTH_MAX  = 1.6;   // 最太線幅

  class Particle {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : (Math.random() < 0.5 ? -5 : H + 5);
      this.vx = (Math.random() - 0.5) * SPEED;
      this.vy = (Math.random() - 0.5) * SPEED;
      this.r  = Math.random() * 1.5 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240, 112, 48, ${this.alpha})`;
      ctx.fill();
    }
  }

  class ShootingStar {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.speed  = STAR_SPEED_MIN + Math.random() * (STAR_SPEED_MAX - STAR_SPEED_MIN);
      this.length = STAR_LENGTH_MIN + Math.random() * (STAR_LENGTH_MAX - STAR_LENGTH_MIN);
      this.alpha  = STAR_ALPHA_MIN + Math.random() * (STAR_ALPHA_MAX - STAR_ALPHA_MIN);
      this.width  = STAR_WIDTH_MIN + Math.random() * (STAR_WIDTH_MAX - STAR_WIDTH_MIN);
      this.vx     = STAR_DX * this.speed;
      this.vy     = STAR_DY * this.speed;

      if (init) {
        // 初期ロード時：画面全体にばらまいて即座に見える状態にする
        this.x = Math.random() * W;
        this.y = Math.random() * H;
      } else {
        // 再スポーン：画面外の上端 or 右端からランダムに入場
        if (Math.random() < 0.5) {
          this.x = Math.random() * (W + this.length);
          this.y = -this.length;
        } else {
          this.x = W + this.length;
          this.y = Math.random() * (H + this.length);
        }
      }
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -this.length || this.y > H + this.length) {
        this.reset(); // 画面外に出たら再スポーン → 常に流れ続ける
      }
    }

    draw() {
      const tx = this.x - STAR_DX * this.length; // 尾の先端 x
      const ty = this.y - STAR_DY * this.length; // 尾の先端 y

      const grad = ctx.createLinearGradient(tx, ty, this.x, this.y);
      grad.addColorStop(0, `rgba(255, 240, 220, 0)`);
      grad.addColorStop(1, `rgba(255, 240, 220, ${this.alpha})`);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = this.width;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(240, 112, 48, ${alpha})`;
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => { s.update(); s.draw(); }); // 流れ星（背面）
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    animId = requestAnimationFrame(loop);
  }

  function init() {
    cancelAnimationFrame(animId);
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    stars     = Array.from({ length: STAR_COUNT },     () => new ShootingStar());
    loop();
  }

  window.addEventListener('resize', debounce(init, 200));
  init();
})();


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
   Utility: デバウンス
   ============================================================ */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
