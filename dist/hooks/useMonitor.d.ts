export interface ChatSession {
    id: string;
    visitor_id: string;
    customer_name: string | null;
    channel: string;
    status: string;
    is_ai_enabled: boolean;
    messages_count?: number;
    updated_at: string;
}
export interface ChatMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}
export declare function useMonitor(apiUrl: string): {
    sessions: ChatSession[];
    activeSession: ChatSession | null;
    messages: ChatMessage[];
    isLoading: boolean;
    fetchSessions: () => Promise<void>;
    selectSession: (session: ChatSession) => Promise<void>;
    toggleAi: (sessionId: string, enabled: boolean) => Promise<void>;
    sendManualMessage: (sessionId: string, message: string) => Promise<void>;
};
