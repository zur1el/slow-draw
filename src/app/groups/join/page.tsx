"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinGroupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
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
      <h1 className="font-display text-3xl mb-2">Join a group</h1>
      <p className="text-sm text-[var(--ink-muted)] mb-6">
        Enter the invite code a friend shared with you.
      </p>
      <form onSubmit={onSubmit} className="card-panel flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Invite code
          <input
            className="input-field uppercase tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            minLength={4}
            maxLength={16}
            required
          />
        </label>
        {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Joining…" : "Join group"}
        </button>
      </form>
    </main>
  );
}