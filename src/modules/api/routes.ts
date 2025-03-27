import { Hono } from 'hono';
import { UploadController } from '../upload/upload.controller';
import { VideoController } from '../video/video.controller';
import { R2Service } from '../storage/r2.service';
import { PrismaService } from '../database/prisma.service';
import { authMiddleware } from '../../middleware/auth';
import { fileUploadMiddleware } from '../../middleware/file-upload';

export function setupRoutes(app: Hono) {
  const r2Service = new R2Service();
  const dbService = new PrismaService();
  const uploadController = new UploadController(r2Service, dbService);
  const videoController = new VideoController(r2Service, dbService);

  const api = new Hono()
    .use('*', authMiddleware);

  // Thêm middleware xử lý file lớn cho route upload
  api.post('/upload/file', fileUploadMiddleware, (c) => uploadController.uploadFile(c));
  api.get('/uploads', (c) => uploadController.getUploadedFiles(c));
  
  // Video routes
  api.post('/videos', (c) => videoController.uploadVideo(c));
  api.get('/videos', (c) => videoController.getVideos(c));
  api.get('/videos/:id', (c) => videoController.getVideoById(c));

  app.route('/api', api);
}
