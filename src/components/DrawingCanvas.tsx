"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stroke } from "@/db/schema";

type Props = {
  onSubmit: (payload: { drawingDataUrl: string; strokes: Stroke[] }) => Promise<void>;
  disabled?: boolean;
};

export function DrawingCanvas({ onSubmit, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [color, setColor] = useState("#1a3a4a");
  const [width, setWidth] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const drawing = useRef(false);

  const redraw = useCallback((all: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fbf8f1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of all) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.min(parent.clientWidth, 640);
      const h = Math.round(w * 0.75);
      const prev = canvas.toDataURL();
      canvas.width = w;
      canvas.height = h;
      redraw([...strokes, ...(current ? [current] : [])]);
      void prev;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw, strokes, current]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pos(e);
    setCurrent({ color, width, points: [p] });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !current) return;
    const p = pos(e);
    const next = { ...current, points: [...current.points, p] };
    setCurrent(next);
    redraw([...strokes, next]);
  }

  function onPointerUp() {
    if (!drawing.current || !current) return;
    drawing.current = false;
    setStrokes((s) => [...s, current]);
    setCurrent(null);
  }

  async function handleSubmit() {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        drawingDataUrl: canvas.toDataURL("image/png"),
        strokes,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border-2 border-[var(--ink)]/15 bg-[var(--paper)] shadow-[0_8px_0_rgba(26,58,74,0.08)]">
        <canvas
          ref={canvasRef}
          className="touch-none block w-full cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {["#1a3a4a", "#c45c26", "#2a7a5a", "#1a1a1a"].map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            className="h-8 w-8 rounded-full border-2 border-white shadow"
            style={{
              background: c,
              outline: color === c ? "2px solid var(--ink)" : undefined,
              outlineOffset: 2,
            }}
            onClick={() => setColor(c)}
          />
        ))}
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          Size
          <input
            type="range"
            min={2}
            max={16}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="ml-auto text-sm underline text-[var(--ink-muted)]"
          onClick={() => {
            setStrokes([]);
            setCurrent(null);
            redraw([]);
          }}
        >
          Clear
        </button>
      </div>
      <button
        type="button"
        disabled={disabled || submitting || strokes.length === 0}
        onClick={handleSubmit}
        className="btn-primary"
      >
        {submitting ? "Sending…" : "Submit drawing"}
      </button>
    </div>
  );
}