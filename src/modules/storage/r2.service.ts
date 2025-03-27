import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { config } from '../../config/env.config';

export class R2Service {
  private client: S3Client;

  constructor() {
    // Kiểm tra xem các thông tin cấu hình cần thiết đã được cung cấp chưa
    if (!config.cloudflare.accountId || !config.cloudflare.credentials.accessKeyId || !config.cloudflare.credentials.secretAccessKey) {
      console.error('Thiếu thông tin cấu hình Cloudflare R2. Vui lòng kiểm tra biến môi trường.');
      throw new Error('Thiếu thông tin cấu hình Cloudflare R2');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.cloudflare.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.cloudflare.credentials.accessKeyId || '',
        secretAccessKey: config.cloudflare.credentials.secretAccessKey || '',
      },
    });
  }

  /**
   * Upload file lên R2
   * @param key Đường dẫn file trên R2
   * @param body Nội dung file
   * @param contentType MIME type của file
   * @returns URL công khai của file
   */
  async uploadFile(key: string, body: Buffer | Readable | ReadableStream, contentType: string): Promise<string> {
    console.debug(`Bắt đầu upload file: ${key}, contentType: ${contentType}`);
    
    // Chuẩn hóa contentType
    const normalizedContentType = this.normalizeContentType(contentType);
    console.debug(`ContentType sau khi chuẩn hóa: ${normalizedContentType}`);

    try {
      // Kiểm tra kích thước file nếu là Buffer
      if (Buffer.isBuffer(body)) {
        const fileSizeMB = body.length / (1024 * 1024);
        console.debug(`Kích thước file: ${fileSizeMB.toFixed(2)}MB`);
      }

      // Kiểm tra bucket name
      if (!config.storage.bucket) {
        throw new Error('Bucket name không được cung cấp. Vui lòng kiểm tra biến môi trường CLOUDFLARE_R2_BUCKET.');
      }

      // Upload file lên R2
      const command = new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: body,
        ContentType: normalizedContentType,
      });

      console.debug(`Đang gửi request upload lên R2...`);
      const response = await this.client.send(command);
      console.debug(`Upload thành công, response:`, response);

      // Xác minh file đã được upload
      await this.verifyUpload(key);

      // Tạo URL công khai
      const publicUrl = await this.getPublicUrl(key);
      console.debug(`URL công khai: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error(`Lỗi khi upload file ${key}:`, error);
      throw error;
    }
  }

  /**
   * Xác minh file đã được upload thành công
   * @param key Đường dẫn file trên R2
   */
  private async verifyUpload(key: string): Promise<void> {
    try {
      console.debug(`Đang xác minh file đã upload: ${key}`);
      const command = new HeadObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      console.debug(`Xác minh thành công, kích thước: ${response.ContentLength} bytes`);
      
      if (!response.ContentLength || response.ContentLength === 0) {
        throw new Error(`File đã upload nhưng kích thước là 0 bytes`);
      }
    } catch (error) {
      console.error(`Lỗi khi xác minh file ${key}:`, error);
      throw new Error(`Không thể xác minh file đã upload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Lấy URL công khai của file
   * @param key Đường dẫn file trên R2
   * @returns URL công khai của file
   */
  private async getPublicUrl(key: string): Promise<string> {
    // Nếu bucket đã được cấu hình public access
    if (process.env.CLOUDFLARE_R2_PUBLIC_URL) {
      return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${encodeURIComponent(key)}`;
    }
    
    // Nếu không, tạo signed URL
    console.debug(`Không có URL công khai, tạo signed URL cho ${key}`);
    return this.getSignedUrl(key);
  }

  /**
   * Tạo signed URL cho file
   * @param key Đường dẫn file trên R2
   * @param expiresIn Thời gian hết hạn (giây)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      console.debug(`Đã tạo signed URL cho ${key}, hết hạn sau ${expiresIn}s`);
      return signedUrl;
    } catch (error) {
      console.error(`Lỗi khi tạo signed URL cho ${key}:`, error);
      throw error;
    }
  }

  /**
   * Liệt kê tất cả các file trong bucket
   * @returns Danh sách các file
   */
  async listFiles(): Promise<{ key: string; size: number; lastModified: Date; url: string }[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: config.storage.bucket,
      });

      const response = await this.client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      return Promise.all(
        response.Contents.map(async (item) => {
          const url = await this.getPublicUrl(item.Key!);
          
          return {
            key: item.Key!,
            size: item.Size!,
            lastModified: item.LastModified!,
            url,
          };
        })
      );
    } catch (error) {
      console.error('Lỗi khi liệt kê files:', error);
      throw error;
    }
  }

  /**
   * Xóa file khỏi R2
   * @param key Đường dẫn file trên R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });

      await this.client.send(command);
      console.debug(`Đã xóa file ${key}`);
    } catch (error) {
      console.error(`Lỗi khi xóa file ${key}:`, error);
      throw error;
    }
  }

  /**
   * Chuẩn hóa MIME type
   * @param contentType MIME type gốc
   * @returns MIME type đã chuẩn hóa
   */
  private normalizeContentType(contentType: string): string {
    // Xử lý một số trường hợp đặc biệt
    if (contentType.includes('video/quicktime') || contentType.includes('video/mov')) {
      return 'video/quicktime';
    }
    
    if (contentType.includes('video/mp4')) {
      return 'video/mp4';
    }
    
    if (contentType.includes('video/webm')) {
      return 'video/webm';
    }
    
    if (contentType.includes('video/mpeg')) {
      return 'video/mpeg';
    }
    
    // Trả về contentType gốc nếu không có xử lý đặc biệt
    return contentType;
  }
}
