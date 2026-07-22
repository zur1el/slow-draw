import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { notificationsLog, pushSubscriptions } from "@/db/schema";
import { createId } from "@/lib/ids";

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  kind: string;
  roundId?: string;
};

export async function notifyUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return;
  if (!configureVapid()) {
    console.warn("VAPID keys missing — skipping push");
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  for (const userId of userIds) {
    if (payload.roundId) {
      try {
        await db.insert(notificationsLog).values({
          id: createId(),
          userId,
          roundId: payload.roundId,
          kind: payload.kind,
        });
      } catch {
        // Already sent this kind for this round
        continue;
      }
    }

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: `${baseUrl}${payload.url}`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error("Push failed", err);
        }
      }
    }
  }
}

export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
) {
  await db
    .insert(pushSubscriptions)
    .values({
      id: createId(),
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}