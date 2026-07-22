import {
  DRAWER_PENALTY,
  DRAWER_POINTS_PER_UNDERSTOOD,
  GUESSER_BASE_POINTS,
} from "@/lib/config";

export type RankedGuess = {
  guessId: string;
  userId: string;
  rank: number; // 1 = closest
};

/**
 * Guesser points: rank r (1 = closest) → max(0, N - r) * base.
 * Last place always gets 0.
 */
export function guesserPoints(rank: number, guessCount: number): number {
  return Math.max(0, guessCount - rank) * GUESSER_BASE_POINTS;
}

/**
 * Drawer points from how many guesses were "understood".
 * By default ranks 1..(N-1) count; last place does not.
 * If nobodyGotIt is true, K = 0 → penalty.
 */
export function drawerPoints(
  guessCount: number,
  nobodyGotIt: boolean,
): { points: number; understoodCount: number } {
  if (nobodyGotIt || guessCount === 0) {
    return { points: DRAWER_PENALTY, understoodCount: 0 };
  }
  const understoodCount = Math.max(0, guessCount - 1);
  if (understoodCount === 0) {
    return { points: DRAWER_PENALTY, understoodCount: 0 };
  }
  return {
    points: understoodCount * DRAWER_POINTS_PER_UNDERSTOOD,
    understoodCount,
  };
}

export function applyRanks(
  ranks: RankedGuess[],
  nobodyGotIt: boolean,
): {
  guesserAwards: Array<{ guessId: string; userId: string; points: number; rank: number }>;
  drawerAward: { points: number; understoodCount: number };
} {
  const n = ranks.length;
  const guesserAwards = ranks.map((r) => ({
    guessId: r.guessId,
    userId: r.userId,
    rank: r.rank,
    points: nobodyGotIt ? 0 : guesserPoints(r.rank, n),
  }));
  return {
    guesserAwards,
    drawerAward: drawerPoints(n, nobodyGotIt),
  };
}