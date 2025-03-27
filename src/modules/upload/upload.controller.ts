import { Context } from 'hono';
import { R2Service } from '../storage/r2.service';
import { DatabaseService } from '../../types/database-service';
import { mediaConfig } from '../../config/video.config';
import { Env } from 'hono/dist/types/types';
import { MimeDetector } from '../../utils/mime-detector';
import { FileMetadata } from '../../types/file-metadata';
import { UploadedFile, UploadedFiles, getUploadedFiles } from '../../middleware/file-upload';

export class UploadController {
  constructor(
    private readonly r2Service: R2Service,
    private readonly dbService: DatabaseService
  ) {}

  async getUploadedFiles(c: Context) {
    try {
      const files = await this.dbService.getUploadedFiles();
      
      // Đảm bảo URL truy cập hợp lệ cho mỗi file
      const filesWithValidUrls = await Promise.all(
        files.map(async (file) => {
          try {
            // Lấy URL truy cập mới nếu cần
            const fileKey = file.url.split('/').pop() || '';
            const accessUrl = await this.r2Service.getSignedUrl(fileKey);
            return {
              ...file,
              accessUrl
            };
          } catch (error) {
            console.warn(`Không thể lấy URL truy cập cho file ${file.filename}:`, error);
            return file;
          }
        })
      );
      
      return c.json(filesWithValidUrls);
    } catch (error) {
      console.error('Error fetching files:', error);
      return c.json({ error: 'Failed to fetch files' }, 500);
    }
  }

  async uploadFile(c: Context<Env>) {
    try {
      // Lấy file đã được xử lý bởi middleware sử dụng helper function
      const files = getUploadedFiles(c);
      if (!files || Object.keys(files).length === 0) {
        return c.json({ error: 'Không có file được gửi lên' }, 400);
      }

      // Lấy file đầu tiên (middleware chỉ cho phép 1 file)
      const fieldName = Object.keys(files)[0];
      const uploadedFile: UploadedFile = files[fieldName];

      console.debug('Thông tin file upload:', {
        name: uploadedFile.filename,
        type: uploadedFile.mimetype,
        size: uploadedFile.size
      });

      // Kiểm tra file size
      if (!uploadedFile.size || uploadedFile.size === 0) {
        return c.json({ error: 'File rỗng' }, 400);
      }

      // Kiểm tra kích thước file
      if (uploadedFile.size > mediaConfig.maxSizeInBytes) {
        return c.json({ 
          error: 'File quá lớn', 
          maxSize: `${mediaConfig.maxSizeInBytes / (1024 * 1024)}MB`,
          currentSize: `${uploadedFile.size / (1024 * 1024)}MB`
        }, 400);
      }

      // Kiểm tra MIME type
      const detectedMimeType = MimeDetector.detectMimeType(uploadedFile.filename, uploadedFile.mimetype);
      console.debug('MIME type phát hiện được:', detectedMimeType);

      if (!detectedMimeType) {
        return c.json({
          error: `Định dạng không được hỗ trợ. File: ${uploadedFile.filename}, Type: ${uploadedFile.mimetype}. ` +
                `Định dạng được hỗ trợ: ${mediaConfig.allowedExtensions.join(', ')}`,
          supportedFormats: mediaConfig.allowedExtensions,
          providedFormat: {
            extension: MimeDetector.getFileExtension(uploadedFile.filename),
            mimeType: uploadedFile.mimetype
          }
        }, 400);
      }

      // Kiểm tra định dạng file (video hoặc hình ảnh)
      if (!MimeDetector.isVideoMimeType(detectedMimeType) && 
          !detectedMimeType.startsWith('image/')) {
        return c.json({
          error: 'File phải là video hoặc hình ảnh.',
          detectedType: detectedMimeType,
          supportedTypes: mediaConfig.allowedMimeTypes
        }, 400);
      }

      // Tạo key cho file
      const key = `${Date.now()}-${uploadedFile.filename}`;
      
      try {
        console.debug('Bắt đầu upload lên R2...');
        // Upload file lên R2 sử dụng buffer đã được xử lý bởi middleware
        const publicUrl = await this.r2Service.uploadFile(key, uploadedFile.buffer, detectedMimeType);
        console.debug('Upload lên R2 thành công!');
        console.debug('URL công khai:', publicUrl);
        
        // Lưu metadata vào database
        const metadata: FileMetadata = {
          filename: uploadedFile.filename,
          fileType: detectedMimeType,
          size: uploadedFile.size,
          url: publicUrl
        };

        await this.dbService.saveFileMetadata(metadata);
        console.debug('Đã lưu metadata vào database');

        // Trả về thông tin chi tiết hơn cho client
        return c.json({ 
          success: true,
          url: publicUrl,
          fileType: detectedMimeType,
          filename: uploadedFile.filename,
          size: uploadedFile.size,
          key: key,
          bucket: process.env.CLOUDFLARE_R2_BUCKET
        });
      } catch (uploadError) {
        console.error('Lỗi khi upload file lên R2:', uploadError);
        return c.json({
          success: false,
          error: 'Lỗi khi upload file lên R2',
          details: uploadError instanceof Error ? uploadError.message : 'Lỗi không xác định'
        }, 500);
      }
    } catch (error) {
      console.error('Lỗi khi xử lý upload file:', error);
      return c.json({
        success: false,
        error: 'Lỗi khi xử lý upload file',
        details: error instanceof Error ? error.message : 'Lỗi không xác định'
      }, 500);
    }
  }

  
}
