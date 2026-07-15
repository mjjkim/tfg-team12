export type VoiceAgentRole = "assistant" | "user";

export interface VoiceAgentMessage {
  role: VoiceAgentRole;
  content: string;
}

export interface VoiceAgentDecision {
  decision: "ASK" | "START_LIVE" | "START_HISTORY";
  speech: string;
  stockTicker: string;
  interval: 0 | 1 | 3 | 5;
  from: string;
  to: string;
}
