"use server";

import { unstable_cache } from "next/cache";

export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export interface PlaceReviewsResponse {
  reviews: GoogleReview[];
  rating?: number;
  user_ratings_total?: number;
  url?: string;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Internal function to fetch Google reviews from the API
 */
const fetchGoogleReviewsFromAPI = async (place_id: string): Promise<PlaceReviewsResponse | null> => {
  try {
    if (!place_id) return null;
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is not configured");
      return null;
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.append("place_id", place_id);
    url.searchParams.append("fields", "reviews,rating,user_ratings_total,url");
    url.searchParams.append("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places API error:", data.status, data.error_message);
      return null;
    }

    const result = data.result;
    return {
      reviews: result.reviews || [],
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      url: result.url,
    };
  } catch (error) {
    console.error("fetchGoogleReviewsFromAPI error:", error);
    return null;
  }
};

/**
 * Get Google reviews for a place using Google Places Details API
 * Cached for 5 minutes per place_id
 */
export const getGoogleReviews = unstable_cache(fetchGoogleReviewsFromAPI, ["google-reviews"], {
  revalidate: 300, // 5 minutes
  tags: ["google-reviews"],
});