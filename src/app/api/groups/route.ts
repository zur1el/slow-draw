import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { createId, createInviteCode } from "@/lib/ids";
import { THEMES } from "@/lib/themes";

const createSchema = z.object({
  name: z.string().trim().min(2).max(48),
  theme: z.enum(THEMES).default("general"),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        inviteCode: groups.inviteCode,
        theme: groups.theme,
        pausedAt: groups.pausedAt,
        currentRoundId: groups.currentRoundId,
        scoreTotal: groupMembers.scoreTotal,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));

    return NextResponse.json({ groups: rows });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to list groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = createSchema.parse(await request.json());
    const groupId = createId();
    const inviteCode = createInviteCode();

    await db.insert(groups).values({
      id: groupId,
      name: body.name,
      inviteCode,
      theme: body.theme,
      createdById: userId,
      drawerIndex: 0,
    });

    await db.insert(groupMembers).values({
      id: createId(),
      groupId,
      userId,
      role: "owner",
      scoreTotal: 0,
    });

    return NextResponse.json({ id: groupId, inviteCode });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}