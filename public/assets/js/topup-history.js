async function loadTopupHistory() {
  API.requireAuth();
  const tbody = document.getElementById('topupHistoryBody');
  const topups = await API.request('/api/topups/history');
  if (!topups.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Bạn chưa có lịch sử nạp tiền.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = topups.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.type === 'bank' ? 'Nạp Bank' : 'Nạp Thẻ'}</td>
      <td>${API.currency(item.amount)}</td>
      <td>${item.telco || item.accountName || '-'}</td>
      <td>${API.statusChip(item.status)}</td>
      <td>${new Date(item.createdAt).toLocaleString('vi-VN')}</td>
      <td><pre class="json-helper">${JSON.stringify(item.providerResponse || item.callbackData || {}, null, 2)}</pre></td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadTopupHistory);
