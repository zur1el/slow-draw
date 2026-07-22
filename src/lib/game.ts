import { and, asc, count, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  guesses,
  groupMembers,
  groups,
  rounds,
  wordBank,
  type Stroke,
} from "@/db/schema";
import { DRAW_TIMEOUT_PENALTY, PHASE_DURATION_MS } from "@/lib/config";
import { createId } from "@/lib/ids";
import { applyRanks } from "@/lib/scoring";
import { notifyUsers } from "@/lib/push";

async function pickPrompt(theme: string): Promise<string> {
  let words = await db
    .select()
    .from(wordBank)
    .where(eq(wordBank.theme, theme));

  if (words.length === 0) {
    words = await db
      .select()
      .from(wordBank)
      .where(eq(wordBank.theme, "general"));
  }
  if (words.length === 0) {
    return "cat";
  }
  return words[Math.floor(Math.random() * words.length)]!.text;
}

export async function getGroupMembersOrdered(groupId: string) {
  return db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));
}

export async function startNextRound(groupId: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) throw new Error("GROUP_NOT_FOUND");
  if (group.pausedAt) throw new Error("GROUP_PAUSED");

  const members = await getGroupMembersOrdered(groupId);
  if (members.length < 2) throw new Error("NEED_TWO_PLAYERS");

  const drawerIndex = group.drawerIndex % members.length;
  const drawer = members[drawerIndex]!;
  const prompt = await pickPrompt(group.theme ?? "general");
  const roundId = createId();
  const deadline = new Date(Date.now() + PHASE_DURATION_MS);

  await db.insert(rounds).values({
    id: roundId,
    groupId,
    drawerId: drawer.userId,
    prompt,
    phase: "drawing",
    phaseDeadlineAt: deadline,
  });

  await db
    .update(groups)
    .set({
      currentRoundId: roundId,
      drawerIndex: (drawerIndex + 1) % members.length,
    })
    .where(eq(groups.id, groupId));

  await notifyUsers([drawer.userId], {
    title: "Your turn to draw",
    body: `It's your turn in ${group.name}. You have 4 hours.`,
    url: `/groups/${groupId}/draw`,
    kind: "your_turn_draw",
    roundId,
  });

  return roundId;
}

export async function pauseGroup(groupId: string, userId: string) {
  await assertMember(groupId, userId);
  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) throw new Error("GROUP_NOT_FOUND");
  if (group.pausedAt) return;

  const now = new Date();
  if (group.currentRoundId) {
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, group.currentRoundId),
    });
    if (round && round.phase !== "scored" && round.phase !== "timed_out_draw") {
      const remaining = Math.max(0, round.phaseDeadlineAt.getTime() - now.getTime());
      await db
        .update(rounds)
        .set({ pausedRemainingMs: remaining })
        .where(eq(rounds.id, round.id));
    }
  }

  await db.update(groups).set({ pausedAt: now }).where(eq(groups.id, groupId));
}

export async function resumeGroup(groupId: string, userId: string) {
  await assertMember(groupId, userId);
  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group?.pausedAt) return;

  if (group.currentRoundId) {
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, group.currentRoundId),
    });
    if (round?.pausedRemainingMs != null) {
      await db
        .update(rounds)
        .set({
          phaseDeadlineAt: new Date(Date.now() + round.pausedRemainingMs),
          pausedRemainingMs: null,
        })
        .where(eq(rounds.id, round.id));
    }
  }

  await db.update(groups).set({ pausedAt: null }).where(eq(groups.id, groupId));
}

export async function assertMember(groupId: string, userId: string) {
  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  });
  if (!membership) throw new Error("NOT_A_MEMBER");
  return membership;
}

export async function submitDrawing(
  roundId: string,
  userId: string,
  drawingDataUrl: string,
  strokes: Stroke[],
) {
  const round = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
  if (!round) throw new Error("ROUND_NOT_FOUND");
  if (round.drawerId !== userId) throw new Error("NOT_DRAWER");
  if (round.phase !== "drawing") throw new Error("WRONG_PHASE");

  const group = await db.query.groups.findFirst({ where: eq(groups.id, round.groupId) });
  if (group?.pausedAt) throw new Error("GROUP_PAUSED");

  const deadline = new Date(Date.now() + PHASE_DURATION_MS);
  await db
    .update(rounds)
    .set({
      drawingDataUrl,
      drawingStrokes: strokes,
      phase: "guessing",
      phaseDeadlineAt: deadline,
    })
    .where(eq(rounds.id, roundId));

  const members = await getGroupMembersOrdered(round.groupId);
  const guesserIds = members
    .map((m) => m.userId)
    .filter((id) => id !== round.drawerId);

  await notifyUsers(guesserIds, {
    title: "New drawing to guess",
    body: `A drawing is ready in ${group?.name ?? "your group"}. Guess within 4 hours.`,
    url: `/groups/${round.groupId}/guess`,
    kind: "guess_ready",
    roundId,
  });
}

