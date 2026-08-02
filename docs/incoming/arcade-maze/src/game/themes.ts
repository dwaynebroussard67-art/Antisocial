export type LevelId = "streets" | "block" | "crib";

export interface LevelTheme {
  id: LevelId;
  name: string;
  subtitle: string;
  tagline: string;
  playerLabel: string;
  ghostLabel: string;
  dotLabel: string;
  pelletLabel: string;
  readyLabel: string;
  frightenedLabel: string;
  livesLabel: string;
  caughtLabel: string;
  winLabel: string;
  gameOverLabel: string;
  emoji: string;
  colors: {
    bgFrom: string;
    bgTo: string;
    wall: string;
    wallEmissive: string;
    floor: string;
    dot: string;
    pellet: string;
    player: string;
    playerAccent: string;
    ghosts: [string, string, string, string];
    frightened: string;
    frightenedFlash: string;
    hudAccent: string;
  };
}

export const STREETS_THEME: LevelTheme = {
  id: "streets",
  name: "The Grind",
  subtitle: "Classic 2D",
  tagline: "Run the maze, collect every stack, and keep moving. A clean retro arcade experience.",
  playerLabel: "Runner",
  ghostLabel: "Chasers",
  dotLabel: "stacks",
  pelletLabel: "getaway boost",
  readyLabel: "MAKE YOUR RUN!",
  frightenedLabel: "CHASERS BACK OFF!",
  livesLabel: "Runs",
  caughtLabel: "CAUGHT!",
  winLabel: "RUN COMPLETE!",
  gameOverLabel: "RUN OVER",
  emoji: "💵",
  colors: {
    bgFrom: "#000000", bgTo: "#000000", wall: "#2121ff", wallEmissive: "#4d4dff",
    floor: "#000000", dot: "#ffcc99", pellet: "#ffffff", player: "#ffe600",
    playerAccent: "#000000", ghosts: ["#ff0000", "#ffb8de", "#00ffff", "#ffb852"],
    frightened: "#1c39bb", frightenedFlash: "#ffffff", hudAccent: "#ffe600",
  },
};

export const BLOCK_THEME: LevelTheme = {
  id: "block",
  name: "Grind City",
  subtitle: "Full 3D",
  tagline: "The same fast maze-chase action, rebuilt in full 3D with depth, motion, and atmosphere.",
  playerLabel: "Runner",
  ghostLabel: "Chasers",
  dotLabel: "stacks",
  pelletLabel: "getaway boost",
  readyLabel: "RUN THE CITY!",
  frightenedLabel: "CHASERS BACK OFF!",
  livesLabel: "Runs",
  caughtLabel: "CAUGHT!",
  winLabel: "CITY CLEARED!",
  gameOverLabel: "RUN OVER",
  emoji: "💰",
  colors: {
    bgFrom: "#0a0a2a", bgTo: "#000010", wall: "#2233ee", wallEmissive: "#5566ff",
    floor: "#050514", dot: "#ffd27a", pellet: "#fff275", player: "#ffe600",
    playerAccent: "#0a0a0a", ghosts: ["#ff3b3b", "#ff9de6", "#3bf0ff", "#ffb852"],
    frightened: "#26339e", frightenedFlash: "#ffffff", hudAccent: "#ffe600",
  },
};

export const CRIB_THEME: LevelTheme = {
  id: "crib",
  name: "Trap Man",
  subtitle: "The Crib Exclusive",
  tagline: "The heat is on. Collect every stack before the police close in, then use your getaway boost to turn the chase around.",
  playerLabel: "The Runner",
  ghostLabel: "Police",
  dotLabel: "cash",
  pelletLabel: "getaway boost",
  readyLabel: "GET THE BAG!",
  frightenedLabel: "THE HEAT IS OFF!",
  livesLabel: "Getaways",
  caughtLabel: "BUSTED!",
  winLabel: "BAG SECURED!",
  gameOverLabel: "RUN ENDED",
  emoji: "🚓",
  colors: {
    bgFrom: "#1a0a0a", bgTo: "#050202", wall: "#7a2c1d", wallEmissive: "#ff5a2d",
    floor: "#0a0505", dot: "#2ecc71", pellet: "#f2c14e", player: "#c9a227",
    playerAccent: "#1a1a1a", ghosts: ["#1d4ed8", "#1d4ed8", "#1d4ed8", "#1d4ed8"],
    frightened: "#4b0082", frightenedFlash: "#ffffff", hudAccent: "#f2c14e",
  },
};

export const THEMES = {
  streets: STREETS_THEME,
  block: BLOCK_THEME,
  crib: CRIB_THEME,
} satisfies Record<LevelId, LevelTheme>;
