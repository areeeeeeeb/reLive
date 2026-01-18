import { setlistfmApi, ConcertData } from './setlistfmApi';
import {
  findOrCreateArtist,
  findOrCreateVenue,
  findOrCreateConcert,
  linkVideoToConcert,
  createAttendeeRecord,
  getConcertDetails,
} from './concertDatabase';

// ============================================================================
// TYPES
// ============================================================================

interface VideoMetadata {
  videoId: number;
  userId: number;
  latitude: number;
  longitude: number;
  recordedAt: string; // ISO timestamp
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
}

interface ConcertMatch {
  concertId: number;
  artistId: number;
  venueId: number;
  setlistfmId: string;
  confidence: 'high' | 'medium' | 'low';
  details: {
    artistName: string;
    venueName: string;
    venueCity: string;
    venueState?: string;
    venueCountry: string;
    concertDate: string;
    tourName?: string;
    distance?: number; // km from video GPS to venue
    daysDifference?: number; // days between video and concert
  };
}

interface DetectionResult {
  success: boolean;
  match: ConcertMatch | null;
  message: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get timezone for a location
 * Simplified version - covers major North American cities
 */
function getTimezoneForLocation(city?: string, state?: string, country?: string): string {
  if (country === 'Canada' || country === 'United States') {
    // Eastern Time
    if (state === 'Ontario' || city === 'Toronto') return 'America/Toronto';
    if (state === 'Quebec' || city === 'Montreal') return 'America/Montreal';
    if (state === 'New York' || city === 'New York') return 'America/New_York';
    
    // Central Time
    if (state === 'Manitoba' || city === 'Winnipeg') return 'America/Winnipeg';
    if (state === 'Illinois' || city === 'Chicago') return 'America/Chicago';
    
    // Mountain Time
    if (state === 'Alberta' || city === 'Calgary') return 'America/Edmonton';
    if (state === 'Colorado' || city === 'Denver') return 'America/Denver';
    
    // Pacific Time
    if (state === 'British Columbia' || city === 'Vancouver') return 'America/Vancouver';
    if (state === 'California' || city === 'Los Angeles') return 'America/Los_Angeles';
  }
  
  // Default to Toronto for Canada, New York for US
  if (country === 'Canada') return 'America/Toronto';
  if (country === 'United States') return 'America/New_York';
  
  return 'America/Toronto'; // Fallback
}

/**
 * Calculate the absolute difference in calendar days between two dates
 * Uses LOCAL timezone to compare calendar dates, not UTC timestamps
 * 
 * Example:
 * - Video: Sept 19, 11 PM local → Sept 20, 3 AM UTC
 * - Concert: Sept 19, 8 PM local → Sept 20, 12 AM UTC  
 * - Days difference: 0 (same calendar day locally)
 */
function calculateDaysDifference(
  videoDateUTC: Date,
  concertDateUTC: Date,
  timezone: string
): number {
  // Convert both dates to local timezone
  const videoDateLocal = new Date(videoDateUTC.toLocaleString('en-US', { timeZone: timezone }));
  const concertDateLocal = new Date(concertDateUTC.toLocaleString('en-US', { timeZone: timezone }));
  
  // Get just the calendar dates (ignore time)
  const videoDay = new Date(videoDateLocal.getFullYear(), videoDateLocal.getMonth(), videoDateLocal.getDate());
  const concertDay = new Date(concertDateLocal.getFullYear(), concertDateLocal.getMonth(), concertDateLocal.getDate());
  
  // Calculate difference in days
  const diffTime = Math.abs(concertDay.getTime() - videoDay.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Determine confidence level based on distance and date proximity
 */
function calculateConfidence(
  distanceKm: number,
  daysDifference: number
): 'high' | 'medium' | 'low' {
  // HIGH CONFIDENCE
  if (daysDifference === 0 && distanceKm < 5) {
    return 'high';
  }
  if (daysDifference <= 1 && distanceKm < 2) {
    return 'high';
  }

  // MEDIUM CONFIDENCE
  if (daysDifference <= 3 && distanceKm < 5) {
    return 'medium';
  }
  if (daysDifference <= 5 && distanceKm < 2) {
    return 'medium';
  }

  // LOW CONFIDENCE
  return 'low';
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Main concert detection function
 */
export async function detectConcert(
  metadata: VideoMetadata
): Promise<DetectionResult> {
  try {
    console.log('');
    console.log('🎵 ========================================');
    console.log('   CONCERT DETECTION STARTED');
    console.log('🎵 ========================================');
    console.log(`   📹 Video ID: ${metadata.videoId}`);
    console.log(`   👤 User ID: ${metadata.userId}`);
    console.log(`   📍 GPS: ${metadata.latitude}, ${metadata.longitude}`);
    console.log(`   📅 Date: ${metadata.recordedAt}`);
    console.log(`   🌍 Location: ${metadata.locationCity}, ${metadata.locationState}, ${metadata.locationCountry}`);
    console.log('');

    // STEP 1: Validate inputs
    if (!metadata.locationCity) {
      return {
        success: false,
        match: null,
        message: 'No city information available for concert detection',
      };
    }

    // Get timezone for this location
    const timezone = getTimezoneForLocation(
      metadata.locationCity,
      metadata.locationState,
      metadata.locationCountry
    );

    // STEP 2: Search Setlist.fm
    console.log('1️⃣  STEP 1: Searching Setlist.fm...');
    const recordedDateUTC = new Date(metadata.recordedAt);
    
    // Convert to local time for search
    const recordedDateLocal = new Date(recordedDateUTC.toLocaleString('en-US', {
      timeZone: timezone
    }));
    
    console.log(`   🌍 UTC time: ${recordedDateUTC.toISOString()}`);
    console.log(`   🌍 Local time: ${recordedDateLocal.toLocaleString()}`);

    const concerts = await setlistfmApi.searchByCityAndDate(
      metadata.locationCity,
      recordedDateLocal
    );

    if (concerts.length === 0) {
      console.log('   ✗ No concerts found');
      console.log('');
      return {
        success: false,
        match: null,
        message: `No concerts found in ${metadata.locationCity} on ${recordedDateLocal.toDateString()}`,
      };
    }

    console.log(`   ✓ Found ${concerts.length} concert(s) in ${metadata.locationCity}`);
    console.log('');

    // STEP 3: Filter and find best match
    console.log('2️⃣  STEP 2: Filtering by distance and date proximity...');
    const matches = concerts
      .map((concert) => {
        const distance = calculateDistance(
          metadata.latitude,
          metadata.longitude,
          concert.venue.latitude,
          concert.venue.longitude
        );

        const concertDate = new Date(concert.date);
        const daysDifference = calculateDaysDifference(recordedDateUTC, concertDate, timezone);
        const confidence = calculateConfidence(distance, daysDifference);

        console.log(`   📍 ${concert.artist.name} at ${concert.venue.name}`);
        console.log(`      Distance: ${distance.toFixed(2)}km`);
        console.log(`      Days difference: ${daysDifference} day(s)`);
        console.log(`      Confidence: ${confidence}`);

        return {
          concert,
          distance,
          daysDifference,
          confidence,
        };
      })
      .filter((m) => m.distance < 10 && m.daysDifference <= 5)
      .sort((a, b) => {
        // Sort by confidence first, then distance
        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        const confidenceDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        if (confidenceDiff !== 0) return confidenceDiff;
        return a.distance - b.distance;
      });

    if (matches.length === 0) {
      console.log('   ✗ No concerts within 10km and ±5 days of video');
      console.log('');
      return {
        success: false,
        match: null,
        message: 'No concerts found within 10km and ±5 days of video location/date',
      };
    }

    // Take the best match
    const bestMatch = matches[0];
    console.log(`   ✓ Best match: ${bestMatch.concert.artist.name}`);
    console.log(`      ${bestMatch.distance.toFixed(2)}km away, ${bestMatch.daysDifference} day(s) difference`);
    console.log(`      Confidence: ${bestMatch.confidence}`);
    console.log('');

    // STEP 4: Create database records
    console.log('3️⃣  STEP 3: Creating database records...');
    const concertMatch = await createConcertRecords(
      bestMatch.concert,
      metadata,
      bestMatch.distance,
      bestMatch.daysDifference,
      bestMatch.confidence
    );
    console.log('');

    // STEP 5: Success
    console.log('✅ ========================================');
    console.log('   CONCERT DETECTION COMPLETE!');
    console.log('✅ ========================================');
    console.log(`   🎸 Artist: ${concertMatch.details.artistName}`);
    console.log(`   📍 Venue: ${concertMatch.details.venueName}`);
    console.log(`   📅 Date: ${new Date(concertMatch.details.concertDate).toDateString()}`);
    console.log(`   📏 Distance: ${concertMatch.details.distance?.toFixed(2)}km`);
    console.log(`   📆 Days diff: ${concertMatch.details.daysDifference} day(s)`);
    console.log(`   🎯 Confidence: ${concertMatch.confidence}`);
    console.log('');

    return {
      success: true,
      match: concertMatch,
      message: 'Concert detected successfully',
    };
  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('   CONCERT DETECTION FAILED');
    console.error('❌ ========================================');
    console.error(error);
    console.error('');

    return {
      success: false,
      match: null,
      message: error instanceof Error ? error.message : 'Concert detection failed',
    };
  }
}

// ============================================================================
// DATABASE RECORD CREATION
// ============================================================================

async function createConcertRecords(
  concertData: ConcertData,
  videoMetadata: VideoMetadata,
  distance: number,
  daysDifference: number,
  confidence: 'high' | 'medium' | 'low'
): Promise<ConcertMatch> {
  console.log(`   🎤 Processing artist: ${concertData.artist.name}...`);
  const artist = await findOrCreateArtist({
    name: concertData.artist.name,
    spotifyId: undefined,
  });

  console.log(`   🏟️  Processing venue: ${concertData.venue.name}...`);
  const venue = await findOrCreateVenue({
    name: concertData.venue.name,
    city: concertData.venue.city,
    state: concertData.venue.state,
    country: concertData.venue.country,
    latitude: concertData.venue.latitude,
    longitude: concertData.venue.longitude,
  });

  console.log(`   🎵 Processing concert...`);
  const concert = await findOrCreateConcert({
    artistId: artist.id,
    venueId: venue.id,
    concertDate: concertData.date,
    tourName: concertData.tourName,
    setlistfmId: concertData.setlistId,
  });

  console.log(`   🔗 Linking video to concert...`);
  await linkVideoToConcert(videoMetadata.videoId, concert.id);

  console.log(`   👤 Creating attendee record...`);
  await createAttendeeRecord(videoMetadata.userId, concert.id);

  return {
    concertId: concert.id,
    artistId: artist.id,
    venueId: venue.id,
    setlistfmId: concertData.setlistId,
    confidence,
    details: {
      artistName: artist.name,
      venueName: venue.name,
      venueCity: venue.city,
      venueState: venue.state,
      venueCountry: venue.country,
      concertDate: concert.concert_date,
      tourName: concert.tour_name,
      distance,
      daysDifference,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { VideoMetadata, ConcertMatch, DetectionResult };