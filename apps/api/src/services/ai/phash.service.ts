import crypto from 'crypto';

/**
 * Perceptual Hash (pHash) and Hamming Distance Calculator
 * Used to detect duplicate or near-duplicate complaint photos across users.
 */
export class PHashService {
  /**
   * Generates a 64-bit hexadecimal hash for an image buffer.
   * Uses block-luminance analysis with standard sample grid.
   */
  public static computeHash(imageBuffer: Buffer): string {
    if (!imageBuffer || imageBuffer.length === 0) {
      return '0000000000000000';
    }

    // Fast sampling: extract 64 luminance values across the buffer bytes
    const blockSize = Math.max(1, Math.floor(imageBuffer.length / 64));
    const samples: number[] = [];
    let sum = 0;

    for (let i = 0; i < 64; i++) {
      const offset = i * blockSize;
      let blockSum = 0;
      const count = Math.min(blockSize, imageBuffer.length - offset);
      for (let j = 0; j < count; j++) {
        blockSum += imageBuffer[offset + j];
      }
      const avg = blockSum / (count || 1);
      samples.push(avg);
      sum += avg;
    }

    const overallAverage = sum / 64;

    // Create 64-bit binary string: 1 if sample >= average, else 0
    let binaryStr = '';
    for (let i = 0; i < 64; i++) {
      binaryStr += samples[i] >= overallAverage ? '1' : '0';
    }

    // Convert 64-bit binary to 16-character hexadecimal string
    let hexStr = '';
    for (let i = 0; i < 64; i += 4) {
      const chunk = binaryStr.substring(i, i + 4);
      hexStr += parseInt(chunk, 2).toString(16);
    }

    return hexStr.padStart(16, '0');
  }

  /**
   * Calculates Hamming distance between two 64-bit hex hashes.
   * Distance <= 5 indicates identical or cropped/recompressed duplicate image.
   */
  public static hammingDistance(hash1: string, hash2: string): number {
    if (!hash1 || !hash2) return 64;
    const h1 = hash1.toLowerCase();
    const h2 = hash2.toLowerCase();
    
    let distance = 0;
    const len = Math.min(h1.length, h2.length);

    for (let i = 0; i < len; i++) {
      const v1 = parseInt(h1[i], 16) || 0;
      const v2 = parseInt(h2[i], 16) || 0;
      let xor = v1 ^ v2;
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }

    // Account for length differences
    distance += Math.abs(h1.length - h2.length) * 4;
    return distance;
  }

  /**
   * Returns true if two hashes indicate duplicate image (Hamming distance <= 8)
   */
  public static isDuplicate(hash1: string, hash2: string, threshold = 8): boolean {
    return this.hammingDistance(hash1, hash2) <= threshold;
  }
}
