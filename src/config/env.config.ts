export const config = {
  storage: {
    maxSize: 524288000, // 500MB
    allowedTypes: ['image/', 'video/'],
    bucket: process.env.CLOUDFLARE_R2_BUCKET || 'video-storage'
  },
  api: {
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST']
    },
  },
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || ''
    },
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || ''
  },
  database: {
    url: process.env.DATABASE_URL || ''
  }
};

// In ra log để kiểm tra các biến môi trường
console.log('Cloudflare R2 config:', {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ? 'Đã thiết lập' : 'Chưa thiết lập',
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID ? 'Đã thiết lập' : 'Chưa thiết lập',
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY ? 'Đã thiết lập' : 'Chưa thiết lập',
  bucket: process.env.CLOUDFLARE_R2_BUCKET ? 'Đã thiết lập' : 'Chưa thiết lập',
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ? 'Đã thiết lập' : 'Chưa thiết lập'
});
