export interface VideoMetadata {
  id?: string;
  title: string;
  description?: string;
  videoFilename: string;
  videoUrl: string;
  videoSize: number;
  videoType: string;
  thumbnailUrl: string;
  thumbnailFilename: string;
  createdAt?: Date;
  updatedAt?: Date;
}
