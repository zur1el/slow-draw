"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import type { Stroke } from "@/db/schema";

type RoundInfo = {
  id: string;
  phase: string;
  drawerId: string;
  prompt?: string;
  phaseDeadlineAt: string;
};

export default function DrawPage() {
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

  async function onSubmit(payload: { drawingDataUrl: string; strokes: Stroke[] }) {
    if (!round) return;
    const res = await fetch(`/api/rounds/${round.id}/draw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Failed");
    router.push(`/groups/${groupId}`);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="text-[var(--coral)]">{error}</p>
      </main>
    );
  }

  if (!round || !me) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="text-[var(--ink-muted)]">Loading…</p>
      </main>
    );
  }

  if (round.drawerId !== me || round.phase !== "drawing") {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <p className="mb-4">It&apos;s not your turn to draw.</p>
        <Link href={`/groups/${groupId}`} className="btn-ghost">
          Back to group
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-8">
      <Link href={`/groups/${groupId}`} className="text-sm text-[var(--ink-muted)] mb-4">
        ← Group
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Draw</h1>
          <p className="mt-2 rounded-lg bg-[var(--ink)] text-[var(--surface)] px-3 py-2 inline-block">
            <span className="text-xs opacity-80">Prompt</span>
            <br />
            <span className="font-display text-2xl">{round.prompt}</span>
          </p>
        </div>
        <DeadlineCountdown deadline={round.phaseDeadlineAt} paused={paused} />
      </div>
      {paused ? (
        <p className="card-panel text-[var(--accent)]">
          Session is paused — resume from the group hub to keep drawing.
        </p>
      ) : (
        <DrawingCanvas onSubmit={onSubmit} disabled={paused} />
      )}
    </main>
  );
}