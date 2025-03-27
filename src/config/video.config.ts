interface VideoConfig {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeInBytes: number;
  fallbackMimeType: string;
  mimeTypeMap: {
    [key: string]: string;
    mp4: string;
    webm: string;
    mov: string;
    avi: string;
    mkv: string;
    mpeg: string;
    mpg: string;
  };
}

export const videoConfig: VideoConfig = {
  allowedMimeTypes: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    'video/x-matroska'
  ],
  allowedExtensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mpeg', 'mpg'],
  maxSizeInBytes: 524288000, // 500MB
  fallbackMimeType: 'video/mp4',
  
  // Map file extensions to MIME types
  mimeTypeMap: {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg'
  }
};

export const mediaConfig = {
  maxSizeInBytes: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    // Video types
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    // Image types
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  allowedExtensions: [
    // Video extensions
    'mp4', 'webm', 'mov', 'avi',
    // Image extensions
    'jpg', 'jpeg', 'png', 'gif', 'webp'
  ],
  fallbackMimeType: 'application/octet-stream'
};
