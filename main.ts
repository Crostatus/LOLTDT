import { loadConfig } from "./lib/configManager.ts";
import { Log } from "./lib/loggers.ts";

async function main() {
    try {
        Log.info("Starting...");
        const config = await loadConfig();
        Log.success("Config loaded");
        
        
        
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