const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const TOKEN_TTL_HOURS = Number(process.env.TOKEN_TTL_HOURS || 168);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], sessions: [], products: [], orders: [], topups: [], settings: { shopName: process.env.SHOP_NAME || 'Thanh Shop Huấn Hà' } }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance || 0,
    phone: user.phone || '',
    telegram: user.telegram || '',
    createdAt: user.createdAt
  };
}

function seedAdmin() {
  const db = readDb();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  let admin = db.users.find((u) => u.email.toLowerCase() === adminEmail.toLowerCase());
  if (!admin) {
    admin = {
      id: crypto.randomUUID(),
      name: 'Admin Tổng',
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: 'admin',
      balance: 0,
      phone: '',
      telegram: '',
      createdAt: nowIso()
    };
    db.users.push(admin);
    writeDb(db);
  }
}

function createSession(userId) {
  const db = readDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000;
  db.sessions.push({ token, userId, expiresAt });
  writeDb(db);
  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  const db = readDb();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  if (!session) return null;
  return db.users.find((u) => u.id === session.userId) || null;
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  }
  req.user = user;
  req.token = token;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
  }
  next();
}

async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) return { ok: false, skipped: true };
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    return await response.json();
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function publicProduct(product) {
  return {
    id: product.id,
    title: product.title,
    category: product.category,
    image: product.image,
    description: product.description,
    stock: product.stock,
    plans: product.plans || [],
    freeLink: product.freeLink || '',
    active: product.active !== false,
    createdAt: product.createdAt
  };
}

seedAdmin();

app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json({
    shopName: db.settings?.shopName || process.env.SHOP_NAME || 'Thanh Shop Huấn Hà',
    bank: {
      accountName: process.env.BANK_ACCOUNT_NAME || 'Chưa cấu hình',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'Chưa cấu hình',
      bankName: process.env.BANK_BANK_NAME || 'Chưa cấu hình',
      qrImage: process.env.BANK_QR_IMAGE || ''
    }
  });
});

