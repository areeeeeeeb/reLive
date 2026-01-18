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
 * Manually parse Apple's date format with timezone offset
 * Format: "2024-09-19T22:01:50-0400"
 * Returns UTC ISO string
 */
function parseAppleDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(\d{2})$/);
  
  if (!match) {
    // Not Apple format, use standard parsing
    return new Date(dateStr).toISOString();
  }
  
  const [_, year, month, day, hour, minute, second, sign, tzHour, tzMinute] = match;
  
  // Create local time in milliseconds (as if it's UTC)
  const localTimeMs = Date.UTC(
    parseInt(year),
    parseInt(month) - 1, // JS months are 0-indexed
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
  
  // Calculate timezone offset in milliseconds
  const offsetMinutes = parseInt(tzHour) * 60 + parseInt(tzMinute);
  const offsetMs = offsetMinutes * 60 * 1000;
  
  // Apply offset:
  // "-0400" means 4 hours behind UTC, so ADD 4 hours to get UTC
  // "+0500" means 5 hours ahead of UTC, so SUBTRACT 5 hours to get UTC
  const utcMs = sign === '-' ? localTimeMs + offsetMs : localTimeMs - offsetMs;
  
  return new Date(utcMs).toISOString();
}

/**
 * Extract metadata from video using ffprobe
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
    
    console.log('📊 Found tags:', Object.keys(tags));
    
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
    
    // Extract creation date - PRIORITIZE Apple's creation date
    const appleCreationDate = tags['com.apple.quicktime.creationdate'];
    const genericCreationTime = tags.creation_time;
    const dateTag = tags.date;
    
    let creationTime = appleCreationDate || genericCreationTime || dateTag;
    
    if (creationTime) {
      try {
        console.log(`   📅 Raw creation time: ${creationTime}`);
        
        // Use manual parser for Apple dates to avoid timezone bugs
        const parsedISO = parseAppleDate(creationTime);
        const parsedDate = new Date(parsedISO);
        
        console.log(`   🔧 Parsed using ${creationTime.includes('-04') || creationTime.includes('+') ? 'manual' : 'standard'} parser`);
        
        // Verify the date is valid and not in the future
        const now = new Date();
        const oneDayInFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        if (isNaN(parsedDate.getTime())) {
          console.log(`   ⚠️  Invalid date format: ${creationTime}`);
        } else if (parsedDate > oneDayInFuture) {
          console.log(`   ⚠️  Date is in the future (${parsedDate.toISOString()}), likely wrong timestamp`);
          
          // Try the generic creation_time if Apple date was used
          if (creationTime === appleCreationDate && genericCreationTime) {
            console.log(`   🔄 Trying generic creation_time instead...`);
            const fallbackISO = parseAppleDate(genericCreationTime);
            const fallbackDate = new Date(fallbackISO);
            if (!isNaN(fallbackDate.getTime()) && fallbackDate <= oneDayInFuture) {
              metadata.recordedAt = fallbackDate.toISOString();
              console.log(`   ✓ Using fallback date: ${metadata.recordedAt}`);
            }
          }
        } else {
          metadata.recordedAt = parsedDate.toISOString();
          console.log(`   ✓ Parsed to UTC: ${metadata.recordedAt}`);
          
          // Log verification
          const localTimeStr = parsedDate.toLocaleString('en-US', { 
            timeZone: 'America/Toronto',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          console.log(`   📅 Toronto local: ${localTimeStr}`);
          console.log(`   🔍 Input: ${creationTime} → Output: ${metadata.recordedAt}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not parse date: ${creationTime}`, e);
      }
    }
    
    // Extract GPS coordinates from ISO6709 format
    const locationISO = tags['com.apple.quicktime.location.ISO6709'];
    console.log(`   🔍 GPS Tag: ${locationISO || 'Not found'}`);
    
    if (locationISO) {
      const coords = parseISO6709(locationISO);
      if (coords) {
        metadata.latitude = coords.latitude;
        metadata.longitude = coords.longitude;
        console.log(`   📍 GPS: ${metadata.latitude}, ${metadata.longitude}`);
        
        // Reverse geocode to get location name
        const location = await reverseGeocode(metadata.latitude, metadata.longitude);
        if (location) {
          metadata.locationCity = location.city;
          metadata.locationState = location.state;
          metadata.locationCountry = location.country;
          console.log(`   🌍 Location: ${metadata.locationCity}, ${metadata.locationState}, ${metadata.locationCountry}`);
        }
      } else {
        console.log(`   ⚠️  Could not parse GPS from: ${locationISO}`);
      }
    } else {
      console.log(`   ℹ️  No GPS data found in video`);
    }
    
    // Extract device info
    metadata.deviceMake = 
      tags['com.apple.quicktime.make'] || 
      tags.make;
    
    metadata.deviceModel = 
      tags['com.apple.quicktime.model'] || 
      tags.model;
    
    if (metadata.deviceMake || metadata.deviceModel) {
      console.log(`   📱 Device: ${metadata.deviceMake || ''} ${metadata.deviceModel || ''}`);
    }
    
    console.log('✅ Metadata extraction complete');
    return metadata;
    
  } catch (error) {
    console.error('❌ Metadata extraction failed:', error);
    return {};
  }
}

/**
 * Parse ISO 6709 location string
 * Format: +43.6407-079.3547+000.000/
 */
function parseISO6709(iso6709: string): { latitude: number; longitude: number } | null {
  try {
    console.log(`   🔧 Parsing ISO6709: ${iso6709}`);
    
    // Match pattern: (+/-)DD.DDDD(+/-)DDD.DDDD
    const match = iso6709.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
    
    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      
      console.log(`   ✓ Parsed: lat=${latitude}, lon=${longitude}`);
      
      return { latitude, longitude };
    }
    
    console.log(`   ✗ No match found`);
    return null;
  } catch (error) {
    console.log('   ⚠️  Failed to parse ISO6709:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get location name using OpenStreetMap Nominatim
 */
async function reverseGeocode(
  latitude: number, 
  longitude: number
): Promise<{ city?: string; state?: string; country?: string } | null> {
  try {
    console.log(`   🌐 Reverse geocoding: ${latitude}, ${longitude}`);
    
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
        },
        timeout: 5000
      }
    );
    
    const address = response.data.address || {};
    
    const location = {
      city: address.city || address.town || address.village,
      state: address.state,
      country: address.country
    };
    
    console.log(`   ✓ Geocoded: ${location.city}, ${location.state}, ${location.country}`);
    
    return location;
  } catch (error) {
    console.log('   ⚠️  Geocoding failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}