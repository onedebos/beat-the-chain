import { supabase } from "./supabase";
import type { GameResult, LeaderboardEntry } from "./types";

/**
 * Get best score from localStorage
 */
export function getLocalBestScore(playerName: string, gameMode: number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `best_score_${playerName}_${gameMode}`;
    const stored = localStorage.getItem(key);
    return stored ? parseFloat(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save best score to localStorage
 */
export function setLocalBestScore(playerName: string, gameMode: number, score: number): void {
  if (typeof window === "undefined") return;
  try {
    const key = `best_score_${playerName}_${gameMode}`;
    localStorage.setItem(key, score.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get the database record ID from localStorage
 */
export function getLocalRecordId(playerName: string, gameMode: number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `record_id_${playerName}_${gameMode}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Save the database record ID to localStorage
 */
export function setLocalRecordId(playerName: string, gameMode: number, id: number): void {
  if (typeof window === "undefined") return;
  try {
    const key = `record_id_${playerName}_${gameMode}`;
    localStorage.setItem(key, id.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Save a game result to the database only if it's better than existing score
 * Also updates localStorage cache
 */
export async function saveGameResult(result: GameResult): Promise<{ success: boolean; error?: string; isNewBest?: boolean; id?: number }> {
  try {
    // Check localStorage first (fast check)
    const localBest = getLocalBestScore(result.player_name, result.game_mode);
    if (localBest !== null && result.score <= localBest) {
      return { success: true, isNewBest: false };
    }

    // Check if we have a stored record ID
    const existingRecordId = getLocalRecordId(result.player_name, result.game_mode);

    if (existingRecordId) {
      // We have an existing record - check if new score is better, then UPDATE
      const bestScoreResult = await getUserBestScore(
        result.player_name,
        result.game_mode
      );

      if (bestScoreResult.data && result.score > bestScoreResult.data.score) {
        // New score is better - UPDATE the existing record
        const { data, error } = await supabase
          .from("game_results")
          .update({
            score: result.score,
            lps: result.lps,
            accuracy: result.accuracy,
            rank: result.rank,
            time: result.time,
            ms_per_letter: result.ms_per_letter,
          })
          .eq("id", existingRecordId)
          .select();

        if (error) {
          console.error("Error updating game result:", error);
          return { success: false, error: error.message };
        }

        // Update localStorage cache
        setLocalBestScore(result.player_name, result.game_mode, result.score);

        const updatedId = data && data[0] ? data[0].id : existingRecordId;
        return { success: true, isNewBest: true, id: updatedId };
      } else {
        // Score not better - don't update
        if (bestScoreResult.data) {
          setLocalBestScore(result.player_name, result.game_mode, bestScoreResult.data.score);
        }
        return { success: true, isNewBest: false, id: existingRecordId };
      }
    } else {
      // No existing record ID - check database for any existing record
      const bestScoreResult = await getUserBestScore(
        result.player_name,
        result.game_mode
      );

      if (bestScoreResult.error && bestScoreResult.error !== "No record found") {
        console.error("Error checking existing score:", bestScoreResult.error);
        // Continue anyway - might be first score
      }

      // Only save if this is a new best score (or first score)
      if (bestScoreResult.data && result.score <= bestScoreResult.data.score) {
        // Not a new best - but store the existing record ID for future updates
        setLocalRecordId(result.player_name, result.game_mode, bestScoreResult.data.id);
        setLocalBestScore(result.player_name, result.game_mode, bestScoreResult.data.score);
        return { success: true, isNewBest: false, id: bestScoreResult.data.id };
      }

      // This is a new best score (or first score) - INSERT it
      const { data, error } = await supabase
        .from("game_results")
        .insert([
          {
            player_name: result.player_name,
            score: result.score,
            lps: result.lps,
            accuracy: result.accuracy,
            rank: result.rank,
            time: result.time,
            ms_per_letter: result.ms_per_letter,
            game_mode: result.game_mode,
          },
        ])
        .select(); // This returns the inserted record(s) with their IDs

      if (error) {
        console.error("Error saving game result:", error);
        return { success: false, error: error.message };
      }

      // Update localStorage cache with both score and ID
      const insertedId = data && data[0] ? data[0].id : undefined;
      if (insertedId) {
        setLocalRecordId(result.player_name, result.game_mode, insertedId);
      }
      setLocalBestScore(result.player_name, result.game_mode, result.score);

      return { success: true, isNewBest: true, id: insertedId };
    }
  } catch (err) {
    console.error("Unexpected error saving game result:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Get leaderboard entries for a specific game mode
 * @param gameMode - The game mode (15, 30, or 60 words)
 * @param limit - Number of entries to return (default: 10)
 */
export async function getLeaderboard(
  gameMode: number,
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("game_mode", gameMode)
      .order("score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return { data: null, error: error.message };
    }

    return { data: data as LeaderboardEntry[] };
  } catch (err) {
    console.error("Unexpected error fetching leaderboard:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get user profile data from localStorage
 * Returns the best score across all game modes
 */
export function getUserProfile(playerName: string): {
  name: string;
  bestScore: number | null;
  bestGameMode: number | null;
  hasProfile: boolean;
} {
  if (typeof window === "undefined") {
    return { name: playerName, bestScore: null, bestGameMode: null, hasProfile: false };
  }

  const gameModes = [15, 30, 60];
  let bestScore: number | null = null;
  let bestGameMode: number | null = null;

  for (const mode of gameModes) {
    const score = getLocalBestScore(playerName, mode);
    if (score !== null && (bestScore === null || score > bestScore)) {
      bestScore = score;
      bestGameMode = mode;
    }
  }

  return {
    name: playerName,
    bestScore,
    bestGameMode,
    hasProfile: bestScore !== null,
  };
}

/**
 * Get the user's best score for a specific game mode
 */
export async function getUserBestScore(
  playerName: string,
  gameMode: number
): Promise<{ data: LeaderboardEntry | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("player_name", playerName)
      .eq("game_mode", gameMode)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no record found, that's okay
      if (error.code === "PGRST116") {
        return { data: null };
      }
      console.error("Error fetching user best score:", error);
      return { data: null, error: error.message };
    }

    return { data: data as LeaderboardEntry };
  } catch (err) {
    console.error("Unexpected error fetching user best score:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

