import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { GroupList } from "@/components/GroupList";
import { SketchHeroArt } from "@/components/SketchHeroArt";

function Landing() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-10 pt-8 md:px-8">
        {/* First viewport: brand + one line + CTA + art */}
        <section className="flex min-h-[calc(100dvh-4rem)] flex-col justify-between gap-10 py-4 md:grid md:grid-cols-2 md:items-center md:gap-12 md:py-0">
          <div className="animate-float-in">
            <h1 className="font-display text-[clamp(3.5rem,12vw,6.5rem)] leading-[0.9] tracking-tight text-[var(--ink)]">
              Slow Draw
            </h1>
            <p className="mt-5 max-w-sm text-lg text-[var(--ink-muted)] md:text-xl">
              Sketch with friends on your own time — no live rounds, just
              guesses and glory.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SignInButton mode="modal">
                <button type="button" className="btn-primary px-8">
                  Start playing
                </button>
              </SignInButton>
              <a href="#how" className="btn-ghost">
                How it works
              </a>
            </div>
          </div>

          <div
            className="animate-float-in md:justify-self-end"
            style={{ animationDelay: "120ms" }}
          >
            <SketchHeroArt />
          </div>
        </section>

        <section id="how" className="scroll-mt-8 border-t border-[var(--ink)]/10 py-16 md:py-24">
          <h2 className="font-display text-3xl md:text-4xl">How a round works</h2>
          <p className="mt-3 max-w-xl text-[var(--ink-muted)]">
            One drawer. Everyone guesses. The artist decides who was closest.
          </p>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Draw",
                body: "You get a secret prompt and four hours to sketch it. No rush, no live lobby.",
              },
              {
                n: "02",
                title: "Guess",
                body: "Friends type what they see. Pause anytime so nobody burns their deadline.",
              },
              {
                n: "03",
                title: "Rank",
                body: "You rank guesses closest to farthest. Last place gets nothing — clarity pays.",
              },
            ].map((step, i) => (
              <li
                key={step.n}
                className="animate-float-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="font-display text-sm text-[var(--accent)]">
                  {step.n}
                </span>
                <h3 className="font-display mt-2 text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-[var(--ink)]/10 py-8 text-sm text-[var(--ink-muted)]">
          Slow Draw · async sketch nights for friends
        </footer>
      </main>
    </div>
  );
}

function AppHome() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-10">
      <header className="mb-10 flex items-start justify-between gap-4 animate-float-in">
        <div>
          <p className="font-display text-5xl leading-none tracking-tight text-[var(--ink)]">
            Slow Draw
          </p>
          <p className="mt-3 max-w-[18rem] text-[var(--ink-muted)]">
            Your groups and open rounds.
          </p>
        </div>
        <UserButton />
      </header>

      <div
        className="flex flex-col gap-6 animate-float-in"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex gap-3">
          <Link href="/groups/new" className="btn-primary flex-1 text-center">
            New group
          </Link>
          <Link href="/groups/join" className="btn-ghost flex-1 text-center">
            Join
          </Link>
        </div>
        <GroupList />
        <Link
          href="/settings"
          className="text-center text-sm text-[var(--ink-muted)] underline"
        >
          Notification settings
        </Link>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Show when="signed-out" fallback={<AppHome />}>
      <Landing />
    </Show>
  );
}