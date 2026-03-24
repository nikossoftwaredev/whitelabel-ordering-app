const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Broadcast an event via Supabase Realtime REST API.
 * This works from any serverless function — no shared memory needed.
 */
export async function broadcastEvent(
  topic: string,
  event: string,
  payload: Record<string, unknown>
) {
  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic: `realtime:${topic}`, event, payload }],
      }),
    });

    if (!res.ok) {
      console.error(
        `[broadcast] Failed to send "${event}" to "${topic}":`,
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    // Never let a broadcast failure crash the caller (e.g. order creation)
    console.error(`[broadcast] Network error for "${event}" to "${topic}":`, err);
  }
}
