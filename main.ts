import { loadConfig } from "./lib/configManager.ts";
import { Log } from "./lib/loggers.ts";

async function main() {
    try {
        Log.info("Starting...");
        const config = await loadConfig();
        Log.success("Config loaded");
        Log.info(config);
        
        const userNames = Array.from(new Set<string>(config.teams.flatMap(x => x.members)));

        // Controlla per tutti gli usernames:        
        // Se non esiste <nome, id> -> chiedi a riot e aggiungi e aggiorna JSON

        


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