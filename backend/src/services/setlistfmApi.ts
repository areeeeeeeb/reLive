import axios from 'axios';

// ============================================================================
// TYPES
// ============================================================================

interface SetlistfmConfig {
  apiKey: string;
  baseUrl: string;
}

interface SearchParams {
  cityName?: string;
  date?: string; // Format: dd-MM-yyyy
  artistName?: string;
  venueId?: string;
  p?: number; // Page number (default 1)
}

interface SetlistfmCoords {
  lat: number;
  long: number;
}

interface SetlistfmCity {
  id: string;
  name: string;
  state?: string;
  stateCode?: string;
  coords: SetlistfmCoords;
  country: {
    code: string;
    name: string;
  };
}

interface SetlistfmVenue {
  id: string;
  name: string;
  city: SetlistfmCity;
  url?: string;
}

interface SetlistfmArtist {
  mbid: string; // MusicBrainz ID
  name: string;
  sortName: string;
  disambiguation?: string;
  url?: string;
}

interface SetlistfmTour {
  name: string;
}

interface SetlistfmSong {
  name: string;
  cover?: SetlistfmArtist;
  info?: string;
  tape?: boolean;
}

interface SetlistfmSet {
  name?: string; // "Encore", "Encore 2", etc.
  encore?: number;
  song: SetlistfmSong[];
}

interface SetlistfmSetlist {
  id: string;
  versionId: string;
  eventDate: string; // Format: dd-MM-yyyy
  lastUpdated: string; // ISO timestamp
  artist: SetlistfmArtist;
  venue: SetlistfmVenue;
  tour?: SetlistfmTour;
  sets?: {
    set: SetlistfmSet[];
  };
  info?: string;
  url: string;
}

interface SetlistfmSearchResult {
  type: 'setlists';
  itemsPerPage: number;
  page: number;
  total: number;
  setlist: SetlistfmSetlist[];
}