app.get('/api/products', (req, res) => {
  const db = readDb();
  const products = db.products.filter((p) => p.active !== false).map(publicProduct);
  res.json(products);
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Thiếu thông tin đăng ký.' });
  const db = readDb();
  const exists = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(400).json({ message: 'Email đã tồn tại.' });
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: hashPassword(password),
    role: 'user',
    balance: 0,
    phone: '',
    telegram: '',
    createdAt: nowIso()
  };
  db.users.push(user);
  writeDb(db);
  const token = createSession(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(400).json({ message: 'Sai email hoặc mật khẩu.' });
  }
  const token = createSession(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.post('/api/auth/logout', auth, (req, res) => {
  const db = readDb();
  db.sessions = db.sessions.filter((s) => s.token !== req.token);
  writeDb(db);
  res.json({ ok: true });
});

app.put('/api/profile', auth, (req, res) => {
  const { name, phone, telegram } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  user.name = name || user.name;
  user.phone = phone || '';
  user.telegram = telegram || '';
  writeDb(db);
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Thiếu mật khẩu.' });
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại chưa đúng.' });
  }
  user.passwordHash = hashPassword(newPassword);
  writeDb(db);
  res.json({ message: 'Đổi mật khẩu thành công.' });
});

app.get('/api/orders/my', auth, (req, res) => {
  const db = readDb();
  const orders = db.orders
    .filter((o) => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

app.post('/api/orders/buy', auth, async (req, res) => {
  const { productId, planId } = req.body;
  const db = readDb();
  const product = db.products.find((p) => p.id === productId && p.active !== false);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  if (product.category !== 'premium') return res.status(400).json({ message: 'Sản phẩm này không yêu cầu thanh toán.' });
  if ((product.stock || 0) <= 0) return res.status(400).json({ message: 'Sản phẩm đã hết hàng.' });

  const plan = (product.plans || []).find((p) => p.id === planId) || product.plans?.[0];
  if (!plan) return res.status(400).json({ message: 'Bạn cần chọn gói key.' });

  const user = db.users.find((u) => u.id === req.user.id);
  if ((user.balance || 0) < plan.price) {
    return res.status(400).json({ message: 'Số dư không đủ. Vui lòng nạp thêm.' });
  }

  user.balance -= plan.price;
  product.stock -= 1;
  const order = {
    id: `ORDER-${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    productId: product.id,
    productName: product.title,
    planId: plan.id,
    planName: plan.name,
    days: plan.days,
    price: plan.price,
    status: 'pending-delivery',
    deliveredKey: '',
    createdAt: nowIso()
  };
  db.orders.push(order);
  writeDb(db);

  await sendTelegramMessage(
    `<b>Đơn hàng mới</b>\n` +
    `Mã đơn: <code>${order.id}</code>\n` +
    `Khách: ${user.name} - ${user.email}\n` +
    `Sản phẩm: ${product.title}\n` +
    `Gói: ${plan.name}\n` +
    `Giá: ${plan.price.toLocaleString('vi-VN')}đ\n\n` +
    `Dùng lệnh: <code>/deliver ${order.id} KEY-CUA-BAN</code>`
  );

  res.json({ message: 'Đã tạo đơn hàng, admin sẽ giao key sớm nhất.', order });
});

app.get('/api/topups/history', auth, (req, res) => {
  const db = readDb();
  const topups = db.topups
    .filter((t) => t.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(topups);
});

app.post('/api/topup/bank', auth, async (req, res) => {
  const { amount, accountName, content } = req.body;
  if (!amount || Number(amount) <= 0 || !accountName) {
    return res.status(400).json({ message: 'Thiếu thông tin nạp bank.' });
  }
  const db = readDb();
  const topup = {
    id: `BANK-${Date.now()}`,
    userId: req.user.id,
    type: 'bank',
    amount: Number(amount),
    accountName,
    content: content || '',
    status: 'pending',
    createdAt: nowIso(),
    providerResponse: null
  };
  db.topups.push(topup);
  writeDb(db);

  await sendTelegramMessage(
    `<b>Yêu cầu nạp Bank</b>\n` +
    `Mã: <code>${topup.id}</code>\n` +
    `Khách: ${req.user.name} - ${req.user.email}\n` +
    `Số tiền: ${topup.amount.toLocaleString('vi-VN')}đ\n` +
    `Tên tài khoản gửi: ${accountName}\n` +
    `Nội dung: ${content || '(không có)'}\n\n` +
    `Vào admin để duyệt cộng tiền.`
  );

  res.json({ message: 'Đã gửi yêu cầu nạp bank tới admin.', topup });
});

app.post('/api/topup/card', auth, async (req, res) => {
  const { telco, amount, serial, pin } = req.body;
  if (!telco || !amount || !serial || !pin) {
    return res.status(400).json({ message: 'Thiếu thông tin nạp thẻ.' });
  }
  const db = readDb();
  const topup = {
    id: `CARD-${Date.now()}`,
    userId: req.user.id,
    type: 'card',
    telco,
    amount: Number(amount),
    serial,
    pin,
    status: 'submitted',
    createdAt: nowIso(),
    providerResponse: null
  };
  db.topups.push(topup);
  writeDb(db);

  const payload = {
    requestId: topup.id,
    telco,
    amount: Number(amount),
    serial,
    code: pin,
    partner_id: process.env.CARD_PARTNER_ID || '',
    partner_key: process.env.CARD_PARTNER_KEY || '',
    callback_url: process.env.CARD_CALLBACK_URL || `${APP_URL}/card/callback`
  };

  let providerResponse = { queued: true, message: 'Chưa cấu hình CARD_API_URL, đơn đã được lưu chờ xử lý.' };
  if (process.env.CARD_API_URL) {
    try {
      const response = await fetch(process.env.CARD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      providerResponse = await response.json();
    } catch (error) {
      providerResponse = { error: error.message };
    }
  }

  const db2 = readDb();
  const saved = db2.topups.find((t) => t.id === topup.id);
  if (saved) saved.providerResponse = providerResponse;
  writeDb(db2);

  await sendTelegramMessage(
    `<b>Nạp thẻ mới</b>\n` +
    `Mã: <code>${topup.id}</code>\n` +
    `Khách: ${req.user.name} - ${req.user.email}\n` +
    `Nhà mạng: ${telco}\n` +
    `Mệnh giá: ${Number(amount).toLocaleString('vi-VN')}đ\n` +
    `Trạng thái: ${saved?.status || 'submitted'}`
  );

  res.json({ message: 'Đã gửi thẻ tới cổng xử lý.', topup: saved || topup, providerResponse });
});

app.post('/card/callback', async (req, res) => {
  const secretFromProvider = req.headers['x-partner-key'];
  if (process.env.CARD_PARTNER_KEY && secretFromProvider && secretFromProvider !== process.env.CARD_PARTNER_KEY) {
    return res.status(403).json({ message: 'Sai partner key.' });
  }

  const { requestId, status, amount, message } = req.body;
  const db = readDb();
  const topup = db.topups.find((t) => t.id === requestId);
  if (!topup) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });

  topup.status = status || topup.status;
  topup.callbackData = req.body;
  if ((status === 'success' || status === 'approved') && !topup.credited) {
    const user = db.users.find((u) => u.id === topup.userId);
    if (user) user.balance = (user.balance || 0) + Number(amount || topup.amount || 0);
    topup.credited = true;
  }
  writeDb(db);

  await sendTelegramMessage(
    `<b>Callback thẻ cào</b>\n` +
    `Mã: <code>${requestId}</code>\n` +
    `Trạng thái: ${status}\n` +
    `Số tiền: ${Number(amount || topup.amount || 0).toLocaleString('vi-VN')}đ\n` +
    `Ghi chú: ${message || '(không có)'}`
  );

  res.json({ ok: true });
});

app.post('/telegram/webhook/:secret', async (req, res) => {
  if ((process.env.TELEGRAM_WEBHOOK_SECRET || '') !== req.params.secret) {
    return res.status(403).json({ message: 'Invalid secret' });
  }
  const update = req.body || {};
  const msg = update.message || {};
  const text = String(msg.text || '').trim();
  const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '');
  if (!text || String(msg.chat?.id || '') !== adminChatId) {
    return res.json({ ok: true, ignored: true });
  }

  if (text.startsWith('/deliver ')) {
    const parts = text.split(' ');
    const orderId = parts[1];
    const deliveredKey = parts.slice(2).join(' ').trim();
    const db = readDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (!order || !deliveredKey) {
      await sendTelegramMessage(`Không giao được. Cú pháp đúng: /deliver ORDER_ID KEY-DATA`);
      return res.json({ ok: true });
    }
    order.status = 'delivered';
    order.deliveredKey = deliveredKey;
    order.deliveredAt = nowIso();
    writeDb(db);
    await sendTelegramMessage(`<b>Đã giao key</b>\nMã đơn: <code>${order.id}</code>\nKey: <code>${deliveredKey}</code>`);
  }
  res.json({ ok: true });
});

app.get('/api/admin/dashboard', auth, adminOnly, (req, res) => {
  const db = readDb();
  const totalUsers = db.users.filter((u) => u.role !== 'admin').length;
  const totalProducts = db.products.length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((o) => o.status === 'pending-delivery').length;
  const pendingTopups = db.topups.filter((t) => ['pending', 'submitted'].includes(t.status)).length;
  const revenue = db.orders.reduce((sum, item) => sum + Number(item.price || 0), 0);
  res.json({ totalUsers, totalProducts, totalOrders, pendingOrders, pendingTopups, revenue });
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const db = readDb();
  res.json(db.users.map(sanitizeUser));
});

app.get('/api/admin/products', auth, adminOnly, (req, res) => {
  const db = readDb();
  res.json(db.products);
});

app.post('/api/admin/products', auth, adminOnly, (req, res) => {
  const { title, category, image, description, stock, plans, freeLink, active } = req.body;
  const db = readDb();
  const product = {
    id: `PROD-${Date.now()}`,
    title,
    category,
    image,
    description,
    stock: Number(stock || 0),
    plans: Array.isArray(plans) ? plans : [],
    freeLink: freeLink || '',
    active: active !== false,
    createdAt: nowIso()
  };
  db.products.push(product);
  writeDb(db);
  res.json(product);
});

app.put('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  Object.assign(product, {
    title: req.body.title,
    category: req.body.category,
    image: req.body.image,
    description: req.body.description,
    stock: Number(req.body.stock || 0),
    plans: Array.isArray(req.body.plans) ? req.body.plans : [],
    freeLink: req.body.freeLink || '',
    active: req.body.active !== false
  });
  writeDb(db);
  res.json(product);
});

app.delete('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
  const db = readDb();
  res.json(db.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.patch('/api/admin/orders/:id/deliver', auth, adminOnly, async (req, res) => {
  const { deliveredKey } = req.body;
  const db = readDb();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  order.deliveredKey = deliveredKey;
  order.status = 'delivered';
  order.deliveredAt = nowIso();
  writeDb(db);
  await sendTelegramMessage(`<b>Admin giao key thủ công</b>\nMã đơn: <code>${order.id}</code>\nKey: <code>${deliveredKey}</code>`);
  res.json(order);
});

app.get('/api/admin/topups', auth, adminOnly, (req, res) => {
  const db = readDb();
  res.json(db.topups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.patch('/api/admin/topups/:id', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  const db = readDb();
  const topup = db.topups.find((t) => t.id === req.params.id);
  if (!topup) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
  topup.status = status;
  if (status === 'approved' && !topup.credited) {
    const user = db.users.find((u) => u.id === topup.userId);
    if (user) user.balance = (user.balance || 0) + Number(topup.amount || 0);
    topup.credited = true;
  }
  writeDb(db);
  await sendTelegramMessage(`<b>Cập nhật nạp tiền</b>\nMã: <code>${topup.id}</code>\nTrạng thái: ${status}`);
  res.json(topup);
});

app.get('*', (req, res) => {
  const safePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    return res.sendFile(safePath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Thanh Shop Huan Ha running at ${APP_URL}`);
});
