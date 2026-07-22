import { applyRanks, drawerPoints, guesserPoints } from "../src/lib/scoring";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(guesserPoints(1, 4) === 30, "rank1");
assert(guesserPoints(2, 4) === 20, "rank2");
assert(guesserPoints(3, 4) === 10, "rank3");
assert(guesserPoints(4, 4) === 0, "rank4");

assert(drawerPoints(4, false).points === 30, "drawer understood 3");
assert(drawerPoints(4, true).points === -15, "drawer nobody");
assert(drawerPoints(0, false).points === -15, "no guesses");
assert(drawerPoints(1, false).points === -15, "only last place");

const ranked = applyRanks(
  [
    { guessId: "a", userId: "1", rank: 1 },
    { guessId: "b", userId: "2", rank: 2 },
  ],
  false,
);
assert(ranked.guesserAwards[0]!.points === 10, "2p first");
assert(ranked.guesserAwards[1]!.points === 0, "2p last");
assert(ranked.drawerAward.points === 10, "2p drawer");

console.log("scoring ok");