export interface ConcertData {
  setlistId: string;
  artist: {
    name: string;
    mbid: string;
  };
  venue: {
    name: string;
    city: string;
    state?: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  date: string; // ISO format
  tourName?: string;
  songs?: string[];
}

// ============================================================================
// VENUE GEOCODING
// ============================================================================

/**
 * Geocode venue using OpenStreetMap Nominatim
 * Returns actual venue coordinates instead of city center
 */
async function geocodeVenue(
  venueName: string,
  city: string,
  country: string
): Promise<{ lat: number; lon: number } | undefined> {
  try {
    const query = `${venueName}, ${city}, ${country}`;
    
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: query,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'reLive-Concert-App/1.0',
        },
        timeout: 5000,
      }
    );

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      console.log(`   ✓ Geocoded ${venueName}: ${result.lat}, ${result.lon}`);
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
    }

    return undefined;
  } catch (error) {
    console.log(`   ⚠️  Failed to geocode ${venueName}`);
    return undefined;
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

class SetlistfmApi {
  private config: SetlistfmConfig;
  private axiosInstance;
  private geocodeCache: Map<string, { lat: number; lon: number }>;

  constructor() {
    this.config = {
      apiKey: process.env.SETLISTFM_API_KEY || '',
      baseUrl: process.env.SETLISTFM_API_URL || 'https://api.setlist.fm/rest/1.0',
    };

    if (!this.config.apiKey) {
      console.warn('⚠️  SETLISTFM_API_KEY not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Accept': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      timeout: 10000,
    });

    // Cache geocoded venues to avoid repeated API calls
    this.geocodeCache = new Map();
  }

  /**
   * Search setlists by various parameters
   */
  async searchSetlists(params: SearchParams): Promise<SetlistfmSearchResult | null> {
    try {
      console.log('🔍 Searching Setlist.fm:', params);

      const response = await this.axiosInstance.get<SetlistfmSearchResult>('/search/setlists', {
        params,
      });

      console.log(`   ✓ Found ${response.data.total} total results`);
      console.log(`   ✓ Returning ${response.data.setlist?.length || 0} setlists`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('   ✗ Setlist.fm API error:', error.response?.status, error.response?.data);
      } else {
        console.error('   ✗ Setlist.fm error:', error);
      }
      return null;
    }
  }

  /**
   * Search concerts by city and date with actual venue coordinates
   */
  async searchByCityAndDate(city: string, date: Date): Promise<ConcertData[]> {
    const dateStr = this.formatDate(date);

    const result = await this.searchSetlists({
      cityName: city,
      date: dateStr,
    });

    if (!result || !result.setlist || result.setlist.length === 0) {
      return [];
    }

    console.log('📍 Geocoding venues for accurate distances...');

    // Parse setlists and geocode venues
    const concertsPromises = result.setlist.map(async (setlist) => {
      const cityCoords = {
        lat: setlist.venue.city.coords.lat,
        lon: setlist.venue.city.coords.long,
      };

      // Try to get actual venue coordinates
      const cacheKey = `${setlist.venue.name}-${setlist.venue.city.name}`;
      let venueCoords: { lat: number; lon: number } | undefined = this.geocodeCache.get(cacheKey);

      if (!venueCoords) {
        // Geocode the venue
        const geocodeResult = await geocodeVenue(
          setlist.venue.name,
          setlist.venue.city.name,
          setlist.venue.city.country.name
        );

        if (geocodeResult) {
          // Successfully geocoded - use and cache the result
          venueCoords = geocodeResult;
          this.geocodeCache.set(cacheKey, venueCoords);
          
          // Add delay to respect rate limiting (1 req/sec)
          await new Promise(resolve => setTimeout(resolve, 1100));
        } else {
          // Geocoding failed - fall back to city coords
          venueCoords = {
            lat: cityCoords.lat,
            lon: cityCoords.lon
          };
        }
      } else {
        console.log(`   ✓ Using cached coords for ${setlist.venue.name}`);
      }

      return this.parseSetlist(setlist, venueCoords);
    });

    const concerts = await Promise.all(concertsPromises);
    return concerts;
  }

  /**
   * Search concerts by artist and date
   */
  async searchByArtistAndDate(artistName: string, date: Date): Promise<ConcertData[]> {
    const dateStr = this.formatDate(date);

    const result = await this.searchSetlists({
      artistName,
      date: dateStr,
    });

    if (!result || !result.setlist || result.setlist.length === 0) {
      return [];
    }

    // Use city coords for artist search (usually fewer results)
    return result.setlist.map((setlist) => {
      const cityCoords = {
        lat: setlist.venue.city.coords.lat,
        lon: setlist.venue.city.coords.long,
      };
      return this.parseSetlist(setlist, cityCoords);
    });
  }

  /**
   * Get setlist by ID
   */
  async getSetlistById(setlistId: string): Promise<ConcertData | null> {
    try {
      const response = await this.axiosInstance.get<SetlistfmSetlist>(`/setlist/${setlistId}`);
      const cityCoords = {
        lat: response.data.venue.city.coords.lat,
        lon: response.data.venue.city.coords.long,
      };
      return this.parseSetlist(response.data, cityCoords);
    } catch (error) {
      console.error('Error fetching setlist:', error);
      return null;
    }
  }

  /**
   * Parse Setlist.fm response into our ConcertData format
   */
  private parseSetlist(
    setlist: SetlistfmSetlist,
    venueCoords: { lat: number; lon: number }
  ): ConcertData {
    // Extract songs from all sets
    const songs: string[] = [];
    if (setlist.sets?.set) {
      for (const set of setlist.sets.set) {
        if (set.song) {
          for (const song of set.song) {
            songs.push(song.name);
          }
        }
      }
    }

    // Convert dd-MM-yyyy to ISO format
    const isoDate = this.parseSetlistDate(setlist.eventDate);

    return {
      setlistId: setlist.id,
      artist: {
        name: setlist.artist.name,
        mbid: setlist.artist.mbid,
      },
      venue: {
        name: setlist.venue.name,
        city: setlist.venue.city.name,
        state: setlist.venue.city.state,
        country: setlist.venue.city.country.name,
        latitude: venueCoords.lat,
        longitude: venueCoords.lon,
      },
      date: isoDate,
      tourName: setlist.tour?.name,
      songs: songs.length > 0 ? songs : undefined,
    };
  }

  /**
   * Format Date to dd-MM-yyyy for Setlist.fm API
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Parse Setlist.fm date format (dd-MM-yyyy) to ISO string
   */
  private parseSetlistDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('-');
    return new Date(`${year}-${month}-${day}`).toISOString();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const setlistfmApi = new SetlistfmApi();
export { SetlistfmApi };