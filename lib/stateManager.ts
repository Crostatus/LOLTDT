import { RiotAccountMinimal, State } from "../models/state.ts";
import { Log } from "./loggers.ts";
import { RateLimitedRiotApiClient } from "./rateLimitedRiotApiClient.ts";
import { RIOT_WEBAPI_ROUTES } from "./routes.ts";

const STATE_FILE = "./state.json";

export async function loadState(): Promise<State> {
    try {
      const text = await Deno.readTextFile(STATE_FILE);
  
      if(!text.trim()) {
        Log.warn(`${STATE_FILE} empty. Returning an initial empty state.`);
        return { users: {}, analyzedMatches: []};
      }  

      const parsed = JSON.parse(text) as State;
  
      if (!parsed.users || typeof parsed.users !== "object") {
        throw new Error(`Invalid state found`);
      }
  
      return parsed;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            Log.warn(`No ${STATE_FILE} found. Returning an initial empty state.`);
            return { users: {}, analyzedMatches: [] };
        }         
        throw error;
    }
}

export async function findMissingUsersUUID(client: RateLimitedRiotApiClient, usernames: string[], state: State) : Promise<boolean>{
    let updateNeeded = false;

    for(const name of usernames) {
        if(name in state.users) {
            continue;
        }
        Log.info(`📡 Going to retrieve puuid for summoner ${name}...`);
        updateNeeded = true;
        try {
            const data : RiotAccountMinimal = await client.get(`${RIOT_WEBAPI_ROUTES.PUUID_BY_NAME}/${encodeURIComponent(name)}/${encodeURIComponent(client.region)}`) ;
            
            state.users[name] = {
                id: data.puuid,
                lastUpdated: new Date().toISOString(),
            }
            Log.success(`📡 Summoner: ${name}, puuid: ${data.puuid}`);

        } catch(error) {
            Log.error(`Error retrieving summoner ${name}:`, error);
        }
    }
    return updateNeeded;
}

export async function saveState(state: State): Promise<void> {
    const json = JSON.stringify(state, null, 2);
    await Deno.writeTextFile(STATE_FILE, json);
}