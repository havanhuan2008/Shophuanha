async function loadOrders() {
  API.requireAuth();
  const tbody = document.getElementById('ordersBody');
  const orders = await API.request('/api/orders/my');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">Bạn chưa có đơn hàng nào.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.productName}</td>
      <td>${order.planName}</td>
      <td>${API.currency(order.price)}</td>
      <td>${API.statusChip(order.status)}</td>
      <td>${new Date(order.createdAt).toLocaleString('vi-VN')}</td>
      <td>${order.deliveredKey ? `<code>${order.deliveredKey}</code>` : '<span class="muted">Admin chưa giao</span>'}</td>
      <td>${order.days || '-'} ngày</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadOrders);
