async function loadTopupPage() {
  API.requireAuth();
  const settings = await API.request('/api/settings');
  document.getElementById('bankInfo').innerHTML = `
    <div class="notice">
      <strong>Ngân hàng:</strong> ${settings.bank.bankName}<br>
      <strong>Số tài khoản:</strong> ${settings.bank.accountNumber}<br>
      <strong>Tên tài khoản:</strong> ${settings.bank.accountName}
    </div>
    ${settings.bank.qrImage ? `<div class="mt-18 center"><img src="${settings.bank.qrImage}" alt="QR" style="max-width:260px;width:100%;border-radius:18px;border:1px solid var(--border)"></div>` : ''}
  `;

  document.getElementById('bankForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const result = await API.request('/api/topup/bank', { method: 'POST', body: JSON.stringify(data) });
      alert(result.message);
      e.target.reset();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('cardForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const result = await API.request('/api/topup/card', { method: 'POST', body: JSON.stringify(data) });
      alert(result.message);
      e.target.reset();
    } catch (error) {
      alert(error.message);
    }
  });

  const params = new URLSearchParams(window.location.search);
  const targetTab = params.get('tab');
  if (targetTab) document.querySelector(`[data-tab-btn="${targetTab}"]`)?.click();
}

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

document.addEventListener('DOMContentLoaded', () => { initTabs(); loadTopupPage(); });
