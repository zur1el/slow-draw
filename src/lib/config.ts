/** Tunable game constants — change here without touching scoring logic. */

export const PHASE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
export const DEADLINE_WARNING_MS = 30 * 60 * 1000; // 30 minutes before deadline

export const GUESSER_BASE_POINTS = 10;
export const DRAWER_POINTS_PER_UNDERSTOOD = 10;
export const DRAWER_PENALTY = -15;

/** Draw timeout skip penalty when the drawer never submits. */
export const DRAW_TIMEOUT_PENALTY = -10;