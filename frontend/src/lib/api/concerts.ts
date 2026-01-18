import apiClient from './client';
import { API_ENDPOINTS } from './config';

export interface Concert {
  id: number;
  artist_id: number;
  venue_id: number;
  concert_date: string;
  tour_name: string | null;
  pollstar_id: string | null;
  setlistfm_id: string | null;
  created_at: string;
  artist_name: string;
  venue_name: string;
  venue_city: string;
  venue_state?: string;
  venue_country: string;
  video_count?: string;
  attendee_count?: string;
  venue_latitude?: string;
  venue_longitude?: string;
}

export interface ConcertsResponse {
  concerts: Concert[];
  count: number;
  page?: number;
  limit?: number;
}

export interface Video {
  id: number;
  user_id: number;
  concert_id: number;
  song_id: number | null;
  title: string;
  description: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  recorded_at: string;
  latitude: string;
  longitude: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  video_url: string;
  video_key: string;
  width: number;
  height: number;
  file_size_bytes: number | null;
  device_make: string;
  device_model: string;
  location_city: string;
  location_state: string;
  location_country: string;
  username: string;
  song_title: string | null;
  order_in_setlist?: number | null;
}

export interface Song {
  id: number;
  concert_id: number;
  title: string;
  order_in_setlist: number;
  duration_seconds: number | null;
  created_at: string;
  source: string;
  fingerprint_confidence: number | null;
  audio_fingerprint_data: any;
  video_count: string;
}

export interface ConcertPageResponse {
  concert: Concert;
  videos: Video[];
  setlist: Song[];
  stats: {
    totalVideos: number;
    totalSongs: number;
    attendees: number;
  };
}

/**
 * Fetch all concerts
 */
export const getAllConcerts = async (): Promise<ConcertsResponse> => {
  const response = await apiClient.get<ConcertsResponse>(API_ENDPOINTS.concerts);
  return response.data;
};

/**
 * Search concerts by query
 */
export const searchConcerts = async (query: string): Promise<ConcertsResponse> => {
  const response = await apiClient.get<ConcertsResponse>(
    `${API_ENDPOINTS.searchConcerts}?q=${encodeURIComponent(query)}`
  );
  return response.data;
};

/**
 * Fetch concert page data (concert details, videos, setlist)
 */
export const getConcertPage = async (concertId: number): Promise<ConcertPageResponse> => {
  const response = await apiClient.get<ConcertPageResponse>(
    API_ENDPOINTS.concertPage(concertId)
  );
  return response.data;
};

export interface ConcertSetlistResponse {
  concertId: number;
  count: number;
  songs: Song[];
}

/**
 * Fetch concert setlist
 */
export const getConcertSetlist = async (concertId: number): Promise<Song[]> => {
  const response = await apiClient.get<ConcertSetlistResponse>(
    API_ENDPOINTS.concertSetlist(concertId)
  );
  return response.data.songs;
};
