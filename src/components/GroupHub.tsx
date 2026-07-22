"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/themes";

type Member = {
  userId: string;
  displayName: string;
  scoreTotal: number;
  role: string;
};

type Round = {
  id: string;
  phase: string;
  drawerId: string;
  drawerName: string | null;
  phaseDeadlineAt: string;
  drawingDataUrl: string | null;
  prompt?: string;
  myGuess: { text: string } | null;
};

type Payload = {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    theme: Theme;
    pausedAt: string | null;
  };
  members: Member[];
  round: Round | null;
  me: string;
};

export function GroupHub({ groupId }: { groupId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (!res.ok) {
      setError("Could not load group");
      return;
    }
    setData(await res.json());
  }, [groupId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function togglePause() {
    if (!data) return;
    setBusy(true);
    try {
      await fetch(`/api/groups/${groupId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: data.group.pausedAt ? "resume" : "pause",
        }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function startRound() {
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!data) return;
    await navigator.clipboard.writeText(data.group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function setTheme(theme: Theme) {
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_theme", theme }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return <p className="text-[var(--coral)]">{error}</p>;
  }

  if (!data) {
    return <p className="text-[var(--ink-muted)]">Loading…</p>;
  }

  const { group, members, round, me } = data;
  const paused = Boolean(group.pausedAt);
  const isDrawer = round?.drawerId === me;
  const needsPlayers = members.length < 2;

  let action: { href: string; label: string } | null = null;
  if (round && !paused) {
    if (round.phase === "drawing" && isDrawer) {
      action = { href: `/groups/${groupId}/draw`, label: "Draw now" };
    } else if (round.phase === "guessing" && !isDrawer && !round.myGuess) {
      action = { href: `/groups/${groupId}/guess`, label: "Guess now" };
    } else if (round.phase === "ranking" && isDrawer) {
      action = { href: `/groups/${groupId}/rank`, label: "Rank guesses" };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-float-in">
        <Link href="/" className="text-sm text-[var(--ink-muted)]">
          ← Groups
        </Link>
        <h1 className="font-display text-4xl mt-2">{group.name}</h1>
        <p className="mt-1 text-sm text-[var(--accent)]">
          {THEME_LABELS[group.theme] ?? group.theme} prompts
        </p>
        <button
          type="button"
          onClick={copyCode}
          className="mt-2 text-sm text-[var(--ink-muted)] underline"
        >
          Invite {group.inviteCode}
          {copied ? " — copied!" : ""}
        </button>
      </header>

      <section className="card-panel animate-float-in" style={{ animationDelay: "40ms" }}>
        {needsPlayers ? (
          <div>
            <p className="font-display text-xl mb-1">Waiting for friends</p>
            <p className="text-sm text-[var(--ink-muted)]">
              Share the invite code. A round starts automatically when a second
              player joins.
            </p>
          </div>
        ) : !round ? (
          <div className="flex flex-col gap-3">
            <p className="font-display text-xl">Ready to play</p>
            <button
              type="button"
              className="btn-primary"
              disabled={busy || paused}
              onClick={startRound}
            >
              Start first round
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  Phase: {round.phase.replace(/_/g, " ")}
                </p>
                <p className="font-display text-2xl mt-1">
                  {isDrawer ? "You're the drawer" : `${round.drawerName} is drawing`}
                </p>
              </div>
              <DeadlineCountdown
                deadline={round.phaseDeadlineAt}
                paused={paused}
              />
            </div>
            {round.phase === "drawing" && isDrawer && round.prompt && (
              <p className="rounded-lg bg-[var(--ink)]/5 px-3 py-2 text-sm">
                Secret prompt:{" "}
                <strong className="font-display text-lg">{round.prompt}</strong>
              </p>
            )}
            {round.phase === "guessing" && round.myGuess && (
              <p className="text-sm text-[var(--ink-muted)]">
                Your guess: <em>{round.myGuess.text}</em> — waiting on others.
              </p>
            )}
            {action && (
              <Link
                href={action.href}
                className="btn-primary text-center animate-pulse-soft"
              >
                {action.label}
              </Link>
            )}
            {!action && round.phase === "guessing" && isDrawer && (
              <p className="text-sm text-[var(--ink-muted)]">
                Waiting for friends to guess…
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex gap-3">
        <button
          type="button"
          className="btn-ghost flex-1"
          disabled={busy}
          onClick={togglePause}
        >
          {paused ? "Resume session" : "Pause session"}
        </button>
      </section>

      <section className="card-panel animate-float-in" style={{ animationDelay: "60ms" }}>
        <h2 className="font-display text-xl mb-1">Theme</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-3">
          Applies to the next round&apos;s secret prompt.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              disabled={busy}
              onClick={() => setTheme(t)}
              className={
                group.theme === t
                  ? "btn-primary py-2 text-sm"
                  : "btn-ghost py-2 text-sm"
              }
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </section>

      <section className="card-panel animate-float-in" style={{ animationDelay: "80ms" }}>
        <h2 className="font-display text-xl mb-3">Scoreboard</h2>
        <ol className="flex flex-col gap-2">
          {members.map((m, i) => (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-3 border-b border-[var(--ink)]/8 pb-2 last:border-0"
            >
              <span>
                <span className="text-[var(--accent)] mr-2">{i + 1}.</span>
                {m.displayName}
                {m.userId === me ? " (you)" : ""}
              </span>
              <span className="tabular-nums font-semibold">{m.scoreTotal}</span>
            </li>
          ))}
        </ol>
      </section>

      {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
    </div>
  );
}