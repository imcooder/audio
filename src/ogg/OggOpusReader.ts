/**
 * OGG/Opus file reader
 *
 * Parses an OGG/Opus file and extracts raw Opus packets.
 *
 * Only supports simple OGG files (single logical bitstream,
 * one packet per page — as produced by XOggOpusWriter).
 */

import type { IOggOpusHeader } from './types.js';

/**
 * OGG/Opus file reader.
 *
 * Parses an OGG/Opus file buffer and extracts raw Opus packets and header info.
 *
 * @example
 * ```typescript
 * const reader = new XOggOpusReader(bufOgg);
 * const header = reader.parseHead();
 * const arrFrames = reader.extractFrames();
 * ```
 */
export class XOggOpusReader {
  private readonly _bufData: Buffer;

  constructor(bufData: Buffer) {
    this._bufData = bufData;
  }

  /**
   * Extract raw Opus audio packets from the OGG/Opus file.
   * Skips the OpusHead and OpusTags header pages.
   *
   * @returns Array of raw Opus packets
   */
  public extractFrames(): Buffer[] {
    const arrFrames: Buffer[] = [];
    let nOffset = 0;

    while (nOffset < this._bufData.length) {
      if (nOffset + 27 > this._bufData.length) break;

      const strCapturePattern = this._bufData.toString('ascii', nOffset, nOffset + 4);
      if (strCapturePattern !== 'OggS') {
        throw new Error(
          `Invalid OGG page at offset ${nOffset}: expected "OggS", got "${strCapturePattern}"`,
        );
      }

      const nHeaderType = this._bufData.readUInt8(nOffset + 5);
      const nNumSegments = this._bufData.readUInt8(nOffset + 26);

      if (nOffset + 27 + nNumSegments > this._bufData.length) break;

      let nDataSize = 0;
      for (let i = 0; i < nNumSegments; i++) {
        nDataSize += this._bufData.readUInt8(nOffset + 27 + i);
      }

      const nDataOffset = nOffset + 27 + nNumSegments;
      if (nDataOffset + nDataSize > this._bufData.length) break;

      const bIsBos = (nHeaderType & 0x02) !== 0;
      if (!bIsBos) {
        const bufPageData = this._bufData.subarray(nDataOffset, nDataOffset + nDataSize);

        if (
          nDataSize >= 8 &&
          bufPageData.toString('ascii', 0, 8) === 'OpusTags'
        ) {
          // Skip comment header
        } else if (nDataSize > 0) {
          arrFrames.push(Buffer.from(bufPageData));
        }
      }

      nOffset = nDataOffset + nDataSize;
    }

    return arrFrames;
  }

  /**
   * Parse the OpusHead header from the OGG/Opus file.
   *
   * @returns Parsed OpusHead header, or null if not found
   */
  public parseHead(): IOggOpusHeader | null {
    if (this._bufData.length < 27) return null;

    const strCapturePattern = this._bufData.toString('ascii', 0, 4);
    if (strCapturePattern !== 'OggS') return null;

    const nNumSegments = this._bufData.readUInt8(26);
    const nDataOffset = 27 + nNumSegments;

    let nDataSize = 0;
    for (let i = 0; i < nNumSegments; i++) {
      nDataSize += this._bufData.readUInt8(27 + i);
    }

    if (nDataOffset + nDataSize > this._bufData.length) return null;

    const bufPageData = this._bufData.subarray(nDataOffset, nDataOffset + nDataSize);
    if (bufPageData.length < 19) return null;
    if (bufPageData.toString('ascii', 0, 8) !== 'OpusHead') return null;

    return {
      nVersion: bufPageData.readUInt8(8),
      nChannels: bufPageData.readUInt8(9),
      nPreSkip: bufPageData.readUInt16LE(10),
      nInputSampleRate: bufPageData.readUInt32LE(12),
      nOutputGain: bufPageData.readInt16LE(16),
      nChannelMappingFamily: bufPageData.readUInt8(18),
    };
  }

  /** Check if the buffer starts with the OGG capture pattern. */
  public static isOggFile(bufData: Buffer): boolean {
    return bufData.length >= 4 && bufData.toString('ascii', 0, 4) === 'OggS';
  }

  /** Check if the buffer starts with the WAV/RIFF magic. */
  public static isWavFile(bufData: Buffer): boolean {
    return bufData.length >= 4 && bufData.toString('ascii', 0, 4) === 'RIFF';
  }
}
