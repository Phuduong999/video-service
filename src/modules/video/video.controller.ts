import { Context } from 'hono';
import { R2Service } from '../storage/r2.service';
import { DatabaseService } from '../../types/database-service';
import { mediaConfig } from '../../config/video.config';
import { Env } from 'hono/dist/types/types';
import { VideoMetadata } from '../../types/video-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export class VideoController {
  constructor(
    private readonly r2Service: R2Service,
    private readonly dbService: DatabaseService
  ) {}
  
  async getVideos(c: Context) {
    try {
      const videos = await this.dbService.getVideos();
      return c.json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      return c.json({ error: 'Failed to fetch videos' }, 500);
    }
  }

  async getVideoById(c: Context) {
    try {
      const id = c.req.param('id');
      const video = await this.dbService.getVideoById(id);
      
      if (!video) {
        return c.json({ error: 'Video not found' }, 404);
      }
      
      return c.json(video);
    } catch (error) {
      console.error('Error fetching video:', error);
      return c.json({ error: 'Failed to fetch video' }, 500);
    }
  }

  async uploadVideo(c: Context<Env>) {
    try {
      // Get form data
      const formData = await c.req.formData();
      const title = formData.get('title') as string;
      const description = formData.get('description') as string || '';
      
      // Get video file from form data
      const videoFile = formData.get('video') as File;
      
      if (!videoFile) {
        return c.json({ error: 'No video file provided' }, 400);
      }
      
      // Validate video file
      const videoBuffer = await videoFile.arrayBuffer();
      const videoSize = videoBuffer.byteLength;
      const videoType = videoFile.type;
      const videoFilename = videoFile.name;
      
      // Check file sizes
      if (videoSize > mediaConfig.maxSizeInBytes) {
        return c.json({
          error: 'Video file is too large',
          maxSize: `${mediaConfig.maxSizeInBytes / (1024 * 1024)}MB`,
          currentSize: `${videoSize / (1024 * 1024)}MB`
        }, 400);
      }
      
      // Check video is a video
      if (!videoType.startsWith('video/')) {
        return c.json({
          error: 'File must be a video',
          providedType: videoType
        }, 400);
      }
      
      // Create temporary directory for processing
      const tempDir = this.getTempDir();
      const tempVideoPath = path.join(tempDir, `${Date.now()}-${videoFilename}`);
      const tempThumbnailPath = path.join(tempDir, `${Date.now()}-thumbnail.jpg`);
      
      // Write video to temporary file
      fs.writeFileSync(tempVideoPath, Buffer.from(videoBuffer));
      
      try {
        console.debug('Starting thumbnail extraction from video:', tempVideoPath);
        console.debug('FFmpeg path:', ffmpegInstaller.path);
        console.debug('FFprobe path:', ffprobeInstaller.path);
        
        // Extract thumbnail from video
        await this.extractThumbnail(tempVideoPath, tempThumbnailPath);
        console.debug('Thumbnail extraction completed successfully');
        
        // Create folder structure in R2
        const timestamp = Date.now();
        const videoFolderKey = `videos/${timestamp}`;
        
        // Upload video file
        const videoKey = `${videoFolderKey}/${videoFilename}`;
        const videoUrl = await this.r2Service.uploadFile(
          videoKey, 
          fs.readFileSync(tempVideoPath), 
          videoType
        );
        
        // Upload thumbnail file
        const thumbnailFilename = `thumbnail.jpg`;
        const thumbnailKey = `${videoFolderKey}/thumbnails/${thumbnailFilename}`;
        const thumbnailUrl = await this.r2Service.uploadFile(
          thumbnailKey, 
          fs.readFileSync(tempThumbnailPath), 
          'image/jpeg'
        );
        
        // Save metadata to database
        const videoMetadata: VideoMetadata = {
          title,
          description,
          videoFilename,
          videoUrl,
          videoSize,
          videoType,
          thumbnailUrl,
          thumbnailFilename
        };
        
        await this.dbService.saveVideoMetadata(videoMetadata);
        
        // Clean up temporary files
        this.cleanupTempFiles([tempVideoPath, tempThumbnailPath]);
        
        return c.json({
          success: true,
          video: {
            title,
            description,
            videoUrl,
            thumbnailUrl
          }
        });
      } catch (error) {
        // Clean up temporary files in case of error
        this.cleanupTempFiles([tempVideoPath, tempThumbnailPath]);
        throw error;
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      return c.json({
        success: false,
        error: 'Error uploading video',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
  
  private getTempDir(): string {
    const tempDir = path.join(os.tmpdir(), 'video-service-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  }
  
  private cleanupTempFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.debug(`Cleaned up temporary file: ${filePath}`);
        } catch (error) {
          console.warn(`Failed to clean up temporary file: ${filePath}`, error);
        }
      }
    }
  }
  
  private extractThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('error', (err: Error) => {
          console.error('Error extracting thumbnail:', err);
          reject(err);
        })
        .on('end', () => {
          console.debug(`Thumbnail extracted to ${thumbnailPath}`);
          resolve();
        })
        .screenshots({
          timestamps: ['10%'], // Take screenshot at 10% of the video
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '640x360' // Set thumbnail size
        });
    });
  }
}
