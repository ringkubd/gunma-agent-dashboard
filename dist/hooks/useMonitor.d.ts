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
export interface SupportTicket {
    id: string;
    session_id: string | null;
    customer_id: number | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    order_id: string | null;
    issue_type: string;
    subject: string | null;
    message: string;
    status: 'pending' | 'open' | 'resolved' | 'closed';
    priority_score: number;
    created_at: string;
}
export interface DashboardStats {
    total_sessions: number;
    active_sessions: number;
    total_messages: number;
    manual_sessions: number;
    pending_tickets: number;
}
export interface UseMonitorOptions {
    /** Auto-refresh interval in ms (0 = disabled). Default: 15000 */
    pollInterval?: number;
}
export declare function useMonitor(apiUrl: string, options?: UseMonitorOptions): {
    sessions: ChatSession[];
    activeSession: ChatSession | null;
    messages: ChatMessage[];
    tickets: SupportTicket[];
    stats: DashboardStats | null;
    isLoading: boolean;
    unreadCounts: Record<string, number>;
    toolStatus: Record<string, string>;
    typingSessions: Record<string, boolean>;
    fetchSessions: () => Promise<void>;
    fetchTickets: (status?: string) => Promise<void>;
    updateTicketStatus: (ticketId: string, status: string) => Promise<void>;
    fetchStats: () => Promise<void>;
    selectSession: (session: ChatSession) => Promise<void>;
    toggleAi: (sessionId: string, enabled: boolean) => Promise<void>;
    sendManualMessage: (sessionId: string, message: string) => Promise<void>;
    sendTyping: (sessionId: string, isTyping: boolean) => Promise<void>;
    endSession: (sessionId: string) => Promise<void>;
};
