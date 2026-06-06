export interface ChatSession {
    id: string;
    visitor_id: string;
    customer_name: string | null;
    customer_email: string | null;
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
export interface UseMonitorAuth {
    /**
     * localStorage keys to look up the Bearer token, tried in order.
     * Default: ['token', 'tk']
     */
    tokenKeys?: string[];
    /**
     * Provide a token directly (skips localStorage lookup).
     * Useful when auth is managed by the host app (e.g. Redux, Zustand).
     */
    getToken?: () => string | null;
}
export interface UseMonitorPusher {
    key: string;
    cluster?: string;
    wsHost?: string;
    wsPort?: number;
    forceTLS?: boolean;
    /** Path on the API used to authorize private channels. Default: '/api/broadcasting/auth' */
    authEndpoint?: string;
}
export interface UseMonitorRoutes {
    /** e.g. '/api/admin/chat'  — all specific paths are derived from this prefix */
    prefix?: string;
    sessions?: string;
    tickets?: string;
    stats?: string;
    endSession?: string;
    csrfCookie?: string;
}
export interface UseMonitorOptions {
    /** Auto-refresh interval in ms (0 = disabled). Default: 15000 */
    pollInterval?: number;
    /** Authentication configuration */
    auth?: UseMonitorAuth;
    /** Pusher / Laravel Echo configuration (required for real-time features) */
    pusher?: UseMonitorPusher;
    /**
     * Private channel name to subscribe to.
     * Default: 'gunma-admin.chats'
     */
    broadcastChannel?: string;
    /** API route overrides */
    routes?: UseMonitorRoutes;
}
export declare function useMonitor(apiUrl: string, options?: UseMonitorOptions): {
    sessions: ChatSession[];
    activeSession: ChatSession | null;
    messages: ChatMessage[];
    tickets: SupportTicket[];
    selectedTicket: SupportTicket | null;
    ticketMessages: ChatMessage[];
    stats: DashboardStats | null;
    isLoading: boolean;
    unreadCounts: Record<string, number>;
    toolStatus: Record<string, string>;
    typingSessions: Record<string, boolean>;
    fetchSessions: () => Promise<void>;
    fetchTickets: (status?: string) => Promise<void>;
    fetchTicketDetail: (ticketId: string) => Promise<void>;
    updateTicketStatus: (ticketId: string, status: string) => Promise<void>;
    fetchStats: () => Promise<void>;
    selectSession: (session: ChatSession) => Promise<void>;
    selectTicket: (ticket: SupportTicket) => Promise<void>;
    toggleAi: (sessionId: string, enabled: boolean) => Promise<void>;
    sendManualMessage: (sessionId: string, message: string) => Promise<void>;
    sendTyping: (sessionId: string, isTyping: boolean) => Promise<void>;
    endSession: (sessionId: string) => Promise<void>;
};
