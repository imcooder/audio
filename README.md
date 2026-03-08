# @imcooder/audio

Audio processing utilities for Node.js — OGG/Opus, WAV, PCM conversion

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@imcooder/audio.svg
[npm-url]: https://npmjs.com/package/@imcooder/audio
[download-image]: https://img.shields.io/npm/dm/@imcooder/audio.svg
[download-url]: https://npmjs.com/package/@imcooder/audio

## Features

- OGG/Opus container read/write (RFC 7845)
- WAV file encode/decode
- PCM format conversion (Float32 / Int16 / Buffer)
- Zero runtime dependencies
- Dual ESM + CJS output
- Strict TypeScript

## Installation

```bash
npm install @imcooder/audio
```

## Usage

```typescript
import { XOggOpusWriter, XWavEncoder, XPcmConverter } from '@imcooder/audio';
```

## API Reference

### XOggOpusWriter

Build OGG/Opus files from raw Opus frames.

```typescript
import { XOggOpusWriter } from '@imcooder/audio';

const writer = new XOggOpusWriter({
  nSampleRate: 24000,
  nChannels: 1,
  nFrameSizeSamples: 960,
});

const bufOgg = writer.build(arrOpusFrames);
```

| Method | Description |
| ------ | ----------- |
| `build(arrOpusFrames)` | Build OGG/Opus file from raw Opus frames |

#### IOggOpusWriterOptions

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `nSampleRate` | `number` | `24000` | Input sample rate (informational) |
| `nChannels` | `number` | `1` | Channel count (1=mono, 2=stereo) |
| `nFrameSizeSamples` | `number` | `960` | Samples per frame at 48kHz (960=20ms) |
| `strVendor` | `string` | `'@imcooder/audio'` | Vendor string in OpusTags |

### XOggOpusReader

Parse OGG/Opus files and extract raw Opus packets.

```typescript
import { XOggOpusReader } from '@imcooder/audio';

const reader = new XOggOpusReader(bufOgg);

// Extract Opus frames
const arrFrames = reader.extractFrames();
// Returns: Buffer[] — each buffer is one raw Opus packet

// Parse header info
const header = reader.parseHead();
// Returns: { nVersion: 1, nChannels: 1, nPreSkip: 0, nInputSampleRate: 24000, ... }

// Static helpers
XOggOpusReader.isOggFile(bufData);  // true/false
XOggOpusReader.isWavFile(bufData);  // true/false
```

| Method | Description |
| ------ | ----------- |
| `extractFrames()` | Extract raw Opus packets from OGG file |
| `parseHead()` | Parse OpusHead header info |
| `static isOggFile(bufData)` | Check if buffer is an OGG file |
| `static isWavFile(bufData)` | Check if buffer is a WAV file |

### XWavEncoder

Encode PCM audio data to WAV format.

```typescript
import { XWavEncoder } from '@imcooder/audio';

const encoder = new XWavEncoder({
  nSampleRate: 24000,
  nChannels: 1,
  nBitsPerSample: 16,
});

// From Int16Array chunks
const bufWav = encoder.encode([arrInt16Chunk1, arrInt16Chunk2]);

// From raw PCM buffer
const bufWav2 = encoder.encodeFromBuffer(bufPcm);
```

| Method | Description |
| ------ | ----------- |
| `encode(arrPcmChunks)` | Encode Int16Array chunks to WAV buffer |
| `encodeFromBuffer(bufPcmData)` | Encode raw PCM buffer to WAV buffer |

#### IWavEncoderOptions

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `nSampleRate` | `number` | `24000` | Sample rate in Hz |
| `nChannels` | `number` | `1` | Channel count |
| `nBitsPerSample` | `number` | `16` | Bits per sample |

### XWavDecoder

Parse WAV files and extract PCM data.

```typescript
import { XWavDecoder } from '@imcooder/audio';

const decoder = new XWavDecoder(bufWav);

// Parse header
const info = decoder.parseHeader();
// Returns: { nSampleRate: 24000, nChannels: 1, nBitsPerSample: 16, nDuration: 1.5, ... }

// Extract raw PCM data
const bufPcm = decoder.extractPcmData();
```

| Method | Description |
| ------ | ----------- |
| `parseHeader()` | Parse WAV file header |
| `extractPcmData()` | Extract raw PCM data from WAV file |

### XPcmConverter

Static utility class for PCM format conversion.

```typescript
import { XPcmConverter } from '@imcooder/audio';

// Float32 -> Int16
const arrInt16 = XPcmConverter.float32ToInt16(new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]));
// Returns: Int16Array [0, 16383, -16384, 32767, -32768]

// Int16 -> Float32
const arrFloat32 = XPcmConverter.int16ToFloat32(new Int16Array([0, 16383, -16384]));
// Returns: Float32Array [0.0, 0.4999..., -0.5]

// Buffer <-> Int16Array
const arrInt16FromBuf = XPcmConverter.bufferToInt16(bufPcm);
const bufFromInt16 = XPcmConverter.int16ToBuffer(arrInt16);

// Audio level detection
const nLevel = XPcmConverter.calculateRmsLevel(arrFloat32Samples);
// Returns: number in [0, 1]
```

| Method | Description |
| ------ | ----------- |
| `static float32ToInt16(arrFloat32)` | Convert Float32 [-1, 1] to Int16 PCM |
| `static int16ToFloat32(arrInt16)` | Convert Int16 PCM to Float32 [-1, 1] |
| `static bufferToInt16(bufData)` | Convert LE Int16 Buffer to Int16Array |
| `static int16ToBuffer(arrInt16)` | Convert Int16Array to LE Buffer |
| `static calculateRmsLevel(arrSamples, nAmplification?)` | Calculate RMS audio level (0-1) |

## License

MIT
