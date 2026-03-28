import webpush from "web-push";

import { prisma } from "@/lib/db";
import { EMAIL_FROM } from "@/lib/email/resend";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(`mailto:${EMAIL_FROM}`, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  const expired: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expired.push(sub.id);
        }
      }
    })
  );

  if (expired.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: expired } } })
      .catch(() => {});
  }
}

export async function sendPushToAdmins(tenantId: string, payload: PushPayload) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { tenantId, role: "admin" },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length > 0) {
      await sendToSubscriptions(subs, payload);
    }
  } catch {
    // Never crash caller
  }
}

export async function sendPushToCustomer(
  tenantId: string,
  userId: string | null,
  payload: PushPayload
) {
  if (!userId) return;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { tenantId, role: "customer", userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length > 0) {
      await sendToSubscriptions(subs, payload);
    }
  } catch {
    // Never crash caller
  }
}
