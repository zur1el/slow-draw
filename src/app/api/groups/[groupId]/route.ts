import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { guesses, groupMembers, groups, rounds, users } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { assertMember, startNextRound } from "@/lib/game";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { groupId } = await params;
    await assertMember(groupId, userId);

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const members = await db
      .select({
        userId: groupMembers.userId,
        displayName: users.displayName,
        imageUrl: users.imageUrl,
        scoreTotal: groupMembers.scoreTotal,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(groupMembers.scoreTotal));

    // Highest score first for scoreboard
    members.sort((a, b) => b.scoreTotal - a.scoreTotal);

    let round = null;
    let roundGuesses: Array<{
      id: string;
      userId: string;
      text: string;
      rank: number | null;
      pointsAwarded: number | null;
      displayName: string;
    }> = [];

    if (group.currentRoundId) {
      round = await db.query.rounds.findFirst({
        where: eq(rounds.id, group.currentRoundId),
      });
      if (round) {
        const rows = await db
          .select({
            id: guesses.id,
            userId: guesses.userId,
            text: guesses.text,
            rank: guesses.rank,
            pointsAwarded: guesses.pointsAwarded,
            displayName: users.displayName,
          })
          .from(guesses)
          .innerJoin(users, eq(users.id, guesses.userId))
          .where(eq(guesses.roundId, round.id));
        roundGuesses = rows;
      }
    }

    const drawerName = round
      ? members.find((m) => m.userId === round!.drawerId)?.displayName ?? "Someone"
      : null;

    // Hide prompt unless viewer is the drawer
    const safeRound = round
      ? {
          id: round.id,
          phase: round.phase,
          drawerId: round.drawerId,
          drawerName,
          phaseDeadlineAt: round.phaseDeadlineAt,
          drawingDataUrl: round.drawingDataUrl,
          prompt: round.drawerId === userId ? round.prompt : undefined,
          drawerPoints: round.drawerPoints,
          nobodyGotIt: round.nobodyGotIt,
          myGuess: roundGuesses.find((g) => g.userId === userId) ?? null,
          guesses:
            round.phase === "ranking" || round.phase === "scored"
              ? round.drawerId === userId || round.phase === "scored"
                ? roundGuesses
                : roundGuesses.map((g) => ({
                    ...g,
                    text: g.userId === userId ? g.text : "••••",
                  }))
              : roundGuesses.map((g) => ({
                  id: g.id,
                  userId: g.userId,
                  displayName: g.displayName,
                  text: g.userId === userId ? g.text : undefined,
                  rank: null,
                  pointsAwarded: null,
                })),
        }
      : null;

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        theme: group.theme,
        pausedAt: group.pausedAt,
        currentRoundId: group.currentRoundId,
      },
      members,
      round: safeRound,
      me: userId,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "NOT_A_MEMBER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { groupId } = await params;
    await assertMember(groupId, userId);
    const body = (await request.json()) as {
      action?: string;
      theme?: string;
    };

    if (body.action === "start") {
      const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
      if (group?.currentRoundId) {
        const round = await db.query.rounds.findFirst({
          where: eq(rounds.id, group.currentRoundId),
        });
        if (round && round.phase !== "scored" && round.phase !== "timed_out_draw") {
          return NextResponse.json({ error: "Round already active" }, { status: 400 });
        }
      }
      const roundId = await startNextRound(groupId);
      return NextResponse.json({ roundId });
    }

    if (body.action === "set_theme") {
      const { isTheme } = await import("@/lib/themes");
      if (!body.theme || !isTheme(body.theme)) {
        return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
      }
      await db
        .update(groups)
        .set({ theme: body.theme })
        .where(eq(groups.id, groupId));
      return NextResponse.json({ ok: true, theme: body.theme });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}