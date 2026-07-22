"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/themes";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<Theme>("general");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/groups/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-8">
      <Link href="/" className="text-sm text-[var(--ink-muted)] mb-6">
        ← Back
      </Link>
      <h1 className="font-display text-3xl mb-2">New group</h1>
      <p className="text-sm text-[var(--ink-muted)] mb-6">
        Pick a theme for prompts. You can change it later.
      </p>
      <form onSubmit={onSubmit} className="card-panel flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Group name
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday sketch crew"
            minLength={2}
            maxLength={48}
            required
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium mb-2">Theme</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={
                  theme === t
                    ? "btn-primary py-2 text-sm"
                    : "btn-ghost py-2 text-sm"
                }
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create group"}
        </button>
      </form>
    </main>
  );
}