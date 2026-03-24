# Thanh Shop Huấn Hà

Bộ source full-stack cho shop sản phẩm số hợp lệ, giữ phong cách giao diện hiệu ứng hiện đại, hỗ trợ:

- Trang chủ, đăng nhập, đăng ký, đơn đã mua, lịch sử nạp, hồ sơ, admin
- Menu 3 gạch trượt từ trái qua phải, có dropdown Danh mục và Nạp tiền
- Danh mục Hàng cao cấp hiển thị trước, Miễn phí hiển thị phía dưới cùng
- Nạp Bank gửi thông báo Telegram cho admin
- Nạp Thẻ gửi sang cổng API thẻ cào qua Partner ID / Partner Key / Callback URL
- Admin quản lý người dùng, sản phẩm, tồn kho, đơn hàng, duyệt nạp tiền
- Telegram command `/deliver ORDER_ID KEY-ABC-123` để giao key cho đơn hàng

## Chạy local

```bash
npm install
cp .env.example .env
npm start
```

Mở: `http://localhost:10000`

## Deploy Render

1. Đẩy project lên GitHub
2. Tạo Web Service trên Render
3. Chọn repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Điền toàn bộ biến môi trường theo `.env.example`

## Telegram bot command

Khi admin nhắn vào bot:

```text
/deliver ORDER-XXXX KEY-7D-ABCDEF
```

Hệ thống sẽ:
- cập nhật đơn hàng thành `delivered`
- gắn key vào đơn
- người dùng xem được key trong `orders.html`

## Callback thẻ cào

Callback URL mặc định:

```text
/card/callback
```

Ví dụ payload JSON:

```json
{
  "requestId": "CARD-123",
  "status": "success",
  "amount": 100000,
  "message": "Nap the thanh cong"
}
```

## Tài khoản admin mặc định

Lấy từ env:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
