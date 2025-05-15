import { loadConfig } from "./lib/configManager.ts";
import { analyzeMatchesFromCache, FLEX_GAME_QUEUE_ID, prepareMatchAnalysis } from "./lib/gameManager.ts";
import { Log } from "./lib/loggers.ts";
import { RateLimitedRiotApiClient } from "./lib/rateLimitedRiotApiClient.ts";
import { findMissingUsersUUID, loadState, saveState } from "./lib/stateManager.ts";

// Program to read LoL game statistics... WIP
async function main() {
    try {
        Log.info("Starting...");
        const config = await loadConfig();
        Log.success("Config loaded");
        const riotApiClient = new RateLimitedRiotApiClient(
            config.apiKey,
            config.region,
            20, 1000,      // 20 req/sec
            100, 120000,   // 100 req/2 min
            config.maxWebApiCallAttempts
        );
        
        const state = await loadState().catch(x => {
            Log.error("Fatal error encountered while loading program state");
            throw new Error(x);
        });
        Log.success("State loaded");
        
        const userNames = Array.from(new Set<string>(config.teams.flatMap(x => x.members)));
        if(await findMissingUsersUUID(riotApiClient, userNames, state)) {
            // Sanity check
            for (const [name, data] of Object.entries(state.users)) {
                if (!data.id || typeof data.id !== "string" || !data.id.trim()) {
                    throw new Error(`Invalid or missing PUUID for user: ${name}`);
                }
            }

            await saveState(state);
            Log.success("📝 Updated state saved");
        }

        const trackedUsers: { summonerName: string; puuid: string }[] = [];
        for (const name of new Set(config.teams.flatMap(t => t.members))) {
            const entry = state.users[name];
            if (!entry || !entry.id) {
                Log.warn(`No PUUID available for ${name}, skipping.`);
                continue;
            }
            console.log('ciao');
            console.log(name);
            trackedUsers.push({ summonerName: name, puuid: entry.id });
        }               

        const { hasNewMatches, cachePath } = await prepareMatchAnalysis(trackedUsers, state.analyzedMatches, riotApiClient, FLEX_GAME_QUEUE_ID)
        if(hasNewMatches) {
            // Go ask match data
            await analyzeMatchesFromCache(state, config, riotApiClient, cachePath);
            await saveState(state);
        }


    } catch (error) {    
        if (error instanceof Error) {
            Log.error(error.message);
        } else {
            Log.error(error);
        }
        Deno.exit(1);    
    }
}

await main();