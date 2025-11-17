// Database types for game results
export type GameResult = {
  id?: number;
  player_name: string;
  score: number;
  lps: number; // letters per second
  accuracy: number;
  rank: string;
  time: number; // in seconds
  ms_per_letter: number;
  game_mode: number; // 15, 30, or 60 words
  created_at?: string;
};

// Leaderboard entry type
export type LeaderboardEntry = {
  id: number;
  player_name: string;
  score: number;
  lps: number;
  accuracy: number;
  rank: string;
  time: number;
  ms_per_letter: number;
  game_mode: number;
  created_at: string;
};

