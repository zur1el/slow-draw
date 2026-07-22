import Link from "next/link";
import { NotifyToggle } from "@/components/NotifyToggle";
import { InstallHint } from "@/components/InstallHint";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-8">
      <Link href="/" className="text-sm text-[var(--ink-muted)] mb-6">
        ← Home
      </Link>
      <h1 className="font-display text-3xl mb-2">Settings</h1>
      <p className="text-sm text-[var(--ink-muted)] mb-6">
        Install Slow Draw from your browser for a home-screen app. On iPhone,
        use Share → Add to Home Screen to enable Web Push.
      </p>
      <section className="card-panel mb-4">
        <h2 className="font-display text-xl mb-3">Install</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-2">
          Add Slow Draw to your home screen for full-screen play and push support.
        </p>
        <InstallHint />
      </section>
      <section className="card-panel">
        <h2 className="font-display text-xl mb-3">Notifications</h2>
        <NotifyToggle />
      </section>
    </main>
  );
}