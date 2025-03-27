import type { FileMetadata } from './file-metadata';
import type { VideoMetadata } from './video-metadata';

export interface DatabaseService {
  saveFileMetadata(metadata: FileMetadata): Promise<void>;
  getUploadedFiles(): Promise<FileMetadata[]>;
  saveVideoMetadata(metadata: VideoMetadata): Promise<void>;
  getVideos(): Promise<VideoMetadata[]>;
  getVideoById(id: string): Promise<VideoMetadata | null>;
}
