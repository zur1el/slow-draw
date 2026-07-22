import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { startNextRound } from "@/lib/game";

const joinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(16),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { inviteCode } = joinSchema.parse(await request.json());
    const code = inviteCode.toUpperCase();

    const group = await db.query.groups.findFirst({
      where: eq(groups.inviteCode, code),
    });
    if (!group) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    const already = await db.query.groupMembers.findFirst({
      where: (m, { and, eq: e }) => and(e(m.groupId, group.id), e(m.userId, userId)),
    });
    if (already) {
      return NextResponse.json({ id: group.id });
    }

    await db.insert(groupMembers).values({
      id: createId(),
      groupId: group.id,
      userId,
      role: "member",
      scoreTotal: 0,
    });

    // Auto-start first round when a second player joins
    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));

    if (members.length === 2 && !group.currentRoundId) {
      try {
        await startNextRound(group.id);
      } catch (err) {
        console.error("Failed to start first round", err);
      }
    }

    return NextResponse.json({ id: group.id });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}