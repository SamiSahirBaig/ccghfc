import { Readable } from 'stream';

export interface UploadOptions {
  filename: string;
  mimeType: string;
  folder?: string;
}

export interface StoredFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IStorageService {
  uploadFile(buffer: Buffer, options: UploadOptions): Promise<StoredFile>;
  getFileStream(key: string): Promise<Readable>;
  deleteFile(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
