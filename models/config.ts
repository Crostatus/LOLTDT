export interface Team {
    name: string;
    members: string[];
}
  
export interface Config {
    apiKey: string;
    maxWebApiCallAttempts: number;
    region: string;
    teams: Team[];
}