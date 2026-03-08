export interface IWavEncoderOptions {
  nSampleRate?: number;
  nChannels?: number;
  nBitsPerSample?: number;
}

export interface IWavFileInfo {
  nSampleRate: number;
  nChannels: number;
  nBitsPerSample: number;
  nAudioFormat: number;
  nDataSize: number;
  nDuration: number;
}
