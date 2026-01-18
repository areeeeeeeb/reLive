import { promisify } from 'util';
import { exec } from 'child_process';
import axios from 'axios';

const execPromise = promisify(exec);

interface VideoMetadata {
  recordedAt?: string;
  latitude?: number;
  longitude?: number;
  deviceMake?: string;
  deviceModel?: string;
  duration?: number;
  width?: number;
  height?: number;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
}

/**
 * Extract metadata from video using ffprobe
 * This works much better than exifr for iPhone MOV files
 */
export async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  try {
    console.log('📹 Extracting metadata from:', filePath);
    
    // Run ffprobe to get all metadata
    const { stdout } = await execPromise(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    );
    
    const data = JSON.parse(stdout);
    const format = data.format || {};
    const tags = format.tags || {};
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video') || {};
    
    console.log('📊 Raw metadata tags:', tags);
    
    const metadata: VideoMetadata = {};
    
    // Extract duration
    if (format.duration) {
      metadata.duration = Math.round(parseFloat(format.duration));
      console.log(`   ⏱️  Duration: ${metadata.duration}s`);
    }
    
    // Extract dimensions
    if (videoStream.width && videoStream.height) {
      metadata.width = videoStream.width;
      metadata.height = videoStream.height;
      console.log(`   📐 Dimensions: ${metadata.width}x${metadata.height}`);
    }
    
    // Extract creation date
    // iPhone videos store this in 'creation_time' or 'com.apple.quicktime.creationdate'
    const creationTime = 
      tags.creation_time || 
      tags['com.apple.quicktime.creationdate'] ||
      tags.date;
    
    if (creationTime) {
      metadata.recordedAt = new Date(creationTime).toISOString();
      console.log(`   📅 Recorded: ${metadata.recordedAt}`);
    }
    
    // Extract GPS coordinates
    // iPhone stores GPS in 'com.apple.quicktime.location.ISO6709'
    const locationISO = tags['com.apple.quicktime.location.ISO6709'];
    if (locationISO) {
      const coords = parseISO6709(locationISO);
      if (coords) {
        metadata.latitude = coords.latitude;
        metadata.longitude = coords.longitude;
        console.log(`   📍 GPS: ${metadata.latitude}, ${metadata.longitude}`);
        
        // Reverse geocode
        const location = await reverseGeocode(metadata.latitude, metadata.longitude);
        if (location) {
          metadata.locationCity = location.city;
          metadata.locationState = location.state;
          metadata.locationCountry = location.country;
          console.log(`   🌍 Location: ${metadata.locationCity}, ${metadata.locationState}, ${metadata.locationCountry}`);
        }
      }
    }
    
    // Extract device info
    // iPhone stores this in 'com.apple.quicktime.make' and 'com.apple.quicktime.model'
    metadata.deviceMake = 
      tags['com.apple.quicktime.make'] || 
      tags.make || 
      tags.encoder;
    
    metadata.deviceModel = 
      tags['com.apple.quicktime.model'] || 
      tags.model;
    
    if (metadata.deviceMake || metadata.deviceModel) {
      console.log(`   📱 Device: ${metadata.deviceMake} ${metadata.deviceModel}`);
    }
    
    console.log('✅ Metadata extraction complete');
    return metadata;
    
  } catch (error) {
    console.error('❌ Metadata extraction failed:', error);
    return {};
  }
}

/**
 * Parse ISO 6709 location string (used by iPhone)
 * Format: +37.7749-122.4194/ or +37.7749-122.4194+010.000/
 */
function parseISO6709(iso6709: string): { latitude: number; longitude: number } | null {
  try {
    // Remove trailing slash and altitude if present
    const cleaned = iso6709.replace(/\/$/, '').split('+')[0] + iso6709.split('+')[1];
    
    // Match pattern: +/-DD.DDDD+/-DDD.DDDD
    const match = cleaned.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
    
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2])
      };
    }
    
    return null;
  } catch (error) {
    console.log('⚠️  Failed to parse ISO6709:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get location name
 */
async function reverseGeocode(
  latitude: number, 
  longitude: number
): Promise<{ city?: string; state?: string; country?: string } | null> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
        },
        headers: {
          'User-Agent': 'reLive-Concert-App/1.0'
        }
      }
    );
    
    const address = response.data.address || {};
    
    return {
      city: address.city || address.town || address.village,
      state: address.state,
      country: address.country
    };
  } catch (error) {
    console.log('⚠️  Geocoding failed');
    return null;
  }
}

/**
 * Test function to check what metadata is available in a video
 */
export async function inspectVideoMetadata(filePath: string): Promise<void> {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v quiet -print_format json -show_format "${filePath}"`
    );
    
    const data = JSON.parse(stdout);
    console.log('\n🔍 ALL AVAILABLE METADATA:\n');
    console.log(JSON.stringify(data.format.tags, null, 2));
  } catch (error) {
    console.error('Failed to inspect metadata:', error);
  }
}