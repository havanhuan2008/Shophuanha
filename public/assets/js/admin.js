function parsePlans(text) {
  if (!text.trim()) return [];
  return text.split('\n').map((line) => {
    const [name, days, price] = line.split('|').map((part) => part.trim());
    return { id: `PLAN-${Date.now()}-${Math.floor(Math.random()*10000)}`, name, days: Number(days), price: Number(price) };
  }).filter((item) => item.name && item.price >= 0);
}

async function loadAdmin() {
  API.requireAuth();
  API.requireAdmin();
  await Promise.all([loadDashboard(), loadUsers(), loadProducts(), loadOrders(), loadTopups()]);
  bindProductForm();
  initTabs();
}

async function loadDashboard() {
  const stats = await API.request('/api/admin/dashboard');
  document.getElementById('dashUsers').textContent = stats.totalUsers;
  document.getElementById('dashProducts').textContent = stats.totalProducts;
  document.getElementById('dashOrders').textContent = stats.totalOrders;
  document.getElementById('dashRevenue').textContent = API.currency(stats.revenue);
}

async function loadUsers() {
  const users = await API.request('/api/admin/users');
  document.getElementById('usersBody').innerHTML = users.map((u) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${API.currency(u.balance)}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.telegram || '-'}</td>
    </tr>
  `).join('');
}

async function loadProducts() {
  const products = await API.request('/api/admin/products');
  document.getElementById('productsBody').innerHTML = products.map((p) => `
    <tr>
      <td>${p.title}</td>
      <td>${p.category}</td>
      <td>${p.stock}</td>
      <td>${(p.plans || []).map((plan) => `${plan.name} / ${API.currency(plan.price)}`).join('<br>') || '-'}</td>
      <td>${p.active !== false ? API.statusChip('approved') : API.statusChip('rejected')}</td>
      <td>
        <div class="inline-actions">
          <button class="ghost-btn" data-edit-id="${p.id}">Sửa</button>
          <button class="danger-btn" data-delete-id="${p.id}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
  document.querySelectorAll('[data-edit-id]').forEach((button) => button.addEventListener('click', () => {
    const product = products.find((item) => item.id === button.dataset.editId);
    if (product) editProduct(product);
  }));
  document.querySelectorAll('[data-delete-id]').forEach((button) => button.addEventListener('click', () => removeProduct(button.dataset.deleteId)));
}

async function loadOrders() {
  const orders = await API.request('/api/admin/orders');
  document.getElementById('ordersAdminBody').innerHTML = orders.map((o) => `
    <tr>
      <td>${o.id}</td>
      <td>${o.userName}<br><span class="muted">${o.userEmail}</span></td>
      <td>${o.productName}</td>
      <td>${o.planName}</td>
      <td>${API.currency(o.price)}</td>
      <td>${API.statusChip(o.status)}</td>
      <td>${o.deliveredKey ? `<code>${o.deliveredKey}</code>` : `<button class="ghost-btn" data-deliver-id="${o.id}">Giao key</button>`}</td>
    </tr>
  `).join('');
  document.querySelectorAll('[data-deliver-id]').forEach((button) => button.addEventListener('click', () => deliverOrderPrompt(button.dataset.deliverId)));
}

async function loadTopups() {
  const topups = await API.request('/api/admin/topups');
  document.getElementById('topupsAdminBody').innerHTML = topups.map((t) => `
    <tr>
      <td>${t.id}</td>
      <td>${t.type}</td>
      <td>${t.userId}</td>
      <td>${API.currency(t.amount)}</td>
      <td>${API.statusChip(t.status)}</td>
      <td>${new Date(t.createdAt).toLocaleString('vi-VN')}</td>
      <td>
        <div class="inline-actions">
          <button class="ghost-btn" data-topup-id="${t.id}" data-topup-status="approved">Duyệt</button>
          <button class="danger-btn" data-topup-id="${t.id}" data-topup-status="rejected">Từ chối</button>
        </div>
      </td>
    </tr>
  `).join('');
  document.querySelectorAll('[data-topup-id]').forEach((button) => button.addEventListener('click', () => updateTopup(button.dataset.topupId, button.dataset.topupStatus)));
}

function bindProductForm() {
  const form = document.getElementById('productForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      title: data.title,
      category: data.category,
      image: data.image,
      description: data.description,
      stock: Number(data.stock),
      active: data.active === 'true',
      freeLink: data.freeLink,
      plans: data.category === 'premium' ? parsePlans(data.plans || '') : []
    };
    try {
      if (data.id) {
        await API.request(`/api/admin/products/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await API.request('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      form.reset();
      document.getElementById('productId').value = '';
      await loadProducts();
      alert('Đã lưu sản phẩm.');
    } catch (error) {
      alert(error.message);
    }
  });
}

function editProduct(product) {
  document.getElementById('productId').value = product.id || '';
  document.getElementById('productTitle').value = product.title || '';
  document.getElementById('productCategory').value = product.category || 'premium';
  document.getElementById('productImage').value = product.image || '';
  document.getElementById('productStock').value = product.stock || 0;
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productFreeLink').value = product.freeLink || '';
  document.getElementById('productActive').value = String(product.active !== false);
  document.getElementById('productPlans').value = (product.plans || []).map((plan) => `${plan.name}|${plan.days}|${plan.price}`).join('\n');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function removeProduct(id) {
  if (!confirm('Xóa sản phẩm này?')) return;
  await API.request(`/api/admin/products/${id}`, { method: 'DELETE' });
  await loadProducts();
};

async function deliverOrderPrompt(id) {
  const deliveredKey = prompt('Nhập key để giao cho đơn hàng:');
  if (!deliveredKey) return;
  await API.request(`/api/admin/orders/${id}/deliver`, { method: 'PATCH', body: JSON.stringify({ deliveredKey }) });
  await loadOrders();
};

async function updateTopup(id, status) {
  await API.request(`/api/admin/topups/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  await loadTopups();
  await loadUsers();
};

function initTabs() {
  document.querySelectorAll('[data-tab-btn]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tabBtn;
      document.querySelectorAll('[data-tab-btn]').forEach((btn) => btn.classList.remove('active'));
      document.querySelectorAll('[data-tab-panel]').forEach((panel) => panel.classList.remove('active'));
      button.classList.add('active');
      document.querySelector(`[data-tab-panel="${tab}"]`)?.classList.add('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', loadAdmin);
