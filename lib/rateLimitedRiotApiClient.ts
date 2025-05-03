import { Log } from "./loggers.ts";

export class RateLimitedRiotApiClient {
    private shortWindowRequests = 0;
    private longWindowRequests = 0;
    private shortWindowStart = Date.now();
    private longWindowStart = Date.now();
  
    constructor(
      private apiKey: string,
      public region: string,
      private shortWindowLimit: number,
      private shortWindowMs: number,
      private longWindowLimit: number,
      private longWindowMs: number,
      private maxAttempts: number = 3
    ) {}
  
    private async checkRateLimits() {
      let now = Date.now();
    
      if (now - this.shortWindowStart >= this.shortWindowMs) {
        this.shortWindowRequests = 0;
        this.shortWindowStart = now;
      }
      if (now - this.longWindowStart >= this.longWindowMs) {
        this.longWindowRequests = 0;
        this.longWindowStart = now;
      }
    
      let waitShort = 0;
      let waitLong = 0;
    
      if (this.shortWindowRequests >= this.shortWindowLimit) {
        waitShort = this.shortWindowMs - (now - this.shortWindowStart);
      }
      if (this.longWindowRequests >= this.longWindowLimit) {
        waitLong = this.longWindowMs - (now - this.longWindowStart);
      }
    
      const waitTime = Math.max(waitShort, waitLong);
      if(!waitTime) {
        return;
      }

      Log.warn(`Going to sleep ${waitTime} ms to avoid WebApi rate limits...`);
      await this.sleep(waitTime);
  
      now = Date.now();
      this.shortWindowRequests = 0;
      this.shortWindowStart = now;
      this.longWindowRequests = 0;
      this.longWindowStart = now;      
    }
  
    private sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    private async request(method: string, url: string, body?: unknown) {
      await this.checkRateLimits();
    
      const headers: HeadersInit = {
        "X-Riot-Token": this.apiKey,
        "Content-Type": "application/json",
      };
    
      let attempts = 0;
    
      while (attempts < this.maxAttempts) {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
    
        this.shortWindowRequests++;
        this.longWindowRequests++;
    
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : (2 ** attempts) * 1000;
          
          Log.warn(`Rate limit raggiunto. Aspetto ${waitMs}ms prima di riprovare... (Tentativo ${attempts + 1})`);
          await this.sleep(waitMs);
    
          attempts++;
          continue; // Riprova
        }
    
        if (!response.ok) {
          throw new Error(`Errore fetch: ${response.status} ${response.statusText}`);
        }
    
        return await response.json();
      }
    
      throw new Error(`Troppi tentativi falliti per ${method} ${url}`);
    }
  
  
    public get(url: string) {
      return this.request("GET", url);
    }
  
    public post(url: string, body: unknown) {
      return this.request("POST", url, body);
    }
  
    public put(url: string, body: unknown) {
      return this.request("PUT", url, body);
    }
  
    public delete(url: string) {
      return this.request("DELETE", url);
    }
  }