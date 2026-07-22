"use client";

import { motion } from "framer-motion";

/** Decorative sketch pad — visual product anchor for the hero */
export function SketchHeroArt() {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-sm"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[var(--surface)] shadow-[0_24px_60px_rgba(26,58,74,0.18)]" />
      <div
        className="absolute inset-3 border border-[var(--ink)]/10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(26,58,74,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(26,58,74,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <motion.path
          d="M80 190 C 110 80, 170 70, 200 140 C 230 210, 280 200, 320 110"
          stroke="#1a3a4a"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
        <motion.path
          d="M95 210 C 140 160, 190 220, 240 165 C 280 120, 300 175, 330 155"
          stroke="#c45c26"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.8, delay: 0.6, ease: "easeInOut" }}
        />
        <motion.circle
          cx="200"
          cy="95"
          r="18"
          stroke="#2a7a5a"
          strokeWidth="2.5"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
        />
      </svg>
      <motion.div
        className="absolute bottom-5 right-5 h-10 w-10 rounded-full bg-[var(--ink)]"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      />
    </div>
  );
}