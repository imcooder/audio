/**
 * OGG/Opus file writer
 *
 * Writes Opus audio frames into an OGG container that is playable
 * by browsers, Electron, and standard media players.
 *
 * OGG structure:
 *   Page 0: OpusHead (ID header)
 *   Page 1: OpusTags (comment header)
 *   Page 2+: Audio data pages (one Opus packet per page)
 *
 * References:
 *   - RFC 7845 (Ogg Encapsulation for the Opus Audio Codec)
 *   - RFC 6716 (Definition of the Opus Audio Codec)
 */

import type { IOggOpusWriterOptions } from './types.js';

/**
 * OGG/Opus file writer.
 *
 * Builds a complete OGG/Opus file from raw Opus frames.
 *
 * @example
 * ```typescript
 * const writer = new XOggOpusWriter({ nSampleRate: 24000, nChannels: 1 });
 * const bufOgg = writer.build(arrOpusFrames);
 * ```
 */
export class XOggOpusWriter {
  private readonly _nSampleRate: number;
  private readonly _nChannels: number;
  private readonly _nFrameSizeSamples: number;
  private readonly _strVendor: string;

  constructor(options: IOggOpusWriterOptions = {}) {
    this._nSampleRate = options.nSampleRate ?? 24000;
    this._nChannels = options.nChannels ?? 1;
    this._nFrameSizeSamples = options.nFrameSizeSamples ?? 960;
    this._strVendor = options.strVendor ?? '@cooder/audio';
  }

  /**
   * Build a complete OGG/Opus file from an array of raw Opus frames.
   *
   * @param arrOpusFrames  Array of raw Opus packets (each from one opus_encode call)
   * @returns Buffer containing a valid OGG/Opus file
   */
  public build(arrOpusFrames: Buffer[]): Buffer {
    const nSerialNumber = (Math.random() * 0xffffffff) >>> 0;
    let nPageSequence = 0;
    let nGranulePosition = BigInt(0);

    const arrPages: Buffer[] = [];

    // Page 0: OpusHead (BOS — Beginning Of Stream)
    const bufOpusHead = this._buildOpusHead();
    arrPages.push(
      _buildOggPage(bufOpusHead, nSerialNumber, nPageSequence++, nGranulePosition, 0x02),
    );

    // Page 1: OpusTags
    const bufOpusTags = this._buildOpusTags();
    arrPages.push(
      _buildOggPage(bufOpusTags, nSerialNumber, nPageSequence++, nGranulePosition, 0x00),
    );

    // Audio pages: one Opus packet per page
    for (let i = 0; i < arrOpusFrames.length; i++) {
      // Granule position counts samples at 48kHz (Opus internal rate)
      nGranulePosition += BigInt(this._nFrameSizeSamples);

      const bIsLast = i === arrOpusFrames.length - 1;
      const nFlags = bIsLast ? 0x04 : 0x00; // EOS on last page
      arrPages.push(
        _buildOggPage(
          arrOpusFrames[i]!,
          nSerialNumber,
          nPageSequence++,
          nGranulePosition,
          nFlags,
        ),
      );
    }

    return Buffer.concat(arrPages);
  }

  /**
   * OpusHead packet (19 bytes for mono/stereo)
   * RFC 7845 Section 5.1
   */
  private _buildOpusHead(): Buffer {
    const bufHead = Buffer.alloc(19);
    bufHead.write('OpusHead', 0, 8, 'ascii');
    bufHead.writeUInt8(1, 8);                          // Version
    bufHead.writeUInt8(this._nChannels, 9);            // Channel count
    bufHead.writeUInt16LE(0, 10);                      // Pre-skip (samples at 48kHz)
    bufHead.writeUInt32LE(this._nSampleRate, 12);      // Input sample rate (informational)
    bufHead.writeUInt16LE(0, 16);                      // Output gain (0 dB)
    bufHead.writeUInt8(0, 18);                         // Channel mapping family
    return bufHead;
  }

