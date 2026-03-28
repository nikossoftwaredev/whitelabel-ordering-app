import { type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/redis";

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

// API rate limiter: 60 requests per 1 minute per token
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:api",
});

// Auth rate limiter: 10 requests per 15 minutes per token
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  prefix: "rl:auth",
});

// Order creation limiter: 10 orders per minute per user
export const orderLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:order",
});

// Checkout limiter: 5 attempts per minute per user
export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:checkout",
});
