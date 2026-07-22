"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";

export function DeadlineCountdown({
  deadline,
  paused,
}: {
  deadline: string | Date;
  paused?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paused]);

  const end = new Date(deadline).getTime();
  const left = end - now;

  if (paused) {
    return <span className="text-[var(--accent)] font-medium">Paused</span>;
  }

  if (left <= 0) {
    return <span className="text-[var(--coral)] font-medium">Time&apos;s up</span>;
  }

  return (
    <span className="font-medium tabular-nums">
      {formatDistanceToNowStrict(end, { addSuffix: false })} left
    </span>
  );
}