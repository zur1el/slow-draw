import { NextResponse } from "next/server";
import { processDeadlines, sendDeadlineWarnings } from "@/lib/game";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deadlines = await processDeadlines();
    await sendDeadlineWarnings();
    return NextResponse.json({ ok: true, ...deadlines });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}