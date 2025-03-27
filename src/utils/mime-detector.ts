export class MimeDetector {
  static detectMimeType(fileName: string, fileType: string): string | null {
    const normalizedType = fileType.toLowerCase();
    const ext = this.getFileExtension(fileName).toLowerCase();

    if (this.isValidMimeType(normalizedType)) {
      return normalizedType;
    }

    const mimeMap: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };

    return mimeMap[ext] || null;
  }

  static isVideoMimeType(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  static isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  static getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  private static isValidMimeType(mimeType: string): boolean {
    return mimeType.startsWith('video/') || mimeType.startsWith('image/');
  }
}
