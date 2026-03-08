/**
 * PCM format conversion utilities
 *
 * Convert between Float32 [-1, 1] and Int16 [-32768, 32767] PCM formats.
 */

/**
 * PCM format converter.
 *
 * Provides static methods for converting between Float32, Int16, and Buffer formats.
 *
 * @example
 * ```typescript
 * const arrInt16 = XPcmConverter.float32ToInt16(arrFloat32Samples);
 * const arrFloat32 = XPcmConverter.int16ToFloat32(arrInt16Samples);
 * const nLevel = XPcmConverter.calculateRmsLevel(arrFloat32Samples);
 * ```
 */
export class XPcmConverter {
  /**
   * Convert Float32 samples to Int16 PCM.
   *
   * @param arrFloat32  Float32Array with samples in [-1, 1] range
   * @returns Int16Array with PCM16 samples
   */
  public static float32ToInt16(arrFloat32: Float32Array): Int16Array {
    const arrInt16 = new Int16Array(arrFloat32.length);
    for (let i = 0; i < arrFloat32.length; i++) {
      const nSample = Math.max(-1, Math.min(1, arrFloat32[i]!));
      arrInt16[i] = nSample < 0 ? nSample * 0x8000 : nSample * 0x7fff;
    }
    return arrInt16;
  }

  /**
   * Convert Int16 PCM samples to Float32.
   *
   * @param arrInt16  Int16Array with PCM16 samples
   * @returns Float32Array with samples in [-1, 1] range
   */
  public static int16ToFloat32(arrInt16: Int16Array): Float32Array {
    const arrFloat32 = new Float32Array(arrInt16.length);
    for (let i = 0; i < arrInt16.length; i++) {
      const nSample = arrInt16[i]!;
      arrFloat32[i] = nSample < 0 ? nSample / 0x8000 : nSample / 0x7fff;
    }
    return arrFloat32;
  }

  /**
   * Convert a Buffer of little-endian Int16 PCM to Int16Array.
   *
   * @param bufData  Buffer containing LE int16 samples
   * @returns Int16Array view of the data
   */
  public static bufferToInt16(bufData: Buffer): Int16Array {
    const arrInt16 = new Int16Array(bufData.length / 2);
    for (let i = 0; i < arrInt16.length; i++) {
      arrInt16[i] = bufData.readInt16LE(i * 2);
    }
    return arrInt16;
  }

  /**
   * Convert an Int16Array to a Buffer of little-endian Int16 PCM.
   *
   * @param arrInt16  Int16Array with PCM16 samples
   * @returns Buffer containing LE int16 samples
   */
  public static int16ToBuffer(arrInt16: Int16Array): Buffer {
    const bufOut = Buffer.alloc(arrInt16.length * 2);
    for (let i = 0; i < arrInt16.length; i++) {
      bufOut.writeInt16LE(arrInt16[i]!, i * 2);
    }
    return bufOut;
  }

  /**
   * Calculate RMS (Root Mean Square) audio level from Float32 samples.
   *
   * @param arrSamples  Float32Array with audio samples
   * @param nAmplification  Level amplification factor (default 5)
   * @returns Normalized level in [0, 1] range
   */
  public static calculateRmsLevel(
    arrSamples: Float32Array,
    nAmplification: number = 5,
  ): number {
    if (arrSamples.length === 0) return 0;

    let nSum = 0;
    for (let i = 0; i < arrSamples.length; i++) {
      const nSample = arrSamples[i]!;
      nSum += nSample * nSample;
    }

    const nRms = Math.sqrt(nSum / arrSamples.length);
    return Math.min(1, nRms * nAmplification);
  }
}
