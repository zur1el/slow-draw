import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { removePushSubscription, savePushSubscription } from "@/lib/push";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = subscribeSchema.parse(await request.json());
    await savePushSubscription(userId, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const { endpoint } = z
      .object({ endpoint: z.string() })
      .parse(await request.json());
    await removePushSubscription(userId, endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}