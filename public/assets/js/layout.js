async function injectLayout() {
  const page = document.body.dataset.page || 'home';
  const settings = await fetch('/api/settings').then((r) => r.json()).catch(() => ({ shopName: 'Thanh Shop Huấn Hà' }));
  document.title = `${settings.shopName} — ${page}`;

  const shell = document.querySelector('.shell');
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="aurora" aria-hidden="true"><div class="ab a"></div><div class="ab b"></div><div class="ab c"></div><div class="ab d"></div></div>
    <div class="fring r1" aria-hidden="true"></div><div class="fring r2" aria-hidden="true"></div><div class="fring r3" aria-hidden="true"></div>
    <canvas id="pcvs" aria-hidden="true"></canvas><div class="scan" aria-hidden="true"></div>
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-top">
        <div>
          <div class="brand-name">${settings.shopName}</div>
          <div class="brand-sub">Menu điều hướng nâng cấp</div>
        </div>
        <button class="sidebar-close" id="sidebarClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="sidebar-card">
        <h3>Thanh Shop Huấn Hà</h3>
        <p>Shop sản phẩm số hợp lệ với phân khu hàng cao cấp, tài nguyên miễn phí, nạp tiền, hồ sơ, đơn hàng và admin quản lý riêng.</p>
      </div>
      <div class="nav-list">
        <a class="nav-link" href="index.html"><span><i class="fa-solid fa-house"></i> Trang chủ</span><i class="fa-solid fa-chevron-right"></i></a>
        <div class="dropdown" data-dropdown>
          <button class="dropdown-toggle" type="button"><span><i class="fa-solid fa-layer-group"></i> Danh mục</span><i class="fa-solid fa-chevron-down"></i></button>
          <div class="dropdown-menu">
            <a class="submenu-link" href="index.html#premium">Hàng cao cấp</a>
            <a class="submenu-link" href="index.html#free">Miễn phí</a>
          </div>
        </div>
        <div class="dropdown" data-dropdown>
          <button class="dropdown-toggle" type="button"><span><i class="fa-solid fa-wallet"></i> Nạp tiền</span><i class="fa-solid fa-chevron-down"></i></button>
          <div class="dropdown-menu">
            <a class="submenu-link" href="topup.html?tab=bank">Nạp Bank</a>
            <a class="submenu-link" href="topup.html?tab=card">Nạp Thẻ</a>
            <a class="submenu-link" href="topup-history.html">Lịch sử nạp tiền</a>
          </div>
        </div>
        <a class="nav-link" href="orders.html"><span><i class="fa-solid fa-bag-shopping"></i> Đơn hàng đã mua</span><i class="fa-solid fa-chevron-right"></i></a>
        <a class="nav-link" href="profile.html"><span><i class="fa-solid fa-user-gear"></i> Hồ sơ / đổi mật khẩu</span><i class="fa-solid fa-chevron-right"></i></a>
        <a class="nav-link" href="login.html"><span><i class="fa-solid fa-right-to-bracket"></i> Đăng nhập</span><i class="fa-solid fa-chevron-right"></i></a>
        <a class="nav-link" href="register.html"><span><i class="fa-solid fa-user-plus"></i> Đăng ký</span><i class="fa-solid fa-chevron-right"></i></a>
        <a class="nav-link" href="admin.html"><span><i class="fa-solid fa-shield-halved"></i> Admin</span><i class="fa-solid fa-chevron-right"></i></a>
      </div>
    </aside>
  `);

  shell.insertAdjacentHTML('afterbegin', `
    <header class="page-header">
      <div class="brand">
        <div class="brand-mark">TS</div>
        <div><div class="brand-name">${settings.shopName}</div><div class="brand-sub">Premium first · Free at bottom</div></div>
      </div>
      <div class="header-right">
        <div class="online-pill">Online</div>
        <div class="balance-pill" id="balancePill">Số dư: ${API.currency(API.user?.balance || 0)}</div>
        <button class="menu-btn" id="menuBtn" aria-label="Mở menu"><i class="fa-solid fa-bars"></i></button>
      </div>
    </header>
  `);

  shell.insertAdjacentHTML('beforeend', `
    <footer class="footer">
      <h3>${settings.shopName}</h3>
      <p>Shop sản phẩm số hợp lệ, có trang riêng cho đăng nhập, đăng ký, đơn hàng, nạp tiền, hồ sơ và admin quản trị.</p>
      <p class="mt-18 muted">© 2026 ${settings.shopName}. All rights reserved.</p>
    </footer>
  `);

  const backdrop = document.getElementById('sidebarBackdrop');
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('sidebarClose');
  const toggleMenu = (force) => {
    const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('show');
    sidebar.classList.toggle('show', open);
    backdrop.classList.toggle('show', open);
  };
  openBtn?.addEventListener('click', () => toggleMenu(true));
  closeBtn?.addEventListener('click', () => toggleMenu(false));
  backdrop?.addEventListener('click', () => toggleMenu(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

  document.querySelectorAll('[data-dropdown]').forEach((dropdown) => {
    dropdown.querySelector('.dropdown-toggle')?.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });
  });

  document.querySelectorAll('.nav-link,.submenu-link').forEach((link) => link.addEventListener('click', () => toggleMenu(false)));

  if (API.user) {
    const balancePill = document.getElementById('balancePill');
    if (balancePill) balancePill.textContent = `Số dư: ${API.currency(API.user.balance || 0)}`;
  }
}

function startParticles() {
  const cvs = document.getElementById('pcvs');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  let W, H, pts = [], mx = null, my = null;
  const cols = ['#2563eb', '#3b82f6', '#60a5fa', '#06b6d4', '#22d3ee', '#4f46e5', '#818cf8'];
  const resize = () => { W = cvs.width = innerWidth; H = cvs.height = innerHeight; init(); };
  class P {
    reset() { this.x = Math.random() * W; this.y = Math.random() * H; this.rad = Math.random() * 1.6 + .3; this.vx = (Math.random() - .5) * .5; this.vy = (Math.random() - .5) * .5; this.a = Math.random() * .55 + .1; this.da = (Math.random() - .5) * .003; this.c = cols[Math.floor(Math.random() * cols.length)]; }
    constructor() { this.reset(); }
    update() {
      if (mx !== null) {
        const dx = this.x - mx, dy = this.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) { const ang = Math.atan2(dy, dx); this.vx += Math.cos(ang) * .022; this.vy += Math.sin(ang) * .022; }
      }
      this.vx *= .995; this.vy *= .995; this.x += this.vx; this.y += this.vy; this.a += this.da;
      if (this.a < .05 || this.a > .7) this.da *= -1;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() { ctx.save(); ctx.globalAlpha = this.a; ctx.shadowBlur = 8; ctx.shadowColor = this.c; ctx.fillStyle = this.c; ctx.beginPath(); ctx.arc(this.x, this.y, this.rad, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  const init = () => { pts = []; const n = Math.min(160, Math.floor(W * H / 7000)); for (let i = 0; i < n; i++) pts.push(new P()); };
  const connect = () => {
    const max = 115;
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < max) { ctx.save(); ctx.globalAlpha = (1 - d / max) * .13; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke(); ctx.restore(); }
    }
  };
  const loop = () => { ctx.clearRect(0, 0, W, H); pts.forEach((p) => { p.update(); p.draw(); }); connect(); requestAnimationFrame(loop); };
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  window.addEventListener('resize', resize);
  resize(); loop();
}

document.addEventListener('DOMContentLoaded', async () => { await injectLayout(); startParticles(); });
