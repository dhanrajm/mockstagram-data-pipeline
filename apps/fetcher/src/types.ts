export interface FetchTask {
  pk: number;
  target_minute_timestamp: string;
}

export interface FetcherResult {
  pk: number;
  username: string;
  followerCount: number;
  fetchTimestamp: string;
  targetMinuteTimestamp: string;
}

export interface FailedTask {
  pk: number;
  targetMinuteTimestamp: string;
  error: string;
}

export interface Metrics {
  messagesConsumed: number;
  apiCalls: number;
  apiCallDuration: number;
  messagesProduced: number;
  failedTasks: number;
} 