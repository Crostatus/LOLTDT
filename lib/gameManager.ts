import { Config } from "../models/config.ts";
import { MatchDto, ParticipantDto } from "../models/game.ts";
import { State } from "../models/state.ts";
import { Log } from "./loggers.ts";
import { RateLimitedRiotApiClient } from "./rateLimitedRiotApiClient.ts";
import { ensureDir } from "https://deno.land/std@0.218.2/fs/mod.ts";

export const FLEX_GAME_QUEUE_ID = 400;
const MATCH_CACHE_FILE = "./cache/matches_to_analyze.json";
const MATCH_DATA_DIR = "./cache/matches_data";
const MATCH_CLEAN_DIR = "./cache/matches_clean";
const MATCH_TEAM_MAP_FILE = "./cache/matches_per_team.json";
const MATCH_HISTORY_LENGTH = 20;

export async function fetchMatchIds(
  puuid: string,
  client: RateLimitedRiotApiClient,
  queueId: number
): Promise<string[]> {
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${MATCH_HISTORY_LENGTH}&queue=${queueId}`;
  return await client.get(url);
}


export async function prepareMatchAnalysis(
    users: { summonerName: string; puuid: string }[],
    analyzedMatchIds: string[],
    client: RateLimitedRiotApiClient,
    queueId: number,
  ): Promise<{ hasNewMatches: boolean; cachePath: string }> {
    const allMatchIds = new Set<string>();
  
    for (const { summonerName, puuid } of users) {
      Log.info(`📡 Fetching match IDs for ${summonerName}...`);
      const matchIds = await fetchMatchIds(puuid, client, queueId);
      matchIds.forEach(id => allMatchIds.add(id));
    }
  
    const matchesToAnalyze = Array.from(allMatchIds).filter(
      id => !analyzedMatchIds.includes(id)
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

  export function getTeamsForMatch(
    match: MatchDto,
    config: Config,
    state: State
  ): string[] {
    const matchPuuids = new Set(
      match.info.participants.map((p) => p.puuid)
    );
  
    const result: string[] = [];
  
    for (const team of config.teams) {
      const teamPuuids = team.members
        .map((summoner) => state.users[summoner]?.id)
        .filter((id): id is string => !!id); // filtra null/undefined
  
      const allPresent = teamPuuids.every((puuid) => matchPuuids.has(puuid));
  
      if (allPresent) {
        result.push(team.name);
      }
    }
  
    return result;
  }

  function extractMinimalMatch(match: MatchDto): unknown {
    return {
      id: match.metadata.matchId,
      mode: match.info.gameMode,
      duration: match.info.gameDuration,
      start: match.info.gameStartTimestamp,
      queueId: match.info.queueId,
      players: match.info.participants.map((p: ParticipantDto) => ({
        puuid: p.puuid,
        teamId: p.teamId,
        champion: p.championName,
        win: p.win,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        role: p.role,
        summonerName: p.summonerName,
      })),
    };
  }
  
  export async function analyzeMatchesFromCache(
    state: State,
    config: Config,
    client: RateLimitedRiotApiClient,
    cachePath: string
  ): Promise<void> {
    const text = await Deno.readTextFile(cachePath);
    const matchIds: string[] = JSON.parse(text);
  
    await ensureDir(MATCH_DATA_DIR);
    await ensureDir(MATCH_CLEAN_DIR);
  
    const matchPerTeam: Record<string, string[]> = {};
  
    for (const matchId of matchIds) {
  
      try {
        Log.info(`📡 Fetching match ${matchId}...`);
        const match: MatchDto = await client.get(
          `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`
        );
  
        const teams = getTeamsForMatch(match, config, state);
  
        if (teams.length === 0) {
          Log.warn(`Match ${matchId} contains no full team. Skipping...`);
          continue;
        }
  
        // Save full match
        await Deno.writeTextFile(
          `${MATCH_DATA_DIR}/${matchId}.json`,
          JSON.stringify(match, null, 2)
        );
  
        // Save minimal match
        const minimal = extractMinimalMatch(match);
        await Deno.writeTextFile(
          `${MATCH_CLEAN_DIR}/${matchId}.json`,
          JSON.stringify(minimal, null, 2)
        );
  
        // Track per-team assignment
        for (const team of teams) {
          matchPerTeam[team] ??= [];
          matchPerTeam[team].push(matchId);
        }
  
        state.analyzedMatches.push(matchId);
        Log.success(`Match ${matchId} saved and assigned to: ${teams.join(", ")}`);
      } catch (err) {
        Log.error(`Failed to fetch match ${matchId}:`, err);
      }
    }
  
    await Deno.writeTextFile(
      MATCH_TEAM_MAP_FILE,
      JSON.stringify(matchPerTeam, null, 2)
    );
  
    Log.success(`📌 Team → match map saved to ${MATCH_TEAM_MAP_FILE}`);
  }