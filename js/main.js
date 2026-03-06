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
  let W, H, stars, animId;

  // Shooting star constants（値の調整ポイント）
  const STAR_COUNT           = 10;    // 同時表示数 → 増やすと賑やか
  const STAR_ANGLE           = 30 * (Math.PI / 180); // 流れる角度（deg）→ 30 = 右下方向
  const STAR_DX              = Math.cos(STAR_ANGLE);  // ≈  0.866
  const STAR_DY              = Math.sin(STAR_ANGLE);  // ≈  0.500
  const STAR_SPEED_MIN       = 6;     // 最低速度（px/frame）→ 遅くすると優雅
  const STAR_SPEED_MAX       = 14;    // 最高速度
  const STAR_LENGTH_MIN      = 80;    // 最短の尾（px）
  const STAR_LENGTH_MAX      = 220;   // 最長の尾
  const STAR_ALPHA_MIN       = 0.50;  // 最低透明度
  const STAR_ALPHA_MAX       = 0.90;  // 最高透明度
  const STAR_WIDTH_MIN       = 1.0;   // 最細線幅（px）
  const STAR_WIDTH_MAX       = 2.2;   // 最太線幅
  const STAR_FADE_IN         = 8;     // フェードイン フレーム数（短いほど突然現れる）
  const STAR_FADE_OUT        = 25;    // フェードアウト フレーム数（長いほどゆっくり消える）
  const STAR_LIFE_ACTIVE_MIN = 30;    // 活動フレーム数（最小）
  const STAR_LIFE_ACTIVE_MAX = 80;    // 活動フレーム数（最大）

  class ShootingStar {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.speed   = STAR_SPEED_MIN + Math.random() * (STAR_SPEED_MAX - STAR_SPEED_MIN);
      this.length  = STAR_LENGTH_MIN + Math.random() * (STAR_LENGTH_MAX - STAR_LENGTH_MIN);
      this.alpha   = STAR_ALPHA_MIN + Math.random() * (STAR_ALPHA_MAX - STAR_ALPHA_MIN);
      this.width   = STAR_WIDTH_MIN + Math.random() * (STAR_WIDTH_MAX - STAR_WIDTH_MIN);
      this.vx      = STAR_DX * this.speed;
      this.vy      = STAR_DY * this.speed;
      const active = STAR_LIFE_ACTIVE_MIN + Math.random() * (STAR_LIFE_ACTIVE_MAX - STAR_LIFE_ACTIVE_MIN);
      this.maxLife = STAR_FADE_IN + active + STAR_FADE_OUT;

      if (init) {
        // 初期ロード時：ライフサイクルをランダムにずらして自然に見せる
        this.x   = Math.random() * W;
        this.y   = Math.random() * H;
        this.age = Math.random() * this.maxLife;
      } else {
        // 再スポーン：左端(65%) or 上端(35%)から入場（右下方向へ流れる）
        this.age = 0;
        if (Math.random() < 0.65) {
          this.x = -this.length;
          this.y = Math.random() * H;
        } else {
          this.x = Math.random() * W;
          this.y = -this.length;
        }
      }
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.age++;
      // ライフサイクル終了 or 画面外に出たらリセット
      if (this.age >= this.maxLife || this.x > W + this.length || this.y > H + this.length) {
        this.reset();
      }
    }

    draw() {
      // フェードイン・持続・フェードアウトのライフサイクルで透明度を制御
      let t;
      if (this.age < STAR_FADE_IN) {
        t = this.age / STAR_FADE_IN;                            // 素早く現れる
      } else if (this.age < this.maxLife - STAR_FADE_OUT) {
        t = 1.0;                                                 // 持続
      } else {
        t = (this.maxLife - this.age) / STAR_FADE_OUT;          // ゆっくり消える
      }
      const effectiveAlpha = this.alpha * Math.max(0, t);
      if (effectiveAlpha <= 0.01) return;

      const tx = this.x - STAR_DX * this.length; // 尾の先端 x
      const ty = this.y - STAR_DY * this.length; // 尾の先端 y

      const grad = ctx.createLinearGradient(tx, ty, this.x, this.y);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${effectiveAlpha})`);

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

  function loop() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => { s.update(); s.draw(); });
    animId = requestAnimationFrame(loop);
  }

  function init() {
    cancelAnimationFrame(animId);
    resize();
    stars = Array.from({ length: STAR_COUNT }, () => new ShootingStar());
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