export async function submitGuess(roundId: string, userId: string, text: string) {
  const round = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
  if (!round) throw new Error("ROUND_NOT_FOUND");
  if (round.phase !== "guessing") throw new Error("WRONG_PHASE");
  if (round.drawerId === userId) throw new Error("DRAWER_CANNOT_GUESS");

  await assertMember(round.groupId, userId);
  const group = await db.query.groups.findFirst({ where: eq(groups.id, round.groupId) });
  if (group?.pausedAt) throw new Error("GROUP_PAUSED");

  const trimmed = text.trim();
  if (!trimmed) throw new Error("EMPTY_GUESS");

  await db
    .insert(guesses)
    .values({
      id: createId(),
      roundId,
      userId,
      text: trimmed,
    })
    .onConflictDoUpdate({
      target: [guesses.roundId, guesses.userId],
      set: { text: trimmed },
    });

  await maybeAdvanceToRanking(roundId);
}

async function maybeAdvanceToRanking(roundId: string) {
  const round = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
  if (!round || round.phase !== "guessing") return;

  const members = await getGroupMembersOrdered(round.groupId);
  const guesserCount = members.filter((m) => m.userId !== round.drawerId).length;
  const [{ value: submitted }] = await db
    .select({ value: count() })
    .from(guesses)
    .where(eq(guesses.roundId, roundId));

  if (Number(submitted) < guesserCount) return;

  await enterRanking(round);
}

async function enterRanking(round: typeof rounds.$inferSelect) {
  const deadline = new Date(Date.now() + PHASE_DURATION_MS);
  await db
    .update(rounds)
    .set({ phase: "ranking", phaseDeadlineAt: deadline })
    .where(eq(rounds.id, round.id));

  const group = await db.query.groups.findFirst({ where: eq(groups.id, round.groupId) });
  await notifyUsers([round.drawerId], {
    title: "Time to rank guesses",
    body: `Everyone has guessed in ${group?.name ?? "your group"}. Rank who was closest.`,
    url: `/groups/${round.groupId}/rank`,
    kind: "rank_needed",
    roundId: round.id,
  });
}

export async function submitRanking(
  roundId: string,
  userId: string,
  orderedGuessIds: string[],
  nobodyGotIt: boolean,
) {
  const round = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
  if (!round) throw new Error("ROUND_NOT_FOUND");
  if (round.drawerId !== userId) throw new Error("NOT_DRAWER");
  if (round.phase !== "ranking") throw new Error("WRONG_PHASE");

  const group = await db.query.groups.findFirst({ where: eq(groups.id, round.groupId) });
  if (group?.pausedAt) throw new Error("GROUP_PAUSED");

  const existing = await db.select().from(guesses).where(eq(guesses.roundId, roundId));
  if (existing.length === 0) {
    await finalizeRound(round, [], true);
    return;
  }

  if (orderedGuessIds.length !== existing.length) throw new Error("BAD_RANK_COUNT");
  const idSet = new Set(existing.map((g) => g.id));
  for (const id of orderedGuessIds) {
    if (!idSet.has(id)) throw new Error("BAD_GUESS_ID");
  }

  const ranked = orderedGuessIds.map((guessId, i) => {
    const g = existing.find((x) => x.id === guessId)!;
    return { guessId, userId: g.userId, rank: i + 1 };
  });

  await finalizeRound(round, ranked, nobodyGotIt);
}

async function finalizeRound(
  round: typeof rounds.$inferSelect,
  ranked: Array<{ guessId: string; userId: string; rank: number }>,
  nobodyGotIt: boolean,
) {
  const { guesserAwards, drawerAward } = applyRanks(ranked, nobodyGotIt);

  for (const award of guesserAwards) {
    await db
      .update(guesses)
      .set({ rank: award.rank, pointsAwarded: award.points })
      .where(eq(guesses.id, award.guessId));

    if (award.points !== 0) {
      await db
        .update(groupMembers)
        .set({ scoreTotal: sql`${groupMembers.scoreTotal} + ${award.points}` })
        .where(
          and(
            eq(groupMembers.groupId, round.groupId),
            eq(groupMembers.userId, award.userId),
          ),
        );
    }
  }

  await db
    .update(groupMembers)
    .set({ scoreTotal: sql`${groupMembers.scoreTotal} + ${drawerAward.points}` })
    .where(
      and(
        eq(groupMembers.groupId, round.groupId),
        eq(groupMembers.userId, round.drawerId),
      ),
    );

  await db
    .update(rounds)
    .set({
      phase: "scored",
      nobodyGotIt,
      drawerPoints: drawerAward.points,
      scoredAt: new Date(),
    })
    .where(eq(rounds.id, round.id));

  // Kick off next round automatically
  try {
    await startNextRound(round.groupId);
  } catch {
    // e.g. paused mid-score or <2 players — leave scored
  }
}

