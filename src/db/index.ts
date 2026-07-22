import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set — database calls will fail until configured.");
}

const client = postgres(connectionString ?? "postgresql://localhost:5432/draw_game", {
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;