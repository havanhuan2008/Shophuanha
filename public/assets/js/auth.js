function bindAuth(formId, mode) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const payload = mode === 'register'
        ? { name: data.name, email: data.email, password: data.password }
        : { email: data.email, password: data.password };
      const result = await API.request(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(payload) });
      API.setAuth(result.token, result.user);
      window.location.href = result.user.role === 'admin' ? 'admin.html' : 'index.html';
    } catch (error) {
      alert(error.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindAuth('loginForm', 'login');
  bindAuth('registerForm', 'register');
});