export async function processDeadlines() {
  const now = new Date();
  const activeGroups = await db
    .select({ id: groups.id, currentRoundId: groups.currentRoundId })
    .from(groups)
    .where(isNull(groups.pausedAt));

  const roundIds = activeGroups
    .map((g) => g.currentRoundId)
    .filter((id): id is string => Boolean(id));

  if (roundIds.length === 0) return { processed: 0 };

  const due = await db
    .select()
    .from(rounds)
    .where(
      and(
        inArray(rounds.id, roundIds),
        lte(rounds.phaseDeadlineAt, now),
        inArray(rounds.phase, ["drawing", "guessing", "ranking"]),
      ),
    );

  for (const round of due) {
    if (round.phase === "drawing") {
      await handleDrawTimeout(round);
    } else if (round.phase === "guessing") {
      await handleGuessTimeout(round);
    } else if (round.phase === "ranking") {
      await handleRankTimeout(round);
    }
  }

  return { processed: due.length };
}

async function handleDrawTimeout(round: typeof rounds.$inferSelect) {
  await db
    .update(groupMembers)
    .set({ scoreTotal: sql`${groupMembers.scoreTotal} + ${DRAW_TIMEOUT_PENALTY}` })
    .where(
      and(
        eq(groupMembers.groupId, round.groupId),
        eq(groupMembers.userId, round.drawerId),
      ),
    );

  await db
    .update(rounds)
    .set({ phase: "timed_out_draw", drawerPoints: DRAW_TIMEOUT_PENALTY, scoredAt: new Date() })
    .where(eq(rounds.id, round.id));

  try {
    await startNextRound(round.groupId);
  } catch {
    /* ignore */
  }
}

async function handleGuessTimeout(round: typeof rounds.$inferSelect) {
  const existing = await db.select().from(guesses).where(eq(guesses.roundId, round.id));
  if (existing.length === 0) {
    // Nobody guessed — treat as nobody got it, penalize drawer, next round
    await finalizeRound(round, [], true);
    return;
  }
  await enterRanking(round);
}

async function handleRankTimeout(round: typeof rounds.$inferSelect) {
  const existing = await db.select().from(guesses).where(eq(guesses.roundId, round.id));
  // Auto-rank by submission order; last place last
  const ranked = existing
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((g, i) => ({ guessId: g.id, userId: g.userId, rank: i + 1 }));
  await finalizeRound(round, ranked, false);
}

export async function sendDeadlineWarnings() {
  const { DEADLINE_WARNING_MS } = await import("@/lib/config");
  const now = Date.now();
  const windowEnd = new Date(now + DEADLINE_WARNING_MS);
  const windowStart = new Date(now + DEADLINE_WARNING_MS - 60_000);

  const active = await db
    .select({
      round: rounds,
      groupName: groups.name,
    })
    .from(rounds)
    .innerJoin(groups, eq(groups.currentRoundId, rounds.id))
    .where(
      and(
        isNull(groups.pausedAt),
        inArray(rounds.phase, ["drawing", "guessing", "ranking"]),
        lte(rounds.phaseDeadlineAt, windowEnd),
      ),
    );

  for (const { round, groupName } of active) {
    const msLeft = round.phaseDeadlineAt.getTime() - now;
    if (msLeft > DEADLINE_WARNING_MS || msLeft < 0) continue;
    if (round.phaseDeadlineAt.getTime() < windowStart.getTime()) continue;

    if (round.phase === "drawing") {
      await notifyUsers([round.drawerId], {
        title: "Drawing deadline soon",
        body: `About 30 minutes left to draw in ${groupName}.`,
        url: `/groups/${round.groupId}/draw`,
        kind: "deadline_warn_draw",
        roundId: round.id,
      });
    } else if (round.phase === "guessing") {
      const members = await getGroupMembersOrdered(round.groupId);
      const submitted = await db.select().from(guesses).where(eq(guesses.roundId, round.id));
      const submittedIds = new Set(submitted.map((g) => g.userId));
      const pending = members
        .filter((m) => m.userId !== round.drawerId && !submittedIds.has(m.userId))
        .map((m) => m.userId);
      await notifyUsers(pending, {
        title: "Guess deadline soon",
        body: `About 30 minutes left to guess in ${groupName}.`,
        url: `/groups/${round.groupId}/guess`,
        kind: "deadline_warn_guess",
        roundId: round.id,
      });
    } else if (round.phase === "ranking") {
      await notifyUsers([round.drawerId], {
        title: "Ranking deadline soon",
        body: `About 30 minutes left to rank guesses in ${groupName}.`,
        url: `/groups/${round.groupId}/rank`,
        kind: "deadline_warn_rank",
        roundId: round.id,
      });
    }
  }
}