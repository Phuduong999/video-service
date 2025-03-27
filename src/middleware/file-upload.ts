import { Context, Next } from 'hono';
import busboy from 'busboy';
import { Readable } from 'stream';
import { mediaConfig } from '../config/video.config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

export interface UploadedFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  filepath?: string; // Đường dẫn tạm thời nếu file lớn
}

export interface UploadedFiles {
  [fieldname: string]: UploadedFile;
}

const FILES_KEY = 'uploadedFiles';

// Tao temp folder to save files
const getTempDir = () => {
  const tempDir = path.join(os.tmpdir(), 'video-service-uploads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

export const fileUploadMiddleware = async (c: Context, next: Next) => {
  const contentType = c.req.header('content-type');
  
  if (!contentType || !contentType.includes('multipart/form-data')) {
    console.debug('Không phải multipart/form-data, bỏ qua middleware');
    await next();
    return;
  }

  console.debug('Bắt đầu xử lý multipart/form-data');
  
  try {
    // Xử lý multipart form data với busboy
    const files = await processMultipartFormData(c.req.raw);
    
    // Log thông tin file đã xử lý
    if (files && Object.keys(files).length > 0) {
      const fileKey = Object.keys(files)[0];
      const file = files[fileKey];
      console.debug(`Đã xử lý file: ${file.filename}, kích thước: ${file.size} bytes, MIME: ${file.mimetype}`);
      
      // Lưu files vào context
      c.set(FILES_KEY, files);
    } else {
      console.debug('Không có file nào được upload');
    }
    
    await next();
    
    // Dọn dẹp các file tạm thời sau khi xử lý xong
    if (files) {
      for (const fieldname in files) {
        const file = files[fieldname];
        if (file.filepath && fs.existsSync(file.filepath)) {
          try {
            fs.unlinkSync(file.filepath);
            console.debug(`Đã xóa file tạm thời: ${file.filepath}`);
          } catch (error) {
            console.warn(`Không thể xóa file tạm thời: ${file.filepath}`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Lỗi trong middleware upload file:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi khi xử lý file upload'
    }, 400);
  }
};

// Hàm xử lý multipart form data
async function processMultipartFormData(request: Request): Promise<UploadedFiles> {
  return new Promise((resolve, reject) => {
    // Tạo headers object từ request headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.debug('Headers form data:', headers);

    const files: UploadedFiles = {};
    let uploadError: Error | null = null;
    let fileFieldName: string | null = null;
    let fileProcessingPromise: Promise<void> | null = null;

    const bb = busboy({
      headers,
      limits: {
        fileSize: mediaConfig.maxSizeInBytes,
        files: 1 // Giới hạn số lượng file
      }
    });

    bb.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;
      console.debug(`Đang xử lý file: ${filename}, loại: ${mimeType}`);
      
      fileFieldName = fieldname;
      
      // Tạo tên file tạm thời
      const tempFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${filename}`;
      const tempFilePath = path.join(getTempDir(), tempFilename);
      const writeStream = fs.createWriteStream(tempFilePath);
      
      let fileSize = 0;

      // Pipe file stream vào file tạm thời
      file.pipe(writeStream);

      file.on('data', (chunk) => {
        fileSize += chunk.length;
        
        // Log tiến trình cho file lớn
        if (fileSize > 1024 * 1024 && fileSize % (5 * 1024 * 1024) < 1024 * 10) {
          console.debug(`Đã nhận ${Math.round(fileSize / (1024 * 1024))}MB của file ${filename}`);
        }
        
        // Kiểm tra kích thước file trong quá trình upload
        if (fileSize > mediaConfig.maxSizeInBytes) {
          const err = new Error(`File quá lớn. Giới hạn: ${mediaConfig.maxSizeInBytes / (1024 * 1024)}MB`);
          uploadError = err;
          file.resume(); // Bỏ qua phần còn lại của file
        }
      });

      file.on('limit', () => {
        uploadError = new Error(`File vượt quá giới hạn kích thước ${mediaConfig.maxSizeInBytes / (1024 * 1024)}MB`);
        console.error('File vượt quá giới hạn kích thước');
      });

      writeStream.on('error', (err) => {
        console.error(`Lỗi khi ghi file tạm thời: ${tempFilePath}`, err);
        uploadError = err;
      });

      // Tạo promise để xử lý file sau khi stream kết thúc
      fileProcessingPromise = new Promise<void>((resolveFile, rejectFile) => {
        file.on('end', () => {
          writeStream.end();
        });

        writeStream.on('finish', () => {
          if (uploadError) {
            // Nếu có lỗi, xóa file tạm thời
            try {
              fs.unlinkSync(tempFilePath);
            } catch (err) {
              console.warn(`Không thể xóa file tạm thời: ${tempFilePath}`, err);
            }
            rejectFile(uploadError);
            return;
          }

          console.debug(`File đã được lưu tạm thời: ${tempFilePath}, kích thước: ${fileSize} bytes`);
          
          try {
            // Đọc file từ đĩa vào buffer
            const buffer = fs.readFileSync(tempFilePath);
            
            files[fieldname] = {
              filename,
              mimetype: mimeType,
              buffer,
              size: buffer.length,
              filepath: tempFilePath
            };
            
            console.debug(`Đã đọc file từ đĩa vào buffer: ${filename}, kích thước: ${buffer.length} bytes`);
            resolveFile();
          } catch (err) {
            console.error(`Lỗi khi đọc file tạm thời: ${tempFilePath}`, err);
            rejectFile(err instanceof Error ? err : new Error(String(err)));
          }
        });
      });
    });

    bb.on('field', (fieldname, value) => {
      console.debug(`Field: ${fieldname}, Value: ${value}`);
    });

    bb.on('error', (err: Error) => {
      console.error('Lỗi khi xử lý form data:', err);
      uploadError = err;
      reject(err);
    });

    bb.on('close', async () => {
      console.debug('Busboy đã đóng kết nối');
      
      // Đợi xử lý file hoàn tất nếu có
      if (fileProcessingPromise) {
        try {
          await fileProcessingPromise;
        } catch (err) {
          reject(err);
          return;
        }
      }
      
      if (uploadError) {
        reject(uploadError);
        return;
      }
      
      if (Object.keys(files).length === 0) {
        if (fileFieldName) {
          console.warn(`File field ${fileFieldName} được phát hiện nhưng không có dữ liệu`);
        } else {
          console.warn('Không có file nào được upload');
        }
      }
      
      resolve(files);
    });

    // Pipe request body vào busboy
    if (request.body) {
      const reader = request.body.getReader();
      
      // Tạo stream từ reader
      const stream = new Readable({
        read() {
          reader.read().then(
            ({ done, value }) => {
              if (done) {
                this.push(null);
              } else {
                this.push(value);
              }
            },
            (err) => {
              console.error('Lỗi khi đọc stream:', err);
              this.destroy(err);
            }
          );
        }
      });
      
      // Pipe stream vào busboy
      stream.pipe(bb);
    } else {
      console.error('Request không có body');
      reject(new Error('Request không có body'));
    }
  });
}

// Helper function để lấy files từ context
export const getUploadedFiles = (c: Context): UploadedFiles | undefined => {
  return c.get(FILES_KEY);
};
