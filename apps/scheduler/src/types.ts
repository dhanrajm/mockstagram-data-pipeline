export interface ActiveInfluencer {
  pk: number;
  username: string;
  active: boolean;
}

export interface FetchTask {
  pk: number;
  username: string;
  target_minute_timestamp: string;
}

export interface Metrics {
  activeInfluencers: number;
  tasksProduced: number;
  tickDuration: number;
} 