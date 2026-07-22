import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roundPhaseEnum = pgEnum("round_phase", [
  "drawing",
  "guessing",
  "ranking",
  "scored",
  "timed_out_draw",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  displayName: text("display_name").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  /** Prompt pack: general | gaming | anime | movies | kids | science */
  theme: text("theme").notNull().default("general"),
  currentRoundId: text("current_round_id"),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  drawerIndex: integer("drawer_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().default("member"), // owner | member
    scoreTotal: integer("score_total").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("group_members_group_user").on(t.groupId, t.userId)],
);

export const wordBank = pgTable(
  "word_bank",
  {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
    theme: text("theme").notNull().default("general"),
    difficulty: text("difficulty").notNull().default("easy"),
  },
  (t) => [unique("word_bank_text_theme").on(t.text, t.theme)],
);

export const rounds = pgTable("rounds", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  drawerId: text("drawer_id")
    .notNull()
    .references(() => users.id),
  prompt: text("prompt").notNull(),
  phase: roundPhaseEnum("phase").notNull().default("drawing"),
  drawingDataUrl: text("drawing_data_url"),
  drawingStrokes: jsonb("drawing_strokes").$type<Stroke[] | null>(),
  phaseDeadlineAt: timestamp("phase_deadline_at", { withTimezone: true }).notNull(),
  /** Remaining ms on the active phase when the group was paused */
  pausedRemainingMs: integer("paused_remaining_ms"),
  nobodyGotIt: boolean("nobody_got_it").default(false),
  drawerPoints: integer("drawer_points"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
});

export type StrokePoint = { x: number; y: number };
export type Stroke = {
  color: string;
  width: number;
  points: StrokePoint[];
};

export const guesses = pgTable(
  "guesses",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    rank: integer("rank"),
    pointsAwarded: integer("points_awarded"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("guesses_round_user").on(t.roundId, t.userId)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("push_endpoint").on(t.endpoint)],
);

export const notificationsLog = pgTable(
  "notifications_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roundId: text("round_id").references(() => rounds.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("notif_dedupe").on(t.userId, t.roundId, t.kind)],
);