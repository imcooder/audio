/**
 * WAV file decoder
 *
 * Parses a WAV file buffer and extracts PCM audio data.
 */

import type { IWavFileInfo } from './types.js';

/**
 * WAV file decoder.
 *
 * Parses a WAV file buffer and extracts header info and raw PCM data.
 *
 * @example
 * ```typescript
 * const decoder = new XWavDecoder(bufWav);
 * const info = decoder.parseHeader();
 * const bufPcm = decoder.extractPcmData();
 * ```
 */
export class XWavDecoder {
  private readonly _bufData: Buffer;

  constructor(bufData: Buffer) {
    this._bufData = bufData;
  }

  /**
   * Parse WAV header and return file info.
   *
   * @returns Parsed WAV file information
   */
  public parseHeader(): IWavFileInfo {
    if (this._bufData.length < 44) {
      throw new Error('Buffer too small to be a valid WAV file');
    }

    const strRiff = this._bufData.toString('ascii', 0, 4);
    if (strRiff !== 'RIFF') {
      throw new Error(`Invalid WAV file: expected "RIFF", got "${strRiff}"`);
    }

    const strWave = this._bufData.toString('ascii', 8, 12);
    if (strWave !== 'WAVE') {
      throw new Error(`Invalid WAV file: expected "WAVE", got "${strWave}"`);
    }

    const nAudioFormat = this._bufData.readUInt16LE(20);
    const nChannels = this._bufData.readUInt16LE(22);
    const nSampleRate = this._bufData.readUInt32LE(24);
    const nBitsPerSample = this._bufData.readUInt16LE(34);

    const nDataSize = this._findDataChunkSize();

    const nBytesPerSample = nBitsPerSample / 8;
    const nTotalSamples = nDataSize / (nBytesPerSample * nChannels);
    const nDuration = nTotalSamples / nSampleRate;

    return {
      nSampleRate,
      nChannels,
      nBitsPerSample,
      nAudioFormat,
      nDataSize,
      nDuration,
    };
  }

  /**
   * Extract raw PCM data from the WAV file.
   *
   * @returns Buffer containing only the raw PCM audio data
   */
  public extractPcmData(): Buffer {
    let nOffset = 12;
    while (nOffset + 8 <= this._bufData.length) {
      const strChunkId = this._bufData.toString('ascii', nOffset, nOffset + 4);
      const nChunkSize = this._bufData.readUInt32LE(nOffset + 4);
      if (strChunkId === 'data') {
        const nDataStart = nOffset + 8;
        const nDataEnd = Math.min(nDataStart + nChunkSize, this._bufData.length);
        return Buffer.from(this._bufData.subarray(nDataStart, nDataEnd));
      }
      nOffset += 8 + nChunkSize;
    }

    throw new Error('No data chunk found in WAV file');
  }

  private _findDataChunkSize(): number {
    let nOffset = 12;
    while (nOffset + 8 <= this._bufData.length) {
      const strChunkId = this._bufData.toString('ascii', nOffset, nOffset + 4);
      const nChunkSize = this._bufData.readUInt32LE(nOffset + 4);
      if (strChunkId === 'data') {
        return nChunkSize;
      }
      nOffset += 8 + nChunkSize;
    }
    return 0;
  }
}
