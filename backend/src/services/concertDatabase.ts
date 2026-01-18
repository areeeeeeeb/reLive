import pool from '../config/database';

// ============================================================================
// TYPES
// ============================================================================

interface Artist {
  id: number;
  name: string;
  spotify_id?: string;
  image_url?: string;
}

interface Venue {
  id: number;
  name: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface Concert {
  id: number;
  artist_id: number;
  venue_id: number;
  concert_date: string;
  tour_name?: string;
  pollstar_id?: string;
  setlistfm_id?: string;
}

interface CreateArtistParams {
  name: string;
  spotifyId?: string;
  imageUrl?: string;
}

interface CreateVenueParams {
  name: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface CreateConcertParams {
  artistId: number;
  venueId: number;
  concertDate: string; // ISO format
  tourName?: string;
  pollstarId?: string;
  setlistfmId?: string;
}

// ============================================================================
// ARTIST OPERATIONS
// ============================================================================

/**
 * Find artist by name or Spotify ID
 */
export async function findArtist(name: string, spotifyId?: string): Promise<Artist | null> {
  try {
    let query: string;
    let params: any[];

    if (spotifyId) {
      query = 'SELECT * FROM artists WHERE name = $1 OR spotify_id = $2 LIMIT 1';
      params = [name, spotifyId];
    } else {
      query = 'SELECT * FROM artists WHERE name = $1 LIMIT 1';
      params = [name];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding artist:', error);
    throw error;
  }
}

/**
 * Create new artist
 */
export async function createArtist(params: CreateArtistParams): Promise<Artist> {
  try {
    const query = `
      INSERT INTO artists (name, spotify_id, image_url)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.name,
      params.spotifyId || null,
      params.imageUrl || null,
    ]);

    console.log(`   ✓ Created artist: ${params.name} (id: ${result.rows[0].id})`);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating artist:', error);
    throw error;
  }
}

/**
 * Find or create artist (idempotent)
 */
export async function findOrCreateArtist(params: CreateArtistParams): Promise<Artist> {
  // First, try to find existing artist
  const existing = await findArtist(params.name, params.spotifyId);

  if (existing) {
    console.log(`   ✓ Found existing artist: ${existing.name} (id: ${existing.id})`);
    return existing;
  }

  // Create new artist if not found
  return await createArtist(params);
}

// ============================================================================
// VENUE OPERATIONS
// ============================================================================

/**
 * Find venue by name and city (venues are unique by name + city combination)
 */
export async function findVenue(name: string, city: string): Promise<Venue | null> {
  try {
    const query = `
      SELECT * FROM venues 
      WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2)
      LIMIT 1
    `;

    const result = await pool.query(query, [name, city]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding venue:', error);
    throw error;
  }
}

/**
 * Create new venue
 */
export async function createVenue(params: CreateVenueParams): Promise<Venue> {
  try {
    const query = `
      INSERT INTO venues (name, city, state, country, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.name,
      params.city,
      params.state || null,
      params.country,
      params.latitude || null,
      params.longitude || null,
    ]);

    console.log(`   ✓ Created venue: ${params.name} in ${params.city} (id: ${result.rows[0].id})`);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating venue:', error);
    throw error;
  }
}

/**
 * Find or create venue (idempotent)
 */
export async function findOrCreateVenue(params: CreateVenueParams): Promise<Venue> {
  // First, try to find existing venue
  const existing = await findVenue(params.name, params.city);

  if (existing) {
    console.log(`   ✓ Found existing venue: ${existing.name} (id: ${existing.id})`);
    return existing;
  }

  // Create new venue if not found
  return await createVenue(params);
}

// ============================================================================
// CONCERT OPERATIONS
// ============================================================================

/**
 * Find concert by artist, venue, and date
 */
export async function findConcert(
  artistId: number,
  venueId: number,
  concertDate: string
): Promise<Concert | null> {
  try {
    const query = `
      SELECT * FROM concerts 
      WHERE artist_id = $1 
        AND venue_id = $2 
        AND DATE(concert_date) = DATE($3)
      LIMIT 1
    `;

    const result = await pool.query(query, [artistId, venueId, concertDate]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding concert:', error);
    throw error;
  }
}

/**
 * Create new concert
 */
export async function createConcert(params: CreateConcertParams): Promise<Concert> {
  try {
    const query = `
      INSERT INTO concerts (
        artist_id, venue_id, concert_date, 
        tour_name, pollstar_id, setlistfm_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.artistId,
      params.venueId,
      params.concertDate,
      params.tourName || null,
      params.pollstarId || null,
      params.setlistfmId || null,
    ]);

    console.log(`   ✓ Created concert (id: ${result.rows[0].id})`);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating concert:', error);
    throw error;
  }
}

/**
 * Find or create concert (idempotent)
 */
export async function findOrCreateConcert(params: CreateConcertParams): Promise<Concert> {
  // First, try to find existing concert
  const existing = await findConcert(params.artistId, params.venueId, params.concertDate);

  if (existing) {
    console.log(`   ✓ Found existing concert (id: ${existing.id})`);
    return existing;
  }

  // Create new concert if not found
  return await createConcert(params);
}

// ============================================================================
// VIDEO-CONCERT LINKING
// ============================================================================

/**
 * Link video to concert
 */
export async function linkVideoToConcert(videoId: number, concertId: number): Promise<void> {
  try {
    const query = 'UPDATE videos SET concert_id = $1 WHERE id = $2';
    await pool.query(query, [concertId, videoId]);
    console.log(`   ✓ Linked video ${videoId} to concert ${concertId}`);
  } catch (error) {
    console.error('Error linking video to concert:', error);
    throw error;
  }
}

/**
 * Unlink video from concert
 */
export async function unlinkVideoFromConcert(videoId: number): Promise<void> {
  try {
    const query = 'UPDATE videos SET concert_id = NULL WHERE id = $1';
    await pool.query(query, [videoId]);
    console.log(`   ✓ Unlinked video ${videoId} from concert`);
  } catch (error) {
    console.error('Error unlinking video from concert:', error);
    throw error;
  }
}

// ============================================================================
// ATTENDEE OPERATIONS
// ============================================================================

/**
 * Create attendee record (user attended a concert)
 * Uses ON CONFLICT to make it idempotent
 */
export async function createAttendeeRecord(userId: number, concertId: number): Promise<void> {
  try {
    const query = `
      INSERT INTO attendees (user_id, concert_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, concert_id) DO NOTHING
    `;

    await pool.query(query, [userId, concertId]);
    console.log(`   ✓ Created attendee record for user ${userId} at concert ${concertId}`);
  } catch (error) {
    console.error('Error creating attendee record:', error);
    throw error;
  }
}

/**
 * Remove attendee record
 */
export async function removeAttendeeRecord(userId: number, concertId: number): Promise<void> {
  try {
    const query = 'DELETE FROM attendees WHERE user_id = $1 AND concert_id = $2';
    await pool.query(query, [userId, concertId]);
    console.log(`   ✓ Removed attendee record for user ${userId} at concert ${concertId}`);
  } catch (error) {
    console.error('Error removing attendee record:', error);
    throw error;
  }
}

/**
 * Check if user attended a concert
 */
export async function userAttendedConcert(userId: number, concertId: number): Promise<boolean> {
  try {
    const query = 'SELECT 1 FROM attendees WHERE user_id = $1 AND concert_id = $2';
    const result = await pool.query(query, [userId, concertId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking attendee record:', error);
    throw error;
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get full concert details with artist and venue info
 */
export async function getConcertDetails(concertId: number) {
  try {
    const query = `
      SELECT 
        c.*,
        a.name as artist_name,
        a.spotify_id as artist_spotify_id,
        a.image_url as artist_image_url,
        v.name as venue_name,
        v.city as venue_city,
        v.state as venue_state,
        v.country as venue_country,
        v.latitude as venue_latitude,
        v.longitude as venue_longitude
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      JOIN venues v ON c.venue_id = v.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [concertId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting concert details:', error);
    throw error;
  }
}

/**
 * Get all concerts at a venue
 */
export async function getConcertsByVenue(venueId: number) {
  try {
    const query = `
      SELECT c.*, a.name as artist_name
      FROM concerts c
      JOIN artists a ON c.artist_id = a.id
      WHERE c.venue_id = $1
      ORDER BY c.concert_date DESC
    `;

    const result = await pool.query(query, [venueId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting concerts by venue:', error);
    throw error;
  }
}

/**
 * Get all concerts by an artist
 */
export async function getConcertsByArtist(artistId: number) {
  try {
    const query = `
      SELECT c.*, v.name as venue_name, v.city as venue_city
      FROM concerts c
      JOIN venues v ON c.venue_id = v.id
      WHERE c.artist_id = $1
      ORDER BY c.concert_date DESC
    `;

    const result = await pool.query(query, [artistId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting concerts by artist:', error);
    throw error;
  }
}

// ============================================================================
// CONCERT THUMBNAIL OPERATIONS
// ============================================================================

/**
 * Update concert thumbnail (only if not already set)
 * Uses atomic PostgreSQL query to prevent race conditions
 *
 * @param concertId - Concert ID to update
 * @param thumbnailUrl - CDN URL for thumbnail
 * @param thumbnailKey - DigitalOcean Spaces storage key
 * @returns true if thumbnail was updated, false if concert already had a thumbnail
 */
export async function updateConcertThumbnail(
  concertId: number,
  thumbnailUrl: string,
  thumbnailKey: string
): Promise<boolean> {
  try {
    // Atomically update concert thumbnail only if it doesn't already have one
    // This prevents race conditions when multiple videos are uploaded simultaneously
    const query = `
      UPDATE concerts
      SET thumbnail_url = $2, thumbnail_key = $3
      WHERE id = $1 AND thumbnail_url IS NULL
      RETURNING id
    `;

    const result = await pool.query(query, [concertId, thumbnailUrl, thumbnailKey]);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`   ✅ Updated concert ${concertId} with thumbnail: ${thumbnailUrl}`);
      return true;
    } else {
      console.log(`   ℹ️  Concert ${concertId} already has thumbnail, skipping`);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error updating concert thumbnail:', error);
    throw error;
  }
}