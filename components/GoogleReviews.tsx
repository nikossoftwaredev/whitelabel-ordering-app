"use client";

import { useEffect, useState } from "react";

import {
  getGoogleReviews,
  PlaceReviewsResponse,
} from "@/server_actions/get-google-reviews";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="size-12">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

interface ReviewsProps {
  placeId: string;
}

const GoogleReviews = ({ placeId }: ReviewsProps) => {
  const [reviewsData, setReviewsData] =
    useState<PlaceReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!placeId) { setLoading(false); return; }
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const data = await getGoogleReviews(placeId);
        if (data) setReviewsData(data);
      } catch (err) {
        console.error("Failed to fetch Google reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [placeId]);

  if (loading) return (
    <div className="relative bg-card/80 backdrop-blur-sm w-72 h-28 overflow-hidden border border-border/20 rounded-2xl shadow-lg animate-pulse" />
  );

  if (!reviewsData) return null;

  const { rating, user_ratings_total, url } = reviewsData;

  return (
    <div className="relative bg-card/80 backdrop-blur-sm w-72 overflow-hidden border border-border/20 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-green-500 via-yellow-400 to-orange-500" />

      <div className="p-6">
        <div className="flex gap-4">
          <div className="flex-[0_0_30%] flex items-center justify-center">
            <GoogleIcon />
          </div>

          <div className="flex-[0_0_70%] flex flex-col justify-center">
            <h3 className="text-foreground font-medium text-lg mb-2">
              Google Rating
            </h3>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-orange-500">
                {rating?.toFixed(1) ?? "0.0"}
              </span>
              <div className="flex">
                {[...Array(5)].map((_, i) => {
                  const starValue = i + 1;
                  const isFilled = rating ? rating >= starValue : false;
                  const isPartiallyFilled = rating
                    ? rating >= starValue - 0.5 && rating < starValue
                    : false;

                  return (
                    <div key={i} className="relative">
                      <svg
                        className="size-5 text-muted absolute"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.785.57-1.84-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                      </svg>
                      {(isFilled || isPartiallyFilled) && (
                        <svg
                          className="size-5 text-yellow-400 relative"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.785.57-1.84-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <a
              href={url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground/70 hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Read our {user_ratings_total ?? 0} reviews
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleReviews;
