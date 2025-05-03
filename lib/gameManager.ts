import { State } from "../models/state.ts";
import { Log } from "./loggers.ts";
import { RateLimitedRiotApiClient } from "./rateLimitedRiotApiClient.ts";
import { ensureDir } from "https://deno.land/std@0.218.2/fs/mod.ts";

export const FLEX_GAME_QUEUE_ID = 400;
const MATCH_CACHE_FILE = "./cache/matches_to_analyze.json";

export async function fetchMatchIds(
  puuid: string,
  client: RateLimitedRiotApiClient,
  queueId: number
): Promise<string[]> {
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=100&queue=${queueId}`;
  return await client.get(url);
}


export async function prepareMatchAnalysis(
    state: State,
    client: RateLimitedRiotApiClient,
    queueId: number,
  ): Promise<{ hasNewMatches: boolean; cachePath: string }> {
    const allMatchIds = new Set<string>();
  
    for (const [username, { id: puuid }] of Object.entries(state.users)) {
      Log.info(`📡 Fetching match IDs for ${username}...`);
      const matchIds = await fetchMatchIds(puuid, client, queueId);
      matchIds.forEach(id => allMatchIds.add(id));
    }
  
    const matchesToAnalyze = Array.from(allMatchIds).filter(
      id => !state.analyzedMatches.includes(id)
    );
  
    if (matchesToAnalyze.length === 0) {
      Log.info("No new matches to analyze.");
      return { hasNewMatches: false, cachePath: MATCH_CACHE_FILE };
    }
  
    await ensureDir("./cache");
    const sorted = matchesToAnalyze.sort();
    await Deno.writeTextFile(MATCH_CACHE_FILE, JSON.stringify(sorted, null, 2));
  
    Log.success(`Cached ${sorted.length} new match IDs to ${MATCH_CACHE_FILE}`);
  
    return { hasNewMatches: true, cachePath: MATCH_CACHE_FILE };
  }