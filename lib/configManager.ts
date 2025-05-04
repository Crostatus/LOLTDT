import { Config } from "../models/config.ts";

const CONFIG_FILE = "./config.json";


export async function loadConfig(): Promise<Config> {
    const configText = await Deno.readTextFile(CONFIG_FILE);
    const config: Config = JSON.parse(configText);
    validateConfig(config);
    return config;
}

function validateConfig(config: Config): void {
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
        throw new Error("API key mancante o vuota nel config.json");
    }

    const seenTeamNames = new Set<string>();    

    for (const team of config.teams) {
        if (!team.name || team.name.trim() === "") {
            throw new Error("Un team ha un nome vuoto.");
        }
        if (seenTeamNames.has(team.name)) {
            throw new Error(`Nome duplicato per il team: ${team.name}`);
        }
        seenTeamNames.add(team.name);

        // if (team.members.length !== 5) {
        //     throw new Error(`Il team "${team.name}" deve avere esattamente 5 membri.`);
        // }

        const seenMembers = new Set<string>();
        for (const member of team.members) {
            if (seenMembers.has(member)) {
                throw new Error(`Membro duplicato "${member}" nel team "${team.name}".`);
            }
            seenMembers.add(member);
        }
    }
}


