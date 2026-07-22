import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { submitDrawing } from "@/lib/game";
import type { Stroke } from "@/db/schema";

const schema = z.object({
  drawingDataUrl: z.string().min(20),
  strokes: z.array(
    z.object({
      color: z.string(),
      width: z.number(),
      points: z.array(z.object({ x: z.number(), y: z.number() })),
    }),
  ),
});

type Params = { params: Promise<{ roundId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { roundId } = await params;
    const body = schema.parse(await request.json());
    await submitDrawing(
      roundId,
      userId,
      body.drawingDataUrl,
      body.strokes as Stroke[],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}