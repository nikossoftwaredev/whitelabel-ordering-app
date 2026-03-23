"use server";

// Your Google Maps API key stored on the server side
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
    main_text_matched_substrings?: { offset: number; length: number }[];
  };
}

export interface PlaceDetails {
  name: string;
  formatted_address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Search for places using Google Places Autocomplete API
 * @param query Search query
 * @param type Place type to search for (e.g., 'establishment', 'address', 'geocode')
 * Default is 'establishment' which includes businesses, attractions, etc.
 */
export const searchPlaces = async (query: string, type: string = "establishment"): Promise<PlacePrediction[]> => {
  try {
    if (!query) {
      return [];
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is not configured");
      return [];
    }

    // Call Google Places Autocomplete API
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.append("input", query);
    url.searchParams.append("types", type);
    // Restrict search to Greece
    url.searchParams.append("components", "country:gr");
    url.searchParams.append("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return [];
    }

    // Return the predictions
    return data.predictions.map((prediction: PlacePrediction) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: prediction.structured_formatting,
    }));
  } catch (error) {
    console.error("searchPlaces error:", error);
    return [];
  }
};

/**
 * Get place details using Google Places Details API
 */
export const getPlaceDetails = async (place_id: string): Promise<PlaceDetails | null> => {
  try {
    if (!place_id) {
      return null;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is not configured");
      return null;
    }

    // Call Google Places Details API
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.append("place_id", place_id);
    url.searchParams.append("fields", "name,geometry,formatted_address");
    url.searchParams.append("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString(), {
      // Add cache: 'no-store' to avoid caching the API response
      cache: "no-store",
    });
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places API error:", data.status, data.error_message);
      return null;
    }

    const result = data.result;

    // Return the place details with coordinates
    return {
      name: result.name,
      formatted_address: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
    };
  } catch (error) {
    console.error("getPlaceDetails error:", error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to get a street address
 */
export async function reverseGeocode(lat: number, lng: number) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=el`
    );
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]) return null;

    const result = data.results[0];
    const components = result.address_components || [];

    let street = "";
    let streetNumber = "";
    let city = "";
    let postalCode = "";

    for (const comp of components) {
      if (comp.types.includes("route")) street = comp.long_name;
      if (comp.types.includes("street_number")) streetNumber = comp.long_name;
      if (comp.types.includes("locality")) city = comp.long_name;
      if (comp.types.includes("postal_code")) postalCode = comp.long_name;
    }

    return {
      street: streetNumber ? `${street} ${streetNumber}` : street,
      city,
      postalCode,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}
