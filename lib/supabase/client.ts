"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client for Supabase Realtime subscriptions
let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        heartbeatIntervalMs: 25000,
      },
    });
  }
  return client;
}
