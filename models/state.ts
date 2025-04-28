export interface UserState {
    id: string;
    lastUpdated: string; // ISO string
}
  
export interface State {
    users: Record<string, UserState>;
}