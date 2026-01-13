// Shared game constants
export const GAME_MODES = [15, 30] as const;
export type GameMode = typeof GAME_MODES[number];

// Sub-block speed in milliseconds (Etherlink's actual speed)
export const SUB_BLOCK_SPEED_MS = 50;

