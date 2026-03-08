/**
 * WAV file encoder
 *
 * Converts PCM audio data to WAV format (RIFF/WAVE container).
 * Outputs Node.js Buffer instead of Blob for server-side usage.
 */

import type { IWavEncoderOptions } from './types.js';

const N_WAV_HEADER_SIZE = 44;

/**
 * WAV file encoder.
 *
 * Converts PCM audio data to WAV format buffer.
 *
 * @example
 * ```typescript
 * const encoder = new XWavEncoder({ nSampleRate: 24000, nChannels: 1 });
 * const bufWav = encoder.encode([arrInt16Chunk1, arrInt16Chunk2]);
 * ```
 */
export class XWavEncoder {
  private readonly _nSampleRate: number;
  private readonly _nChannels: number;
  private readonly _nBitsPerSample: number;

  constructor(options: IWavEncoderOptions = {}) {
    this._nSampleRate = options.nSampleRate ?? 24000;
    this._nChannels = options.nChannels ?? 1;
    this._nBitsPerSample = options.nBitsPerSample ?? 16;
  }

  /**
   * Encode PCM16 data chunks into a WAV file buffer.
   *
   * @param arrPcmChunks  Array of Int16Array chunks containing PCM samples
   * @returns Buffer containing a complete WAV file
   */
  public encode(arrPcmChunks: Int16Array[]): Buffer {
    const nTotalSamples = arrPcmChunks.reduce((nSum, arrChunk) => nSum + arrChunk.length, 0);
    const nBytesPerSample = this._nBitsPerSample / 8;
    const nDataSize = nTotalSamples * nBytesPerSample;

    const bufOut = Buffer.alloc(N_WAV_HEADER_SIZE + nDataSize);
    this._writeHeader(bufOut, nDataSize);

    let nOffset = N_WAV_HEADER_SIZE;
    for (const arrChunk of arrPcmChunks) {
      for (let i = 0; i < arrChunk.length; i++) {
        bufOut.writeInt16LE(arrChunk[i]!, nOffset);
        nOffset += 2;
      }
    }

    return bufOut;
  }

  /**
   * Encode a raw PCM16 buffer into a WAV file buffer.
   *
   * @param bufPcmData  Raw PCM16 data as Buffer (little-endian int16 samples)
   * @returns Buffer containing a complete WAV file
   */
  public encodeFromBuffer(bufPcmData: Buffer): Buffer {
    const nDataSize = bufPcmData.length;
    const bufOut = Buffer.alloc(N_WAV_HEADER_SIZE + nDataSize);
    this._writeHeader(bufOut, nDataSize);
    bufPcmData.copy(bufOut, N_WAV_HEADER_SIZE);
    return bufOut;
  }

  private _writeHeader(bufOut: Buffer, nDataSize: number): void {
    const nBlockAlign = this._nChannels * (this._nBitsPerSample / 8);
    const nByteRate = this._nSampleRate * nBlockAlign;

    // RIFF chunk descriptor
    bufOut.write('RIFF', 0, 4, 'ascii');
    bufOut.writeUInt32LE(36 + nDataSize, 4);        // File size - 8
    bufOut.write('WAVE', 8, 4, 'ascii');

    // fmt sub-chunk
    bufOut.write('fmt ', 12, 4, 'ascii');
    bufOut.writeUInt32LE(16, 16);                    // Subchunk1Size (PCM = 16)
    bufOut.writeUInt16LE(1, 20);                     // AudioFormat (PCM = 1)
    bufOut.writeUInt16LE(this._nChannels, 22);       // NumChannels
    bufOut.writeUInt32LE(this._nSampleRate, 24);     // SampleRate
    bufOut.writeUInt32LE(nByteRate, 28);              // ByteRate
    bufOut.writeUInt16LE(nBlockAlign, 32);            // BlockAlign
    bufOut.writeUInt16LE(this._nBitsPerSample, 34);  // BitsPerSample

    // data sub-chunk
    bufOut.write('data', 36, 4, 'ascii');
    bufOut.writeUInt32LE(nDataSize, 40);              // Subchunk2Size
  }
}
