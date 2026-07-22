import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { submitRanking } from "@/lib/game";

const schema = z.object({
  orderedGuessIds: z.array(z.string()).min(0),
  nobodyGotIt: z.boolean().default(false),
});

type Params = { params: Promise<{ roundId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { roundId } = await params;
    const body = schema.parse(await request.json());
    await submitRanking(roundId, userId, body.orderedGuessIds, body.nobodyGotIt);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}