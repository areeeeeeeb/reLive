import { setlistfmApi, ConcertData } from './setlistfmApi';
import {
  findOrCreateArtist,
  findOrCreateVenue,
  findOrCreateConcert,
  linkVideoToConcert,
  createAttendeeRecord,
} from './concertDatabase';
import pool from '../config/database';

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
  confidence: 'high' | 'medium' | 'low' | 'none';
  setlistFetched: boolean;
  songsCount: number;
  details: {
    artistName: string;
    venueName: string;
    venueCity: string;
    venueState?: string;
    venueCountry: string;
    concertDate: string;
    tourName?: string;
    distance?: number;
    daysDifference?: number;
  };
}

interface DetectionResult {
  success: boolean;
  match: ConcertMatch | null;
  alternativeMatches?: ConcertMatch[]; // NEW: For medium confidence
  message: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

function getTimezoneForLocation(city?: string, state?: string, country?: string): string {
  if (country === 'Canada' || country === 'United States') {
    if (state === 'Ontario' || city === 'Toronto') return 'America/Toronto';
    if (state === 'Quebec' || city === 'Montreal') return 'America/Montreal';
    if (state === 'New York' || city === 'New York') return 'America/New_York';
    if (state === 'Manitoba' || city === 'Winnipeg') return 'America/Winnipeg';
    if (state === 'Illinois' || city === 'Chicago') return 'America/Chicago';
    if (state === 'Alberta' || city === 'Calgary') return 'America/Edmonton';
    if (state === 'Colorado' || city === 'Denver') return 'America/Denver';
    if (state === 'British Columbia' || city === 'Vancouver') return 'America/Vancouver';
    if (state === 'California' || city === 'Los Angeles') return 'America/Los_Angeles';
  }
  
  if (country === 'Canada') return 'America/Toronto';
  if (country === 'United States') return 'America/New_York';
  
  return 'America/Toronto';
}

/**
 * 🔧 FIXED: Calculate days difference in LOCAL timezone
 * This fixes the issue where concerts on the same calendar day 
 * were showing as different days due to UTC comparison
 */
function calculateDaysDifference(
  videoDateUTC: Date,
  concertDateUTC: Date,
  timezone: string
): number {
  // Convert to local timezone strings for accurate date comparison
  const videoLocalStr = videoDateUTC.toLocaleString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const concertLocalStr = concertDateUTC.toLocaleString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parse back to Date objects (now as midnight in the local timezone)
  const videoLocalDate = new Date(videoLocalStr);
  const concertLocalDate = new Date(concertLocalStr);
  
  // Calculate difference in days
  const diffTime = Math.abs(concertLocalDate.getTime() - videoLocalDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 🔧 IMPROVED: Better confidence thresholds
 * High confidence: Same day + very close OR next day + exact location
 * Medium confidence: Within 1-2 days + reasonable distance
 * Low confidence: Everything else
 */
function calculateConfidence(
  distanceKm: number,
  daysDifference: number
): 'high' | 'medium' | 'low' | 'none' {
  // HIGH CONFIDENCE: Very likely correct
  if (daysDifference === 0 && distanceKm < 0.5) return 'high'; // Same day, same venue
  if (daysDifference === 0 && distanceKm < 2) return 'high';   // Same day, nearby
  if (daysDifference === 1 && distanceKm < 0.1) return 'high'; // Adjacent day, exact location
  
  // MEDIUM CONFIDENCE: Probable but needs confirmation
  if (daysDifference === 0 && distanceKm < 5) return 'medium'; // Same day, reasonable distance
  if (daysDifference === 1 && distanceKm < 2) return 'medium'; // Adjacent day, nearby
  if (daysDifference === 2 && distanceKm < 1) return 'medium'; // 2 days, very close
  
  // LOW CONFIDENCE: Possible but uncertain
  if (daysDifference <= 3 && distanceKm < 5) return 'low';
  if (daysDifference <= 5 && distanceKm < 2) return 'low';
  
  return 'none';
}

// ============================================================================
// SETLIST FETCHING
// ============================================================================

/**
 * Fetch and store setlist from Setlist.fm
 */
async function fetchAndStoreSetlist(concertId: number, setlistfmId: string): Promise<number> {
  try {
    console.log('📋 Fetching setlist from Setlist.fm...');
    
    // Check if setlist already exists
    const existingCheck = await pool.query(
      'SELECT COUNT(*) as count FROM songs WHERE concert_id = $1 AND source = $2',
      [concertId, 'setlistfm']
    );
    
    if (parseInt(existingCheck.rows[0].count) > 0) {
      console.log('   ✓ Setlist already cached in database');
      return parseInt(existingCheck.rows[0].count);
    }
    
    // Fetch from Setlist.fm
    const setlistData = await setlistfmApi.getSetlistById(setlistfmId);
    
    if (!setlistData || !setlistData.songs || setlistData.songs.length === 0) {
      console.log('   ℹ️  No setlist available on Setlist.fm');
      return 0;
    }
    
    console.log(`   ✓ Found ${setlistData.songs.length} songs`);
    console.log('   💾 Storing songs in database...');
    
    // Store each song
    let storedCount = 0;
    for (let i = 0; i < setlistData.songs.length; i++) {
      const songTitle = setlistData.songs[i];
      
      await pool.query(
        `INSERT INTO songs (concert_id, title, order_in_setlist, source)
         VALUES ($1, $2, $3, $4)`,
        [concertId, songTitle, i + 1, 'setlistfm']
      );
      
      storedCount++;
    }
    
    console.log(`   ✅ Stored ${storedCount} songs from setlist`);
    return storedCount;
    
  } catch (error) {
    console.error('   ⚠️  Failed to fetch setlist:', error);
    return 0;
  }
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

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

    if (!metadata.locationCity) {
      return {
        success: false,
        match: null,
        message: 'No city information available for concert detection',
      };
    }

    const timezone = getTimezoneForLocation(
      metadata.locationCity,
      metadata.locationState,
      metadata.locationCountry
    );

    console.log('1️⃣  STEP 1: Searching Setlist.fm...');
    const recordedDateUTC = new Date(metadata.recordedAt);
    const recordedDateLocal = new Date(recordedDateUTC.toLocaleString('en-US', {
      timeZone: timezone
    }));
    
    console.log(`   🌍 UTC time: ${recordedDateUTC.toISOString()}`);
    console.log(`   🌍 Local time: ${recordedDateLocal.toLocaleString()}`);
    console.log(`   🕐 Timezone: ${timezone}`);

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
      .filter((m) => m.confidence !== 'none') // Only keep matches with some confidence
      .sort((a, b) => {
        const confidenceOrder = { high: 0, medium: 1, low: 2, none: 3 };
        const confidenceDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        if (confidenceDiff !== 0) return confidenceDiff;
        return a.distance - b.distance;
      });

    if (matches.length === 0) {
      console.log('   ✗ No concerts match confidence criteria');
      console.log('');
      return {
        success: false,
        match: null,
        message: 'No concerts found within reasonable distance and time range',
      };
    }

    const bestMatch = matches[0];
    console.log(`   ✓ Best match: ${bestMatch.concert.artist.name}`);
    console.log(`      ${bestMatch.distance.toFixed(2)}km away, ${bestMatch.daysDifference} day(s) difference`);
    console.log(`      Confidence: ${bestMatch.confidence}`);
    console.log('');

    // For HIGH confidence: Auto-link
    // For MEDIUM confidence: Return alternatives for user to confirm
    // For LOW confidence: Don't auto-link, but show as option
    
    if (bestMatch.confidence === 'high') {
      console.log('3️⃣  STEP 3: Creating database records (HIGH CONFIDENCE)...');
      const concertMatch = await createConcertRecords(
        bestMatch.concert,
        metadata,
        bestMatch.distance,
        bestMatch.daysDifference,
        bestMatch.confidence
      );
      console.log('');

      console.log('4️⃣  STEP 4: Fetching setlist...');
      const songsCount = await fetchAndStoreSetlist(
        concertMatch.concertId,
        bestMatch.concert.setlistId
      );
      console.log('');

      console.log('✅ ========================================');
      console.log('   CONCERT DETECTION COMPLETE!');
      console.log('✅ ========================================');
      console.log(`   🎸 Artist: ${concertMatch.details.artistName}`);
      console.log(`   📍 Venue: ${concertMatch.details.venueName}`);
      console.log(`   📅 Date: ${new Date(concertMatch.details.concertDate).toDateString()}`);
      console.log(`   📏 Distance: ${concertMatch.details.distance?.toFixed(2)}km`);
      console.log(`   📆 Days diff: ${concertMatch.details.daysDifference} day(s)`);
      console.log(`   🎯 Confidence: ${concertMatch.confidence}`);
      console.log(`   📋 Songs in setlist: ${songsCount}`);
      console.log('');

      return {
        success: true,
        match: {
          ...concertMatch,
          setlistFetched: songsCount > 0,
          songsCount,
        },
        message: 'Concert detected with high confidence',
      };
    } else {
      // MEDIUM or LOW confidence: Don't auto-link, return options
      console.log(`3️⃣  STEP 3: ${bestMatch.confidence.toUpperCase()} confidence - returning matches for user confirmation...`);
      
      // Get top 3 matches for user to choose from
      const topMatches = matches.slice(0, 3);
      const alternativeMatches: ConcertMatch[] = [];
      
      for (const match of topMatches) {
        const artist = await findOrCreateArtist({
          name: match.concert.artist.name,
          spotifyId: undefined,
        });

        const venue = await findOrCreateVenue({
          name: match.concert.venue.name,
          city: match.concert.venue.city,
          state: match.concert.venue.state,
          country: match.concert.venue.country,
          latitude: match.concert.venue.latitude,
          longitude: match.concert.venue.longitude,
        });

        const concert = await findOrCreateConcert({
          artistId: artist.id,
          venueId: venue.id,
          concertDate: match.concert.date,
          tourName: match.concert.tourName,
          setlistfmId: match.concert.setlistId,
        });
        
        // Fetch setlist for each option
        const songsCount = await fetchAndStoreSetlist(concert.id, match.concert.setlistId);

        alternativeMatches.push({
          concertId: concert.id,
          artistId: artist.id,
          venueId: venue.id,
          setlistfmId: match.concert.setlistId,
          confidence: match.confidence,
          setlistFetched: songsCount > 0,
          songsCount,
          details: {
            artistName: artist.name,
            venueName: venue.name,
            venueCity: venue.city,
            venueState: venue.state,
            venueCountry: venue.country,
            concertDate: concert.concert_date,
            tourName: concert.tour_name,
            distance: match.distance,
            daysDifference: match.daysDifference,
          },
        });
      }
      
      console.log('');
      console.log('⚠️  ========================================');
      console.log('   CONCERT DETECTION - USER INPUT NEEDED');
      console.log('⚠️  ========================================');
      console.log(`   Found ${alternativeMatches.length} possible matches`);
      console.log(`   User should confirm which concert they attended`);
      console.log('');

      return {
        success: false, // Don't auto-link
        match: null,
        alternativeMatches,
        message: `Found ${alternativeMatches.length} possible concerts. User confirmation needed.`,
      };
    }
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
  confidence: 'high' | 'medium' | 'low' | 'none'
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
    setlistFetched: false, // Will be updated in main function
    songsCount: 0, // Will be updated in main function
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

export type { VideoMetadata, ConcertMatch, DetectionResult };