"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotifyToggle() {
  const [status, setStatus] = useState<"unknown" | "off" | "on" | "denied" | "unsupported">(
    "unknown",
  );
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !publicKey) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    });
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      setStatus("on");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        Push notifications aren&apos;t available here. On iOS, add this app to your
        Home Screen first.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-[var(--coral)]">
        Notifications are blocked in browser settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--ink-muted)]">
        Get alerts when it&apos;s your turn to draw, guess, or rank.
      </p>
      {status === "on" ? (
        <button type="button" className="btn-ghost" disabled={busy} onClick={disable}>
          Disable notifications
        </button>
      ) : (
        <button type="button" className="btn-primary" disabled={busy} onClick={enable}>
          Enable notifications
        </button>
      )}
    </div>
  );
}