import apiClient from './client';
import { API_ENDPOINTS } from './config';

export interface UserHomeConcert {
  id: number;
  artist_id: number;
  venue_id: number;
  concert_date: string;
  tour_name: string | null;
  artist_name: string;
  venue_name: string;
  venue_city: string;
  my_video_count: string;
  total_video_count: string;
}

export interface PlatformStats {
  total_videos: string;
  total_concerts: string;
  total_artists: string;
  total_users: string;
}

export interface UserHomeResponse {
  myRecentConcerts: UserHomeConcert[];
  platformStats: PlatformStats;
  recentActivity: any[];
}

/**
 * Fetch user home page data
 */
export const getUserHome = async (userId: number): Promise<UserHomeResponse> => {
  const response = await apiClient.get<UserHomeResponse>(
    API_ENDPOINTS.userHome(userId)
  );
  return response.data;
};