  /**
   * OpusTags packet (minimal: vendor string + 0 comments)
   * RFC 7845 Section 5.2
   */
  private _buildOpusTags(): Buffer {
    const nVendorLen = Buffer.byteLength(this._strVendor, 'utf8');
    const bufTags = Buffer.alloc(8 + 4 + nVendorLen + 4);
    let nOffset = 0;
    bufTags.write('OpusTags', nOffset, 8, 'ascii'); nOffset += 8;
    bufTags.writeUInt32LE(nVendorLen, nOffset);      nOffset += 4;
    bufTags.write(this._strVendor, nOffset, nVendorLen, 'utf8'); nOffset += nVendorLen;
    bufTags.writeUInt32LE(0, nOffset);               // 0 user comments
    return bufTags;
  }
}

/**
 * Build a single OGG page containing one segment.
 *
 * OGG page structure (RFC 3533):
 *   [0..3]   "OggS" capture pattern
 *   [4]      Version (0)
 *   [5]      Header type (BOS=0x02, EOS=0x04, continuation=0x01)
 *   [6..13]  Granule position (64-bit LE)
 *   [14..17] Serial number (32-bit LE)
 *   [18..21] Page sequence number (32-bit LE)
 *   [22..25] CRC checksum (32-bit LE)
 *   [26]     Number of segments
 *   [27..]   Segment table (lacing values)
 *   [..]     Segment data
 */
function _buildOggPage(
  bufData: Buffer,
  nSerialNumber: number,
  nPageSequence: number,
  nGranulePosition: bigint,
  nHeaderType: number,
): Buffer {
  const arrLacingValues: number[] = [];
  let nRemaining = bufData.length;
  while (nRemaining >= 255) {
    arrLacingValues.push(255);
    nRemaining -= 255;
  }
  arrLacingValues.push(nRemaining);

  const nNumSegments = arrLacingValues.length;
  const nHeaderSize = 27 + nNumSegments;
  const bufPage = Buffer.alloc(nHeaderSize + bufData.length);

  bufPage.write('OggS', 0, 4, 'ascii');
  bufPage.writeUInt8(0, 4);                          // Version
  bufPage.writeUInt8(nHeaderType, 5);                 // Header type flags
  bufPage.writeBigUInt64LE(nGranulePosition, 6);      // Granule position
  bufPage.writeUInt32LE(nSerialNumber, 14);           // Bitstream serial number
  bufPage.writeUInt32LE(nPageSequence, 18);           // Page sequence number
  bufPage.writeUInt32LE(0, 22);                       // CRC placeholder
  bufPage.writeUInt8(nNumSegments, 26);               // Segment count

  for (let i = 0; i < nNumSegments; i++) {
    bufPage.writeUInt8(arrLacingValues[i]!, 27 + i);
  }

  bufData.copy(bufPage, nHeaderSize);

  const nCrc = _oggCrc32(bufPage);
  bufPage.writeUInt32LE(nCrc, 22);

  return bufPage;
}

/** OGG CRC-32 lookup table (polynomial 0x04C11DB7) */
const _arrCrcTable = new Uint32Array(256);
(function _initCrcTable(): void {
  for (let i = 0; i < 256; i++) {
    let nCrc = i << 24;
    for (let j = 0; j < 8; j++) {
      if (nCrc & 0x80000000) {
        nCrc = ((nCrc << 1) ^ 0x04c11db7) >>> 0;
      } else {
        nCrc = (nCrc << 1) >>> 0;
      }
    }
    _arrCrcTable[i] = nCrc >>> 0;
  }
})();

function _oggCrc32(bufData: Buffer): number {
  let nCrc = 0;
  for (let i = 0; i < bufData.length; i++) {
    const nTableIndex = ((nCrc >>> 24) ^ bufData[i]!) & 0xff;
    nCrc = ((nCrc << 8) ^ _arrCrcTable[nTableIndex]!) >>> 0;
  }
  return nCrc >>> 0;
}
