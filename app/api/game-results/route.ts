import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase";
import type { GameResult } from "../../../lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GameResult = await request.json();
    
    // Validate required fields
    if (!body.player_name || body.score === undefined || body.game_mode === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    
    // Check if we have an existing record by player_name and game_mode
    const { data: existingRecords, error: queryError } = await supabase
      .from("game_results")
      .select("id, score")
      .eq("player_name", body.player_name)
      .eq("game_mode", body.game_mode)
      .order("score", { ascending: false })
      .limit(1);

    // Handle query errors (but continue if no record found)
    if (queryError && queryError.code !== "PGRST116") {
      console.error("Error checking existing record:", queryError);
      // Continue anyway - might be first score
    }

    const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    if (existingRecord && body.score > existingRecord.score) {
      // Update existing record with better score
      const { data, error } = await supabase
        .from("game_results")
        .update({
          score: body.score,
          lps: body.lps,
          accuracy: body.accuracy,
          rank: body.rank,
          time: body.time,
          ms_per_letter: body.ms_per_letter,
        })
        .eq("id", existingRecord.id)
        .select();

      if (error) {
        console.error("Error updating game result:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isNewBest: true,
        id: data && data[0] ? data[0].id : existingRecord.id,
      });
    } else if (existingRecord && body.score <= existingRecord.score) {
      // Score not better - don't update
      return NextResponse.json({
        success: true,
        isNewBest: false,
        id: existingRecord.id,
      });
    } else {
      // No existing record - insert new one
      const { data, error } = await supabase
        .from("game_results")
        .insert([
          {
            player_name: body.player_name,
            score: body.score,
            lps: body.lps,
            accuracy: body.accuracy,
            rank: body.rank,
            time: body.time,
            ms_per_letter: body.ms_per_letter,
            game_mode: body.game_mode,
          },
        ])
        .select();

      if (error) {
        console.error("Error saving game result:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isNewBest: true,
        id: data && data[0] ? data[0].id : undefined,
      });
    }
  } catch (err) {
    console.error("Unexpected error saving game result:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

