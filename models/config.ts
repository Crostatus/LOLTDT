export interface Team {
    name: string;
    members: string[];
}
  
export interface Config {
    apiKey: string;
    region: string;
    teams: Team[];
}