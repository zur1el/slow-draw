"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GroupRow = {
  id: string;
  name: string;
  inviteCode: string;
  theme?: string;
  pausedAt: string | null;
  scoreTotal: number;
};

export function GroupList() {
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load groups");
        return r.json();
      })
      .then((data) => setGroups(data.groups))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <p className="text-sm text-[var(--coral)]">
        Couldn&apos;t load groups. Check your database connection.
      </p>
    );
  }

  if (!groups) {
    return <p className="text-sm text-[var(--ink-muted)]">Loading groups…</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="card-panel text-center">
        <p className="font-display text-xl mb-2">No groups yet</p>
        <p className="text-sm text-[var(--ink-muted)]">
          Create one and share the invite code with friends.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((g) => (
        <li key={g.id}>
          <Link
            href={`/groups/${g.id}`}
            className="card-panel block transition hover:-translate-y-0.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-xl">{g.name}</span>
              <span className="text-sm tabular-nums text-[var(--accent)]">
                {g.scoreTotal} pts
              </span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-[var(--ink-muted)]">
              <span className="capitalize">{g.theme ?? "general"}</span>
              <span>Code {g.inviteCode}</span>
              {g.pausedAt && <span className="text-[var(--accent)]">Paused</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}