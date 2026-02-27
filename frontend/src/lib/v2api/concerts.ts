import apiClient from './client';
import { API_V2_ENDPOINTS } from './config';

// ============================================================================
// Types
// ============================================================================

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

export interface ConcertDetectRequest {
  recordedAt?: string;  // ISO 8601 timestamp
  latitude?: number;
  longitude?: number;
}

export interface ConcertMatch {
  concert: Concert;
  score: number;
}

export interface ConcertDetectResult {
  detected: boolean;
  matches: ConcertMatch[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * POST /v2/api/concerts/detect
 * Detect concerts based on metadata (location, timestamp)
 */
export const detectConcert = async (req: ConcertDetectRequest): Promise<ConcertDetectResult> => {
  const res = await apiClient.post(API_V2_ENDPOINTS.detectConcert, req);
  return res.data;
};
