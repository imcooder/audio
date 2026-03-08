export interface IOggOpusWriterOptions {
  nSampleRate?: number;
  nChannels?: number;
  nFrameSizeSamples?: number;
  strVendor?: string;
}

export interface IOggOpusHeader {
  nVersion: number;
  nChannels: number;
  nPreSkip: number;
  nInputSampleRate: number;
  nOutputGain: number;
  nChannelMappingFamily: number;
}
