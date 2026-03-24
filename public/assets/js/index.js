async function loadProducts() {
  const premiumWrap = document.getElementById('premiumProducts');
  const freeWrap = document.getElementById('freeProducts');
  const products = await API.request('/api/products');
  const premium = products.filter((p) => p.category === 'premium');
  const free = products.filter((p) => p.category === 'free');

  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statPremium').textContent = premium.length;
  document.getElementById('statFree').textContent = free.length;
  document.getElementById('statBalance').textContent = API.currency(API.user?.balance || 0);

  premiumWrap.innerHTML = premium.map(renderPremiumCard).join('') || '<div class="empty-state">Chưa có hàng cao cấp.</div>';
  freeWrap.innerHTML = free.map(renderFreeCard).join('') || '<div class="empty-state">Chưa có tài nguyên miễn phí.</div>';

  premiumWrap.querySelectorAll('[data-buy]').forEach((btn) => btn.addEventListener('click', onBuy));
}

function renderPremiumCard(item) {
  const stockPercent = Math.max(6, Math.min(100, Math.round((item.stock / 30) * 100)));
  const planOptions = item.plans.map((plan) => `<option value="${plan.id}">${plan.name} — ${API.currency(plan.price)}</option>`).join('');
  return `
    <article class="card">
      <div class="card-topline"></div>
      <div class="card-image-wrap">
        <img class="card-image" src="${item.image}" alt="${item.title}">
        <div class="card-image-overlay"></div>
        <div class="card-badge">Hàng cao cấp</div>
      </div>
      <div class="card-body">
        <h2 class="card-title">${item.title}</h2>
        <div class="tag-row">
          <span class="tag">Tồn kho: ${item.stock}</span>
          <span class="tag">${item.plans.length} loại key</span>
          <span class="tag">Premium</span>
        </div>
        <p class="card-desc">${item.description}</p>
        <div class="stock-bar"><div class="stock-fill" style="width:${stockPercent}%"></div></div>
        <div class="stock-text">Số lượng hiện có: ${item.stock}</div>
        <div class="price-grid">${item.plans.map((plan) => `<div class="plan-pill"><strong>${plan.name}</strong>${API.currency(plan.price)} · ${plan.days} ngày</div>`).join('')}</div>
        <div class="field"><label>Chọn loại key</label><select data-plan-select="${item.id}">${planOptions}</select></div>
        <button class="btn" data-buy="${item.id}" ${item.stock <= 0 ? 'disabled' : ''}>${item.stock <= 0 ? 'Hết hàng' : '<i class="fa-solid fa-cart-plus"></i> Mua ngay'}</button>
      </div>
    </article>
  `;
}

function renderFreeCard(item) {
  return `
    <article class="card">
      <div class="card-topline"></div>
      <div class="card-image-wrap">
        <img class="card-image" src="${item.image}" alt="${item.title}">
        <div class="card-image-overlay"></div>
        <div class="card-badge">Miễn phí</div>
      </div>
      <div class="card-body">
        <h2 class="card-title">${item.title}</h2>
        <div class="tag-row">
          <span class="tag">Free 100%</span>
          <span class="tag">Tài nguyên</span>
          <span class="tag">Đặt cuối trang</span>
        </div>
        <p class="card-desc">${item.description}</p>
        <a class="btn" href="${item.freeLink || '#'}" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Nhận miễn phí</a>
      </div>
    </article>
  `;
}

async function onBuy(event) {
  API.requireAuth();
  const productId = event.currentTarget.dataset.buy;
  const planId = document.querySelector(`[data-plan-select="${productId}"]`)?.value;
  try {
    const result = await API.request('/api/orders/buy', { method: 'POST', body: JSON.stringify({ productId, planId }) });
    alert(result.message);
    const me = await API.request('/api/auth/me');
    API.setAuth(API.token, me.user);
    window.location.href = 'orders.html';
  } catch (error) {
    alert(error.message);
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);
