-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoFilename" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoSize" INTEGER NOT NULL,
    "videoType" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "thumbnailFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);
