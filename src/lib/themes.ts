export const THEMES = [
  "general",
  "gaming",
  "anime",
  "movies",
  "kids",
  "science",
] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  general: "General",
  gaming: "Gaming",
  anime: "Anime",
  movies: "Movies",
  kids: "Kids",
  science: "Science",
};

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}