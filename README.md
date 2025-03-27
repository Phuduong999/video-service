# Video Upload Service

## Prerequisites

- Node.js 16 or higher
- npm
- PostgreSQL database

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment variables file:

```bash
cp .env.example .env
```

4. Update `.env` with your configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_ACCESS_KEY_ID`: R2 access key
- `CLOUDFLARE_SECRET_ACCESS_KEY`: R2 secret key
- `CLOUDFLARE_R2_BUCKET`: R2 bucket name
- `API_KEY`: Secret key for API authentication

5. Setup the database:

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Running Locally

Start the development server:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Testing API Endpoints

### Authentication

All API requests require the `X-API-Key` header with your API key.

### Available Endpoints

1. Get Presigned Upload URL

```bash
curl -X POST http://localhost:3000/api/upload/presigned-url \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.mp4","fileType":"video/mp4"}'
```

2. List Uploaded Files

```bash
curl http://localhost:3000/api/uploads \
  -H "X-API-Key: your-api-key"
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations

## Hướng dẫn triển khai lên Cloudflare Workers

### Chuẩn bị

1. Đảm bảo bạn đã có tài khoản Cloudflare và đã tạo R2 bucket
2. Cài đặt Wrangler CLI (nếu chưa có):
   ```bash
   npm install -g wrangler
   ```
3. Đăng nhập vào Cloudflare thông qua Wrangler:
   ```bash
   wrangler login
   ```

### Cấu hình môi trường

1. Cập nhật file `.env` với các thông tin Cloudflare R2:
   ```
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ACCESS_KEY_ID=your_access_key_id
   CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_access_key
   CLOUDFLARE_R2_BUCKET=your_bucket_name
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-your_bucket_name.r2.dev
   DATABASE_URL=your_database_url
   ```

2. Thêm các biến môi trường bảo mật vào Cloudflare Workers:
   ```bash
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   wrangler secret put CLOUDFLARE_ACCESS_KEY_ID
   wrangler secret put CLOUDFLARE_SECRET_ACCESS_KEY
   wrangler secret put DATABASE_URL
   ```

### Xây dựng và triển khai

1. Xây dựng ứng dụng:
   ```bash
   npm run build
   ```

2. Triển khai lên Cloudflare Workers:
   ```bash
   npm run deploy
   ```

### Kiểm tra triển khai

Sau khi triển khai thành công, bạn sẽ nhận được URL của Worker, ví dụ:
```
https://video-upload-system.your-username.workers.dev
```

### Sử dụng API

1. **Upload video**:
   ```
   POST https://video-upload-system.your-username.workers.dev/api/upload
   ```
   Gửi file video trong form-data với key là `file`

2. **Lấy thông tin video**:
   ```
   GET https://video-upload-system.your-username.workers.dev/api/videos/:id
   ```

3. **Lấy danh sách video**:
   ```
   GET https://video-upload-system.your-username.workers.dev/api/videos
   ```

### Xử lý lỗi phổ biến

1. **Lỗi kết nối R2**: Kiểm tra lại các biến môi trường CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY
2. **Lỗi kết nối database**: Kiểm tra DATABASE_URL và đảm bảo database có thể truy cập từ Cloudflare Workers
3. **Lỗi về kích thước file**: Cloudflare Workers có giới hạn về kích thước request, đảm bảo file upload không vượt quá 100MB

### Giới hạn của Cloudflare Workers

- CPU time: 50ms trên free plan, 30s trên paid plan
- Kích thước request: tối đa 100MB
- Kích thước response: tối đa 10MB trên free plan
- Bộ nhớ: 128MB trên free plan, 1GB trên paid plan
