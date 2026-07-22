import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "@/db";
import { wordBank } from "@/db/schema";
import { createId } from "@/lib/ids";
import type { Theme } from "@/lib/themes";

type Word = { text: string; theme: Theme; difficulty: string };

const WORDS: Word[] = [
  // general
  { text: "cat", theme: "general", difficulty: "easy" },
  { text: "pizza", theme: "general", difficulty: "easy" },
  { text: "umbrella", theme: "general", difficulty: "easy" },
  { text: "bicycle", theme: "general", difficulty: "easy" },
  { text: "sunglasses", theme: "general", difficulty: "easy" },
  { text: "cactus", theme: "general", difficulty: "easy" },
  { text: "snowman", theme: "general", difficulty: "easy" },
  { text: "toothbrush", theme: "general", difficulty: "medium" },
  { text: "lighthouse", theme: "general", difficulty: "medium" },
  { text: "roller coaster", theme: "general", difficulty: "hard" },
  { text: "broken heart", theme: "general", difficulty: "hard" },
  { text: "whisper", theme: "general", difficulty: "hard" },

  // gaming
  { text: "controller", theme: "gaming", difficulty: "easy" },
  { text: "pixel", theme: "gaming", difficulty: "easy" },
  { text: "boss fight", theme: "gaming", difficulty: "easy" },
  { text: "loot chest", theme: "gaming", difficulty: "easy" },
  { text: "respawn", theme: "gaming", difficulty: "medium" },
  { text: "speedrun", theme: "gaming", difficulty: "medium" },
  { text: "final boss", theme: "gaming", difficulty: "medium" },
  { text: "open world", theme: "gaming", difficulty: "medium" },
  { text: "lag spike", theme: "gaming", difficulty: "hard" },
  { text: "rage quit", theme: "gaming", difficulty: "hard" },
  { text: "easter egg", theme: "gaming", difficulty: "hard" },
  { text: "checkpoint", theme: "gaming", difficulty: "easy" },

  // anime
  { text: "katana", theme: "anime", difficulty: "easy" },
  { text: "ramen", theme: "anime", difficulty: "easy" },
  { text: "mecha", theme: "anime", difficulty: "easy" },
  { text: "shonen hero", theme: "anime", difficulty: "medium" },
  { text: "power up", theme: "anime", difficulty: "easy" },
  { text: "spirit world", theme: "anime", difficulty: "medium" },
  { text: "transformation", theme: "anime", difficulty: "medium" },
  { text: "training montage", theme: "anime", difficulty: "hard" },
  { text: "rival duel", theme: "anime", difficulty: "medium" },
  { text: "giant robot", theme: "anime", difficulty: "easy" },
  { text: "magic circle", theme: "anime", difficulty: "medium" },
  { text: "found family", theme: "anime", difficulty: "hard" },

  // movies
  { text: "red carpet", theme: "movies", difficulty: "easy" },
  { text: "popcorn", theme: "movies", difficulty: "easy" },
  { text: "spaceship", theme: "movies", difficulty: "easy" },
  { text: "car chase", theme: "movies", difficulty: "easy" },
  { text: "time travel", theme: "movies", difficulty: "medium" },
  { text: "secret agent", theme: "movies", difficulty: "medium" },
  { text: "romantic dinner", theme: "movies", difficulty: "medium" },
  { text: "zombie outbreak", theme: "movies", difficulty: "medium" },
  { text: "plot twist", theme: "movies", difficulty: "hard" },
  { text: "director chair", theme: "movies", difficulty: "hard" },
  { text: "cliffhanger", theme: "movies", difficulty: "hard" },
  { text: "superhero cape", theme: "movies", difficulty: "easy" },

  // kids
  { text: "dinosaur", theme: "kids", difficulty: "easy" },
  { text: "rainbow", theme: "kids", difficulty: "easy" },
  { text: "teddy bear", theme: "kids", difficulty: "easy" },
  { text: "ice cream", theme: "kids", difficulty: "easy" },
  { text: "butterfly", theme: "kids", difficulty: "easy" },
  { text: "playground", theme: "kids", difficulty: "easy" },
  { text: "pirate ship", theme: "kids", difficulty: "medium" },
  { text: "fairy wand", theme: "kids", difficulty: "medium" },
  { text: "birthday cake", theme: "kids", difficulty: "easy" },
  { text: "school bus", theme: "kids", difficulty: "easy" },
  { text: "treasure map", theme: "kids", difficulty: "medium" },
  { text: "bubble bath", theme: "kids", difficulty: "medium" },

  // science
  { text: "atom", theme: "science", difficulty: "easy" },
  { text: "dinosaur fossil", theme: "science", difficulty: "easy" },
  { text: "telescope", theme: "science", difficulty: "easy" },
  { text: "volcano", theme: "science", difficulty: "easy" },
  { text: "microscope", theme: "science", difficulty: "medium" },
  { text: "black hole", theme: "science", difficulty: "medium" },
  { text: "DNA helix", theme: "science", difficulty: "medium" },
  { text: "robot arm", theme: "science", difficulty: "medium" },
  { text: "solar system", theme: "science", difficulty: "easy" },
  { text: "chemical reaction", theme: "science", difficulty: "hard" },
  { text: "magnet", theme: "science", difficulty: "easy" },
  { text: "gravity", theme: "science", difficulty: "hard" },
];

async function seed() {
  for (const w of WORDS) {
    await db
      .insert(wordBank)
      .values({
        id: createId(),
        text: w.text,
        theme: w.theme,
        difficulty: w.difficulty,
      })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${WORDS.length} words across themes`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
