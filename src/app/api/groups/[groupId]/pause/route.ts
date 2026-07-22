import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { pauseGroup, resumeGroup } from "@/lib/game";

type Params = { params: Promise<{ groupId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { groupId } = await params;
    const { action } = (await request.json()) as { action?: "pause" | "resume" };

    if (action === "pause") {
      await pauseGroup(groupId, userId);
    } else if (action === "resume") {
      await resumeGroup(groupId, userId);
    } else {
      return NextResponse.json({ error: "action must be pause|resume" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}