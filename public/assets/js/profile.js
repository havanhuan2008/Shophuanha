async function loadProfile() {
  API.requireAuth();
  const me = await API.request('/api/auth/me');
  API.setAuth(API.token, me.user);
  document.getElementById('profileName').value = me.user.name || '';
  document.getElementById('profileEmail').value = me.user.email || '';
  document.getElementById('profilePhone').value = me.user.phone || '';
  document.getElementById('profileTelegram').value = me.user.telegram || '';

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const result = await API.request('/api/profile', { method: 'PUT', body: JSON.stringify(data) });
      API.setAuth(API.token, result.user);
      alert('Đã cập nhật hồ sơ.');
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const result = await API.request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) });
      alert(result.message);
      e.target.reset();
    } catch (error) {
      alert(error.message);
    }
  });
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

document.addEventListener('DOMContentLoaded', () => { initTabs(); loadProfile(); });
