"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";

type RoundInfo = {
  id: string;
  phase: string;
  drawerId: string;
  drawerName: string | null;
  drawingDataUrl: string | null;
  phaseDeadlineAt: string;
  myGuess: { text: string } | null;
  guesses: Array<{ userId: string; displayName: string; text?: string }>;
};

export default function GuessPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!round) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rounds/${round.id}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!round || !me) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="text-[var(--ink-muted)]">Loading…</p>
      </main>
    );
  }

  if (round.drawerId === me) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="mb-4">You drew this one — wait for guesses.</p>
        <Link href={`/groups/${groupId}`} className="btn-ghost">
          Back to group
        </Link>
      </main>
    );
  }

  if (round.phase !== "guessing") {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="mb-4">Guessing isn&apos;t open right now.</p>
        <Link href={`/groups/${groupId}`} className="btn-ghost">
          Back to group
        </Link>
      </main>
    );
  }

  const pending = round.guesses.filter((g) => !g.text && g.userId !== me);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-8">
      <Link href={`/groups/${groupId}`} className="text-sm text-[var(--ink-muted)] mb-4">
        ← Group
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Guess</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            What did {round.drawerName ?? "they"} draw?
          </p>
        </div>
        <DeadlineCountdown deadline={round.phaseDeadlineAt} paused={paused} />
      </div>

      {round.drawingDataUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl border-2 border-[var(--ink)]/15 bg-[var(--surface)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={round.drawingDataUrl}
            alt="Drawing to guess"
            className="w-full h-auto"
          />
        </div>
      ) : (
        <p className="card-panel mb-4 text-[var(--ink-muted)]">No drawing yet.</p>
      )}

      {round.myGuess ? (
        <div className="card-panel">
          <p className="text-sm text-[var(--ink-muted)]">You already guessed:</p>
          <p className="font-display text-2xl mt-1">{round.myGuess.text}</p>
        </div>
      ) : paused ? (
        <p className="card-panel text-[var(--accent)]">Session paused.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            className="input-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your guess…"
            maxLength={80}
            required
          />
          {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Submit guess"}
          </button>
        </form>
      )}

      <p className="mt-6 text-xs text-[var(--ink-muted)]">
        Guesses in: {round.guesses.filter((g) => g.text || g.userId === me).length}{" "}
        submitted
        {pending.length > 0 ? ` · still waiting on others` : ""}
      </p>
    </main>
  );
}