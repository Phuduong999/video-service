import { PrismaClient } from '@prisma/client';

declare module '@prisma/client' {
  interface PrismaClient {
    video: {
      create: (args: any) => Promise<any>;
      findMany: (args?: any) => Promise<any[]>;
      findUnique: (args: any) => Promise<any | null>;
    }
  }
}
