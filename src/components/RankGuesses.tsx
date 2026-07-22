"use client";

import { useState } from "react";

type Guess = {
  id: string;
  userId: string;
  text: string;
  displayName: string;
};

type Props = {
  guesses: Guess[];
  onSubmit: (orderedIds: string[], nobodyGotIt: boolean) => Promise<void>;
};

export function RankGuesses({ guesses, onSubmit }: Props) {
  const [order, setOrder] = useState(guesses.map((g) => g.id));
  const [nobody, setNobody] = useState(false);
  const [busy, setBusy] = useState(false);

  function move(id: string, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  async function handleSubmit() {
    setBusy(true);
    try {
      await onSubmit(order, nobody);
    } finally {
      setBusy(false);
    }
  }

  const byId = Object.fromEntries(guesses.map((g) => [g.id, g]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--ink-muted)]">
        Rank closest first. Last place gets no points. Toggle “nobody got it” to
        penalize yourself and zero out guessers.
      </p>
      <ul className="flex flex-col gap-2">
        {order.map((id, index) => {
          const g = byId[id]!;
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-[var(--ink)]/10 bg-white/70 px-3 py-2"
            >
              <span className="font-display text-lg text-[var(--accent)] w-6">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{g.text}</div>
                <div className="text-xs text-[var(--ink-muted)]">{g.displayName}</div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-sm"
                  onClick={() => move(id, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-sm"
                  onClick={() => move(id, 1)}
                  disabled={index === order.length - 1}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {guesses.length === 0 && (
        <p className="text-[var(--ink-muted)]">No guesses this round.</p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={nobody}
          onChange={(e) => setNobody(e.target.checked)}
        />
        Nobody got it (drawer penalty)
      </label>
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={handleSubmit}
      >
        {busy ? "Scoring…" : "Confirm ranks & score"}
      </button>
    </div>
  );
}