import crypto from 'crypto-js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface ACRCloudConfig {
  accessKey: string;
  accessSecret: string;
  host: string;
  bucket: string;
}

interface ACRCloudMusic {
  external_ids?: {
    isrc?: string;
    upc?: string;
  };
  external_metadata?: {
    spotify?: {
      track?: {
        id?: string;
        name?: string;
      };
    };
    youtube?: {
      vid?: string;
    };
  };
  album?: {
    name?: string;
  };
  artists?: Array<{
    name: string;
  }>;
  title?: string;
  duration_ms?: number;
  release_date?: string;
  label?: string;
  genres?: Array<{
    name: string;
  }>;
  score?: number;
}

interface ACRCloudResult {
  status: {
    msg: string;
    code: number;
    version: string;
  };
  metadata?: {
    music?: ACRCloudMusic[];
    custom_files?: any[];
    timestamp_utc?: string;
  };
  cost_time?: number;
  result_type?: number;
}

export interface FingerprintMatch {
  matched: boolean;
  confidence: number; // 0-100
  songTitle?: string;
  artistName?: string;
  albumName?: string;
  duration?: number; // seconds
  spotifyId?: string;
  isrc?: string;
  releaseDate?: string;
  rawData?: any; // Store full response for future analysis
}

// ============================================================================
// API CLIENT
// ============================================================================

class ACRCloudApi {
  private config: ACRCloudConfig;

  constructor() {
    this.config = {
      accessKey: process.env.ACRCLOUD_ACCESS_KEY || '',
      accessSecret: process.env.ACRCLOUD_ACCESS_SECRET || '',
      host: process.env.ACRCLOUD_HOST || 'identify-us-west-2.acrcloud.com',
      bucket: process.env.ACRCLOUD_BUCKET || 'music',
    };

    if (!this.config.accessKey || !this.config.accessSecret) {
      console.warn('⚠️  ACRCloud credentials not configured');
    }
  }

  /**
   * Generate signature for ACRCloud API request
   */
  private generateSignature(
    httpMethod: string,
    httpUri: string,
    accessKey: string,
    dataType: string,
    signatureVersion: string,
    timestamp: number
  ): string {
    const stringToSign = [
      httpMethod,
      httpUri,
      accessKey,
      dataType,
      signatureVersion,
      timestamp,
    ].join('\n');

    return crypto.HmacSHA1(stringToSign, this.config.accessSecret).toString(
      crypto.enc.Base64
    );
  }

  /**
   * Identify audio from file path
   */
  async identifyAudio(audioFilePath: string): Promise<FingerprintMatch> {
    try {
      console.log('🎵 Starting ACRCloud audio fingerprinting...');
      console.log(`   📁 Audio file: ${audioFilePath}`);

      // Verify file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      const fileStats = fs.statSync(audioFilePath);
      console.log(`   📊 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Prepare request parameters
      const httpMethod = 'POST';
      const httpUri = `/v1/identify`;
      const dataType = 'audio';
      const signatureVersion = '1';
      const timestamp = Math.floor(Date.now() / 1000);

      // Generate signature
      const signature = this.generateSignature(
        httpMethod,
        httpUri,
        this.config.accessKey,
        dataType,
        signatureVersion,
        timestamp
      );

      console.log('   🔑 Generated signature');

      // Create form data
      const formData = new FormData();
      formData.append('sample', fs.createReadStream(audioFilePath));
      formData.append('access_key', this.config.accessKey);
      formData.append('data_type', dataType);
      formData.append('signature_version', signatureVersion);
      formData.append('signature', signature);
      formData.append('sample_bytes', fileStats.size.toString());
      formData.append('timestamp', timestamp.toString());

      console.log('   📤 Sending request to ACRCloud...');

      // Make API request
      const response = await axios.post<ACRCloudResult>(
        `https://${this.config.host}${httpUri}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('   ✅ Received response from ACRCloud');
      console.log(`   📊 Status: ${response.data.status.msg} (code: ${response.data.status.code})`);

      return this.parseResponse(response.data);
    } catch (error) {
      console.error('   ❌ ACRCloud fingerprinting failed:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('   📄 Response data:', error.response?.data);
      }

      return {
        matched: false,
        confidence: 0,
        rawData: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Parse ACRCloud response into our format
   */
  private parseResponse(response: ACRCloudResult): FingerprintMatch {
    // Check status code
    // 0 = success, 1001 = no result, 2000 = access key error, etc.
    if (response.status.code !== 0) {
      console.log(`   ℹ️  No match: ${response.status.msg}`);
      return {
        matched: false,
        confidence: 0,
        rawData: response,
      };
    }

    // Check if we have music metadata
    if (!response.metadata?.music || response.metadata.music.length === 0) {
      console.log('   ℹ️  No music metadata found');
      return {
        matched: false,
        confidence: 0,
        rawData: response,
      };
    }

    // Get the best match (first result is usually the best)
    const bestMatch = response.metadata.music[0];
    
    // Calculate confidence score (0-100)
    // ACRCloud score is typically 0-100, but we'll ensure it's in range
    const confidence = Math.min(100, Math.max(0, bestMatch.score || 0));

    console.log('   ✅ Match found!');
    console.log(`   🎵 Song: ${bestMatch.title}`);
    console.log(`   🎤 Artist: ${bestMatch.artists?.[0]?.name}`);
    console.log(`   📊 Confidence: ${confidence.toFixed(2)}%`);

    return {
      matched: true,
      confidence,
      songTitle: bestMatch.title,
      artistName: bestMatch.artists?.[0]?.name,
      albumName: bestMatch.album?.name,
      duration: bestMatch.duration_ms ? Math.round(bestMatch.duration_ms / 1000) : undefined,
      spotifyId: bestMatch.external_metadata?.spotify?.track?.id,
      isrc: bestMatch.external_ids?.isrc,
      releaseDate: bestMatch.release_date,
      rawData: response,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const acrcloudApi = new ACRCloudApi();
export { ACRCloudApi };