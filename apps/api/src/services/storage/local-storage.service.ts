import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { IStorageService, StoredFile, UploadOptions } from './storage.interface.js';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

export class LocalStorageService implements IStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = config.storage.localUploadDir;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public async uploadFile(buffer: Buffer, options: UploadOptions): Promise<StoredFile> {
    const ext = path.extname(options.filename) || '.jpg';
    const uniqueKey = `${options.folder ? options.folder + '/' : ''}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueKey);

    const folderDir = path.dirname(filePath);
    if (!fs.existsSync(folderDir)) {
      fs.mkdirSync(folderDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
    logger.debug({ key: uniqueKey, size: buffer.length }, 'File saved locally');

    return {
      key: uniqueKey,
      url: this.getPublicUrl(uniqueKey),
      size: buffer.length,
      mimeType: options.mimeType,
    };
  }

  public async getFileStream(key: string): Promise<Readable> {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.createReadStream(filePath);
  }

  public async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  public getPublicUrl(key: string): string {
    return `${config.apiBaseUrl}/uploads/${key.replace(/\\/g, '/')}`;
  }
}
