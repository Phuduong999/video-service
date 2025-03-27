import { PrismaClient } from '@prisma/client';
import type { DatabaseService } from '../../types/database-service';
import type { FileMetadata } from '../../types/file-metadata';
import type { VideoMetadata } from '../../types/video-metadata';

export class PrismaService implements DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    await this.prisma.file.create({
      data: metadata
    });
  }

  async getUploadedFiles(): Promise<FileMetadata[]> {
    const files = await this.prisma.file.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return files.map(file => ({
      id: file.id,
      filename: file.filename,
      fileType: file.fileType,
      size: file.size,
      url: file.url,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }));
  }

  async saveVideoMetadata(metadata: VideoMetadata): Promise<void> {
    await this.prisma.video.create({
      data: metadata
    });
  }

  async getVideos(): Promise<VideoMetadata[]> {
    const videos = await this.prisma.video.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return videos;
  }

  async getVideoById(id: string): Promise<VideoMetadata | null> {
    const video = await this.prisma.video.findUnique({
      where: { id }
    });
    return video;
  }
}
