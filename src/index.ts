import 'dotenv/config'; 
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setupRoutes } from './modules/api/routes';
import { config } from './config/env.config';

const app = new Hono({
  strict: false
});

// Cấu hình CORS
app.use('/*', cors(config.api.cors));

setupRoutes(app);

// Kiểm tra môi trường
const isCloudflareWorker = typeof (globalThis as any).Bindings !== 'undefined';

if (!isCloudflareWorker) {
  // Chạy trên Node.js server khi phát triển
  import('@hono/node-server').then(({ serve }) => {
    const port = Number(process.env.PORT) || 3000;
    console.log(`Server is running on http://localhost:${port}`);
    
    const server = serve({
      fetch: app.fetch,
      port
    });
    
    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
  });
}

// Export fetch handler cho Cloudflare Workers
export default {
  fetch: app.fetch
};
