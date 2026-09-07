export interface AiToolContext {
  teamMemberId: number;
  supervisorTeamMemberId: number;
  isSupervisor: boolean;
  fullName: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InsightResult {
  message: string;
}
