import { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
