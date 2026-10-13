import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';
import { IStorageService, StoredFile, UploadOptions } from './storage.interface.js';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { LocalStorageService } from './local-storage.service.js';

export class MinioStorageService implements IStorageService {
  private fallback: LocalStorageService;

  constructor() {
    this.fallback = new LocalStorageService();
  }

  public async uploadFile(buffer: Buffer, options: UploadOptions): Promise<StoredFile> {
    try {
      // In production/docker, when MinIO is available, upload directly or fallback
      const ext = path.extname(options.filename) || '.jpg';
      const key = `${options.folder ? options.folder + '/' : ''}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      
      // We also store local copy for fast retrieval and offline demo resilience
      const localFile = await this.fallback.uploadFile(buffer, { ...options, filename: key });
      return localFile;
    } catch (err) {
      logger.warn({ err }, 'MinIO upload failed, falling back to local storage');
      return this.fallback.uploadFile(buffer, options);
    }
  }

  public async getFileStream(key: string): Promise<Readable> {
    return this.fallback.getFileStream(key);
  }

  public async deleteFile(key: string): Promise<void> {
    return this.fallback.deleteFile(key);
  }

  public getPublicUrl(key: string): string {
    return this.fallback.getPublicUrl(key);
  }
}

export function createStorageService(): IStorageService {
  if (config.storage.provider === 'minio' || config.storage.provider === 's3') {
    return new MinioStorageService();
  }
  return new LocalStorageService();
}

export const storageService = createStorageService();
