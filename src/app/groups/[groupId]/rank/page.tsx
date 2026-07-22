"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { RankGuesses } from "@/components/RankGuesses";

type Guess = {
  id: string;
  userId: string;
  text: string;
  displayName: string;
};

type RoundInfo = {
  id: string;
  phase: string;
  drawerId: string;
  prompt?: string;
  drawingDataUrl: string | null;
  phaseDeadlineAt: string;
  guesses: Guess[];
};

export default function RankPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (!res.ok) {
      setError("Failed to load");
      return;
    }
    const data = await res.json();
    setMe(data.me);
    setPaused(Boolean(data.group.pausedAt));
    setRound(data.round);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(orderedIds: string[], nobodyGotIt: boolean) {
    if (!round) return;
    const res = await fetch(`/api/rounds/${round.id}/rank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedGuessIds: orderedIds, nobodyGotIt }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Failed");
    router.push(`/groups/${groupId}`);
  }

  if (!round || !me) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="text-[var(--ink-muted)]">Loading…</p>
      </main>
    );
  }

  if (round.drawerId !== me || round.phase !== "ranking") {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="mb-4">Ranking isn&apos;t available for you right now.</p>
        <Link href={`/groups/${groupId}`} className="btn-ghost">
          Back to group
        </Link>
      </main>
    );
  }

  const guesses = (round.guesses ?? []).filter(
    (g): g is Guess => Boolean(g.id && g.text),
  );

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-8">
      <Link href={`/groups/${groupId}`} className="text-sm text-[var(--ink-muted)] mb-4">
        ← Group
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Rank guesses</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Prompt was: <strong>{round.prompt}</strong>
          </p>
        </div>
        <DeadlineCountdown deadline={round.phaseDeadlineAt} paused={paused} />
      </div>

      {round.drawingDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={round.drawingDataUrl}
          alt="Your drawing"
          className="mb-4 w-full rounded-xl border border-[var(--ink)]/10"
        />
      )}

      {paused ? (
        <p className="card-panel text-[var(--accent)]">Session paused.</p>
      ) : (
        <RankGuesses guesses={guesses} onSubmit={onSubmit} />
      )}
      {error && <p className="text-sm text-[var(--coral)] mt-3">{error}</p>}
    </main>
  );
}