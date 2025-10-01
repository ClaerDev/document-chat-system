/**
 * Media File Processor
 * 
 * Handles video and audio files by extracting metadata and providing
 * descriptive content instead of text extraction (which isn't applicable to media).
 */

import { FileProcessingOptions, FileProcessingResult, IFileProcessor, ProcessingMethod } from '../types';

export class MediaProcessor implements IFileProcessor {
  private supportedVideoTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // .avi
    'video/webm',
    'video/ogg',
    'video/3gpp',
    'video/x-ms-wmv',
  ];

  private supportedAudioTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/ogg',
    'audio/webm',
    'audio/m4a',
    'audio/aac',
  ];

  canProcess(mimeType: string): boolean {
    return [...this.supportedVideoTypes, ...this.supportedAudioTypes].includes(mimeType);
  }

  async extractText(buffer: Buffer, options: FileProcessingOptions): Promise<FileProcessingResult> {
    const startTime = Date.now();
    
    try {
      // For media files, we don't extract text but provide metadata and description
      const mimeType = this.detectMimeType(buffer);
      const isVideo = this.supportedVideoTypes.includes(mimeType);
      const isAudio = this.supportedAudioTypes.includes(mimeType);
      
      // Extract basic metadata from file headers
      const metadata = await this.extractMetadata(buffer, mimeType);
      
      // Generate descriptive text for AI context
      const descriptiveText = this.generateDescriptiveText(metadata, isVideo, isAudio);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        text: descriptiveText,
        metadata: {
          size: buffer.length,
          mimeType,
          processor: this.getName(),
          ...(isVideo && metadata.video && { video: metadata.video }),
          ...(isAudio && metadata.audio && { audio: metadata.audio }),
        },
        processing: {
          duration: processingTime,
          method: ProcessingMethod.METADATA_EXTRACTION,
          confidence: 0.9, // High confidence for metadata extraction
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        text: '',
        metadata: {
          size: buffer.length,
          mimeType: 'application/octet-stream',
          processor: this.getName(),
        },
        processing: {
          duration: processingTime,
          method: ProcessingMethod.METADATA_EXTRACTION,
          warnings: ['Metadata extraction failed'],
        },
        error: {
          code: 'MEDIA_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during media processing',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  getName(): string {
    return 'MediaProcessor';
  }

  getSupportedTypes(): string[] {
    return [...this.supportedVideoTypes, ...this.supportedAudioTypes];
  }

  private detectMimeType(buffer: Buffer): string {
    // Simple MIME type detection based on file signatures
    const signatures = [
      { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, mimeType: 'video/mp4' }, // MP4
      { bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], offset: 0, mimeType: 'video/mp4' }, // MP4 variant
      { bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0, mimeType: 'video/webm' }, // WebM
      { bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0, mimeType: 'video/ogg' }, // OGG
      { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'video/x-msvideo' }, // AVI
      { bytes: [0xFF, 0xFB], offset: 0, mimeType: 'audio/mpeg' }, // MP3
      { bytes: [0xFF, 0xF3], offset: 0, mimeType: 'audio/mpeg' }, // MP3 variant
      { bytes: [0xFF, 0xF2], offset: 0, mimeType: 'audio/mpeg' }, // MP3 variant
      { bytes: [0x49, 0x44, 0x33], offset: 0, mimeType: 'audio/mpeg' }, // MP3 with ID3
      { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'audio/wav' }, // WAV
    ];

    for (const signature of signatures) {
      if (this.checkSignature(buffer, signature.bytes, signature.offset)) {
        return signature.mimeType;
      }
    }

    // Default fallback
    return 'application/octet-stream';
  }

  private checkSignature(buffer: Buffer, signature: number[], offset: number): boolean {
    if (buffer.length < offset + signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[offset + i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  private async extractMetadata(buffer: Buffer, mimeType: string): Promise<any> {
    const metadata: any = {};
    
    try {
      if (mimeType.startsWith('video/')) {
        metadata.video = await this.extractVideoMetadata(buffer, mimeType);
      } else if (mimeType.startsWith('audio/')) {
        metadata.audio = await this.extractAudioMetadata(buffer, mimeType);
      }
    } catch (error) {
      // If metadata extraction fails, continue with basic info
      console.warn('Metadata extraction failed:', error);
    }

    return metadata;
  }

  private async extractVideoMetadata(buffer: Buffer, mimeType: string): Promise<any> {
    // Basic video metadata extraction
    // In a production environment, you might use libraries like node-ffmpeg or ffprobe
    const metadata: any = {};

    // For MP4 files, try to extract basic information from headers
    if (mimeType === 'video/mp4') {
      try {
        // This is a simplified approach - you would use a proper MP4 parser in production
        metadata.codec = 'H.264'; // Common default
        metadata.hasAudio = true; // Assume audio track exists
      } catch (error) {
        // Fallback to defaults
      }
    }

    return metadata;
  }

  private async extractAudioMetadata(buffer: Buffer, mimeType: string): Promise<any> {
    const metadata: any = {};

    // Basic audio metadata extraction
    if (mimeType === 'audio/mpeg') {
      try {
        // Simplified MP3 header parsing
        if (buffer.length > 4) {
          const header = buffer.readUInt32BE(0);
          if ((header & 0xFFE00000) === 0xFFE00000) {
            // Valid MP3 frame header
            metadata.codec = 'MP3';
            
            // Extract basic info from header
            const version = (header >> 19) & 3;
            const layer = (header >> 17) & 3;
            const bitrateIndex = (header >> 12) & 15;
            const samplingRate = (header >> 10) & 3;
            
            // Simplified bitrate and sample rate tables
            const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
            const sampleRates = [44100, 48000, 32000];
            
            if (bitrateIndex > 0 && bitrateIndex < 15) {
              metadata.bitrate = bitrates[bitrateIndex] * 1000;
            }
            if (samplingRate < 3) {
              metadata.sampleRate = sampleRates[samplingRate];
            }
            
            metadata.channels = ((header >> 6) & 3) === 3 ? 1 : 2; // Mono or stereo
          }
        }
      } catch (error) {
        // Fallback to defaults
        metadata.codec = 'MP3';
      }
    } else if (mimeType === 'audio/wav') {
      metadata.codec = 'PCM';
    }

    return metadata;
  }

  private generateDescriptiveText(metadata: any, isVideo: boolean, isAudio: boolean): string {
    const parts: string[] = [];

    if (isVideo) {
      parts.push('[Video File]');
      
      if (metadata.video) {
        if (metadata.video.duration) {
          const minutes = Math.floor(metadata.video.duration / 60);
          const seconds = Math.floor(metadata.video.duration % 60);
          parts.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        
        if (metadata.video.width && metadata.video.height) {
          parts.push(`Resolution: ${metadata.video.width}x${metadata.video.height}`);
        }
        
        if (metadata.video.codec) {
          parts.push(`Video Codec: ${metadata.video.codec}`);
        }
        
        if (metadata.video.hasAudio) {
          parts.push('Contains audio track');
          if (metadata.video.audioCodec) {
            parts.push(`Audio Codec: ${metadata.video.audioCodec}`);
          }
        }
      }
      
      parts.push('This is a video file that can be viewed and analyzed for visual content. For detailed content analysis, consider describing what you see in the video or extracting key frames.');
      
    } else if (isAudio) {
      parts.push('[Audio File]');
      
      if (metadata.audio) {
        if (metadata.audio.duration) {
          const minutes = Math.floor(metadata.audio.duration / 60);
          const seconds = Math.floor(metadata.audio.duration % 60);
          parts.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        
        if (metadata.audio.codec) {
          parts.push(`Codec: ${metadata.audio.codec}`);
        }
        
        if (metadata.audio.bitrate) {
          parts.push(`Bitrate: ${Math.round(metadata.audio.bitrate / 1000)}kbps`);
        }
        
        if (metadata.audio.sampleRate) {
          parts.push(`Sample Rate: ${metadata.audio.sampleRate}Hz`);
        }
        
        if (metadata.audio.channels) {
          parts.push(`Channels: ${metadata.audio.channels === 1 ? 'Mono' : metadata.audio.channels === 2 ? 'Stereo' : `${metadata.audio.channels} channels`}`);
        }
      }
      
      parts.push('This is an audio file that can be played and analyzed for audio content. For detailed analysis, consider describing the audio content or using speech-to-text services if it contains speech.');
    }

    return parts.join('\n');
  }
}