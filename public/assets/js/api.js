const API = {
  token: localStorage.getItem('thanhshop_token') || '',
  user: JSON.parse(localStorage.getItem('thanhshop_user') || 'null'),
  setAuth(token, user) {
    this.token = token || '';
    this.user = user || null;
    if (token) localStorage.setItem('thanhshop_token', token);
    else localStorage.removeItem('thanhshop_token');
    if (user) localStorage.setItem('thanhshop_user', JSON.stringify(user));
    else localStorage.removeItem('thanhshop_user');
  },
  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra.');
    return data;
  },
  currency(value) {
    return Number(value || 0).toLocaleString('vi-VN') + 'đ';
  },
  statusChip(status) {
    const map = {
      'pending': ['pending', 'Chờ duyệt'],
      'submitted': ['info', 'Đã gửi'],
      'approved': ['success', 'Đã duyệt'],
      'success': ['success', 'Thành công'],
      'pending-delivery': ['pending', 'Chờ giao key'],
      'delivered': ['success', 'Đã giao'],
      'rejected': ['danger', 'Từ chối']
    };
    const [cls, label] = map[status] || ['info', status || 'N/A'];
    return `<span class="chip ${cls}">${label}</span>`;
  },
  requireAuth(redirect = 'login.html') {
    if (!this.token) window.location.href = redirect;
  },
  requireAdmin() {
    if (!this.user || this.user.role !== 'admin') window.location.href = 'login.html';
  }
};
window.API = API;
