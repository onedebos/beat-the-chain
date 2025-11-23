import { supabase, supabaseAnonymous } from "./supabase";
import type { GameResult, LeaderboardEntry } from "./types";

// Helper to check if running on localhost (for conditional logging)
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Wrapper functions for logging (only log on localhost)
const log = (...args: any[]) => {
  if (isLocalhost) console.log(...args);
};

const logError = (...args: any[]) => {
  if (isLocalhost) console.error(...args);
};

// Debug helper to check Supabase client (only logs on localhost)
function checkSupabaseClient() {
  if (!isLocalhost) return;
  log("=== SUPABASE CLIENT CHECK ===");
  log("Client exists:", !!supabase);
  log("Client URL:", (supabase as any)?._url || "unknown");
  log("Client key present:", !!((supabase as any)?._key || "unknown"));
  
  // Check if environment variables are available
  if (typeof window !== "undefined") {
    log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Present" : "Missing");
    log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Present" : "Missing");
  }
  log("===========================");
}

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
 * Uses API route with service role key for writes
 */
export async function saveGameResult(result: GameResult): Promise<{ success: boolean; error?: string; isNewBest?: boolean; id?: number }> {
  try {
    // Check localStorage first (fast check)
    const localBest = getLocalBestScore(result.player_name, result.game_mode);
    if (localBest !== null && result.score <= localBest) {
      return { success: true, isNewBest: false };
    }

    // Call API route which uses service role key for writes
    const response = await fetch("/api/game-results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    });

    const apiResult = await response.json();

    if (!apiResult.success) {
      return { success: false, error: apiResult.error || "Failed to save game result" };
    }

    // Update localStorage cache
    if (apiResult.isNewBest) {
      setLocalBestScore(result.player_name, result.game_mode, result.score);
      if (apiResult.id) {
        setLocalRecordId(result.player_name, result.game_mode, apiResult.id);
      }
    } else {
      // If not a new best, we still want to ensure localStorage is up to date
      // Fetch the current best to update cache
      const bestScoreResult = await getUserBestScore(
        result.player_name,
        result.game_mode
      );
      if (bestScoreResult.data) {
        setLocalBestScore(result.player_name, result.game_mode, bestScoreResult.data.score);
        setLocalRecordId(result.player_name, result.game_mode, bestScoreResult.data.id);
      }
    }

    return {
      success: true,
      isNewBest: apiResult.isNewBest || false,
      id: apiResult.id,
    };
  } catch (err) {
    logError("Unexpected error saving game result:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Calculate accuracy-weighted score
 * Uses squared accuracy to give it more weight in the ranking
 */
function calculateAccuracyWeightedScore(lps: number, accuracy: number): number {
  const accuracyDecimal = accuracy / 100;
  return lps * (accuracyDecimal * accuracyDecimal);
}

/**
 * Get leaderboard entries for a specific game mode
 * Sorted by accuracy-weighted score (lps * (accuracy/100)^2)
 * @param gameMode - The game mode (15, 30, or 60 words)
 * @param limit - Number of entries to return (default: 10)
 */
export async function getLeaderboard(
  gameMode: number,
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error?: string }> {
  try {
    log("=== getLeaderboard DEBUG ===");
    log("Fetching leaderboard for gameMode:", gameMode, "limit:", limit);
    
    // Check Supabase client
    checkSupabaseClient();
    
    // Note: Leaderboard queries are public reads and don't require authentication
    // Same logic works for name-based and Twitter auth users
    log("Starting database query (public read, no auth required)...");
    
    const queryStartTime = Date.now();
    
    log("Checking anonymous Supabase client...");
    log("Anonymous client exists:", !!supabaseAnonymous);
    log("Anonymous client URL:", (supabaseAnonymous as any)?._url || "unknown");
    
    // Direct query - same as name-based users use (no session check needed)
    log("Making Supabase query to game_results table...");
    log("Query params: game_mode =", gameMode);
    
    let data: any = null;
    let error: any = null;
    
    try {
      // Use anonymous client for public reads - ensures same behavior for all users
      log("Creating query promise with anonymous client...");
      const queryPromise = supabaseAnonymous
        .from("game_results")
        .select("*")
        .eq("game_mode", gameMode)
        .limit(10000);
      
      log("Query promise created, adding timeout wrapper...");
      
      // Add timeout to prevent hanging (15 seconds to account for slower connections)
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
        setTimeout(() => {
          logError(`⚠️ Database query timed out after 15 seconds`);
          logError(`Query was for gameMode: ${gameMode}`);
          resolve({ data: null, error: new Error("Database query timeout") });
        }, 15000);
      });
      
      log("Race between query and timeout starting...");
      const queryResult = await Promise.race([queryPromise, timeoutPromise]);
      
      if ('data' in queryResult && queryResult.data === null && queryResult.error) {
        // Timeout occurred
        const queryEndTime = Date.now();
        logError(`❌ Database query timed out after ${queryEndTime - queryStartTime}ms`);
        log("==========================");
        return { data: null, error: queryResult.error.message };
      }
      
      // Query completed (either success or error from Supabase)
      const result = queryResult as { data: any; error: any };
      data = result.data;
      error = result.error;
      const queryEndTime = Date.now();
      log(`✅ Database query completed in ${queryEndTime - queryStartTime}ms`);
      log("Query result - data count:", data?.length || 0);
      log("Query result - error:", error);
    } catch (queryErr) {
      const queryEndTime = Date.now();
      logError(`❌ Database query failed after ${queryEndTime - queryStartTime}ms`);
      logError("Query exception:", queryErr);
      logError("Error type:", typeof queryErr);
      logError("Error details:", JSON.stringify(queryErr, Object.getOwnPropertyNames(queryErr), 2));
      return {
        data: null,
        error: queryErr instanceof Error ? queryErr.message : "Unknown error",
      };
    }
    
    if (error) {
      logError("Error fetching leaderboard:", error);
      logError("Error details:", JSON.stringify(error, null, 2));
      log("==========================");
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      log("No leaderboard data found");
      log("==========================");
      return { data: [] };
    }

    // Calculate accuracy-weighted score for each entry and sort
    const entriesWithWeightedScore = data.map((entry: LeaderboardEntry) => ({
      ...entry,
      weightedScore: calculateAccuracyWeightedScore(entry.lps, entry.accuracy),
    }));

    // Sort by weighted score (descending), then by accuracy (descending) as tiebreaker, then by lps
    entriesWithWeightedScore.sort((a: LeaderboardEntry & { weightedScore: number }, b: LeaderboardEntry & { weightedScore: number }) => {
      // Primary sort: weighted score (higher is better)
      if (Math.abs(b.weightedScore - a.weightedScore) > 0.0001) {
        return b.weightedScore - a.weightedScore;
      }
      // Secondary sort: accuracy (higher is better)
      if (Math.abs(b.accuracy - a.accuracy) > 0.01) {
        return b.accuracy - a.accuracy;
      }
      // Tertiary sort: lps (higher is better)
      return b.lps - a.lps;
    });

    // Return top entries (remove the weightedScore property before returning)
    const topEntries = entriesWithWeightedScore.slice(0, limit).map(({ weightedScore, ...entry }: LeaderboardEntry & { weightedScore: number }) => entry);

    log(`Returning ${topEntries.length} top entries`);
    log("==========================");
    return { data: topEntries as LeaderboardEntry[] };
  } catch (err) {
    logError("Unexpected error fetching leaderboard:", err);
    logError("Error stack:", err instanceof Error ? err.stack : "No stack");
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
    log("=== getUserBestScore DEBUG ===");
    log("Querying for playerName:", playerName, "gameMode:", gameMode);
    
    // Check Supabase client
    checkSupabaseClient();
    
    // Note: User score queries are public reads and don't require authentication
    // Same logic works for name-based and Twitter auth users
    log("Starting database query (public read, no auth required)...");
    
    const queryStartTime = Date.now();
    
    // Direct query - same as name-based users use (no session check needed)
    log("Checking anonymous Supabase client...");
    log("Anonymous client exists:", !!supabaseAnonymous);
    log("Anonymous client URL:", (supabaseAnonymous as any)?._url || "unknown");
    
    log("Making Supabase query to game_results table...");
    log("Query params: player_name =", playerName, "game_mode =", gameMode);
    
    let data: any = null;
    let error: any = null;
    
    try {
      // Use anonymous client for public reads - ensures same behavior for all users
      log("Creating query promise with anonymous client...");
      log("Anonymous client check - about to access supabaseAnonymous.from()");
      const clientAccessStart = Date.now();
      const queryPromise = supabaseAnonymous
        .from("game_results")
        .select("*")
        .eq("player_name", playerName)
        .eq("game_mode", gameMode)
        .order("score", { ascending: false })
        .limit(1)
        .single();
      const clientAccessEnd = Date.now();
      log(`Anonymous client accessed in ${clientAccessEnd - clientAccessStart}ms`);
      
      log("Query promise created, adding timeout wrapper...");
      
      // Add timeout to prevent hanging (15 seconds to account for slower connections)
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
        setTimeout(() => {
          logError(`⚠️ Database query timed out after 15 seconds`);
          logError(`Query was for playerName: ${playerName}, gameMode: ${gameMode}`);
          resolve({ data: null, error: new Error("Database query timeout") });
        }, 15000);
      });
      
      log("Race between query and timeout starting...");
      const queryResult = await Promise.race([queryPromise, timeoutPromise]);
      
      if ('data' in queryResult && queryResult.data === null && queryResult.error) {
        // Timeout occurred
        const queryEndTime = Date.now();
        logError(`❌ Database query timed out after ${queryEndTime - queryStartTime}ms`);
        logError(`Failed query: playerName: ${playerName}, gameMode: ${gameMode}`);
        log("==========================");
        return { data: null, error: queryResult.error.message };
      }
      
      // Query completed (either success or error from Supabase)
      const result = queryResult as { data: any; error: any };
      data = result.data;
      error = result.error;
      const queryEndTime = Date.now();
      log(`✅ Database query completed in ${queryEndTime - queryStartTime}ms`);
      log("Query result - data:", data);
      log("Query result - error:", error);
    } catch (queryErr) {
      const queryEndTime = Date.now();
      logError(`❌ Database query failed after ${queryEndTime - queryStartTime}ms`);
      logError("Query exception:", queryErr);
      logError("Error type:", typeof queryErr);
      logError("Error details:", JSON.stringify(queryErr, Object.getOwnPropertyNames(queryErr), 2));
      return {
        data: null,
        error: queryErr instanceof Error ? queryErr.message : "Unknown error",
      };
    }
    
    if (error) {
      // If no record found, that's okay
      if (error.code === "PGRST116") {
        log("No record found (PGRST116)");
        log("==========================");
        return { data: null };
      }
      logError("Error fetching user best score:", error);
      log("==========================");
      return { data: null, error: error.message };
    }

    log("Successfully fetched user best score");
    log("==========================");
    return { data: data as LeaderboardEntry };
  } catch (err) {
    logError("Unexpected error fetching user best score:", err);
    logError("Error stack:", err instanceof Error ? err.stack : "No stack");
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get all best scores for a user across all game modes
 */
export async function getAllUserScores(
  playerName: string
): Promise<{ data: LeaderboardEntry[]; error?: string }> {
  try {
    const gameModes = [15, 30, 60];
    const allScores: LeaderboardEntry[] = [];

    // Fetch best score for each game mode
    // Add error handling to prevent one failed query from blocking others
    for (const mode of gameModes) {
      try {
        const result = await getUserBestScore(playerName, mode);
        if (result.data) {
          allScores.push(result.data);
        }
      } catch (err) {
        // Continue to next mode even if this one failed
      }
    }

    // Sort by game mode (15, 30, 60)
    allScores.sort((a, b) => a.game_mode - b.game_mode);

    return { data: allScores };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Clear all localStorage data for a player
 */
export function clearPlayerData(playerName: string): void {
  if (typeof window === "undefined") return;
  try {
    const gameModes = [15, 30, 60];
    
    // Clear all best scores and record IDs for all game modes
    gameModes.forEach((mode) => {
      localStorage.removeItem(`best_score_${playerName}_${mode}`);
      localStorage.removeItem(`record_id_${playerName}_${mode}`);
    });
    
    // Clear the stored player name
    localStorage.removeItem("player_name");
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get stored player name from localStorage
 */
export function getStoredPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("player_name");
  } catch {
    return null;
  }
}

/**
 * Store player name in localStorage
 */
export function setStoredPlayerName(playerName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("player_name", playerName);
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get stored Twitter user data from localStorage
 */
export function getStoredTwitterUser(): { handle: string; avatarUrl?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("twitter_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Store Twitter user data in localStorage
 */
export function setStoredTwitterUser(handle: string, avatarUrl?: string): void {
  if (typeof window === "undefined") return;
  try {
    const userData = { handle, avatarUrl };
    localStorage.setItem("twitter_user", JSON.stringify(userData));
    localStorage.setItem("is_twitter_auth", "true");
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Clear stored Twitter user data from localStorage
 */
export function clearStoredTwitterUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("twitter_user");
    localStorage.setItem("is_twitter_auth", "false");
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Restore user data from database for a given player name
 * Fetches best scores for all game modes and updates localStorage
 */
export async function restoreUserDataFromDB(playerName: string): Promise<boolean> {
  try {
    const gameModes = [15, 30, 60];
    let hasData = false;

    // Fetch best score for each game mode
    for (const mode of gameModes) {
      const result = await getUserBestScore(playerName, mode);
      if (result.data) {
        // Update localStorage with the fetched data
        setLocalBestScore(playerName, mode, result.data.score);
        setLocalRecordId(playerName, mode, result.data.id);
        hasData = true;
      }
    }

    return hasData;
  } catch (err) {
    logError("Error restoring user data from database:", err);
    return false;
  }
}
