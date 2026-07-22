import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { submitGuess } from "@/lib/game";

const schema = z.object({
  text: z.string().trim().min(1).max(80),
});

type Params = { params: Promise<{ roundId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { roundId } = await params;
    const { text } = schema.parse(await request.json());
    await submitGuess(roundId, userId, text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}