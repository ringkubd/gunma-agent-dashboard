"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

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
    sessions?: string;         // default: `${prefix}/sessions`
    tickets?: string;          // default: `${prefix}/tickets`
    stats?: string;            // default: `${prefix}/stats`
    endSession?: string;       // default: '/api/chat/sessions' (legacy)
    csrfCookie?: string;       // default: '/sanctum/csrf-cookie'
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

export function useMonitor(apiUrl: string, options: UseMonitorOptions = {}) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [toolStatus, setToolStatus] = useState<Record<string, string>>({});
    const [typingSessions, setTypingSessions] = useState<Record<string, boolean>>({});
    const echoRef = useRef<Echo<any> | null>(null);
    const activeSessionIdRef = useRef<string | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const pollInterval = options.pollInterval ?? 15000;

    // --- Resolved configurable values ---
    const tokenKeys   = options.auth?.tokenKeys ?? ['token', 'tk'];
    const getToken    = options.auth?.getToken;
    const channel     = options.broadcastChannel ?? 'gunma-admin.chats';
    const routePrefix = options.routes?.prefix ?? '/api/admin/chat';
    const routes = {
        csrfCookie:  options.routes?.csrfCookie  ?? '/sanctum/csrf-cookie',
        sessions:    options.routes?.sessions    ?? `${routePrefix}/sessions`,
        tickets:     options.routes?.tickets     ?? `${routePrefix}/tickets`,
        stats:       options.routes?.stats       ?? `${routePrefix}/stats`,
        endSession:  options.routes?.endSession  ?? '/api/chat/sessions',
        broadcastAuth: options.pusher?.authEndpoint ?? '/api/broadcasting/auth',
    };

    useEffect(() => {
        activeSessionIdRef.current = activeSession?.id ?? null;
    }, [activeSession?.id]);

    // Create dedicated axios instance
    const api = useRef(axios.create({
        baseURL: apiUrl,
        withCredentials: true,
        timeout: 60000,
    })).current;

    api.defaults.headers.post["Content-Type"] = "application/json";
    api.defaults.headers["Accept"] = "application/json";
    (api.defaults as any).withXSRFToken = true;

    // Request Interceptor — configurable token resolution
    useEffect(() => {
        const interceptor = api.interceptors.request.use(
            (config) => {
                // 1. Authorization header — prefer getToken(), then tokenKeys[]
                let rawToken: string | null = null;
                if (getToken) {
                    rawToken = getToken();
                } else {
                    for (const key of tokenKeys) {
                        rawToken = localStorage.getItem(key);
                        if (rawToken) break;
                    }
                }
                if (rawToken) {
                    config.headers.Authorization = rawToken.startsWith('Bearer ')
                        ? rawToken
                        : `Bearer ${rawToken}`;
                }

                // 2. XSRF-TOKEN header from cookies
                const cookieArray = document.cookie.split(";");
                for (let i = 0; i < cookieArray.length; i++) {
                    const cookiePair = cookieArray[i].split("=");
                    if (cookiePair[0].trim() === "XSRF-TOKEN") {
                        config.headers["X-XSRF-TOKEN"] = decodeURIComponent(cookiePair[1]);
                    }
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        return () => api.interceptors.request.eject(interceptor);
    }, [apiUrl]);

    // Initialize Echo & CSRF
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initSession = async () => {
            // 1. Get CSRF Cookie first for Sanctum
            try {
                await api.get(routes.csrfCookie);
            } catch (err) {
                console.warn('[useMonitor] CSRF init failed:', err);
            }

            // 2. Initialize Echo — fully driven by options.pusher
            if (!options.pusher?.key) {
                console.warn('[useMonitor] No pusher config provided — real-time features disabled.');
                return;
            }
            (window as any).Pusher = Pusher;

            try {
                echoRef.current = new Echo({
                    broadcaster: 'pusher',
                    key: options.pusher.key,
                    cluster: options.pusher.cluster,
                    wsHost: options.pusher.wsHost ?? 'localhost',
                    wsPort: options.pusher.wsPort ?? 6001,
                    forceTLS: options.pusher.forceTLS ?? false,
                    enabledTransports: ['ws', 'wss'],
                    disableStats: true,
                    authorizer: (ch: any) => ({
                        authorize: (socketId: string, callback: Function) => {
                            api.post(routes.broadcastAuth, {
                                socket_id: socketId,
                                channel_name: ch.name,
                            })
                            .then(res  => callback(false, res.data))
                            .catch(err => callback(true, err));
                        },
                    }),
                });

                if (echoRef.current) {
                    const echoChannel = echoRef.current.private(channel);
                    
                    echoChannel.listen('.message.new', (data: ChatMessage) => {
                        setSessions(prev => {
                            const index = prev.findIndex(s => s.id === data.session_id);
                            if (index === -1) return prev;
                            const newSessions = [...prev];
                            const session = { ...newSessions[index], updated_at: data.created_at };
                            newSessions.splice(index, 1);
                            return [session, ...newSessions];
                        });

                        if (activeSessionIdRef.current !== data.session_id) {
                            setUnreadCounts(prev => ({
                                ...prev,
                                [data.session_id]: (prev[data.session_id] || 0) + 1,
                            }));
                        }

                        if (activeSessionIdRef.current === data.session_id) {
                            setMessages(prev => {
                                if (prev.some(m => String(m.id) === String(data.id))) return prev;
                                return [...prev, data];
                            });
                        }

                        setToolStatus(prev => { const next = { ...prev }; delete next[data.session_id]; return next; });
                        setTypingSessions(prev => { const next = { ...prev }; delete next[data.session_id]; return next; });
                    });

                    echoChannel.listen('.ai.status_changed', (data: any) => {
                        setSessions(prev => prev.map(s =>
                            s.id === data.session_id ? { ...s, is_ai_enabled: data.is_ai_enabled } : s
                        ));
                        setActiveSession(prev => {
                            if (!prev || prev.id !== data.session_id) return prev;
                            if (prev.is_ai_enabled === data.is_ai_enabled) return prev;
                            return { ...prev, is_ai_enabled: data.is_ai_enabled };
                        });
                    });

                    echoChannel.listen('.tool.executing', (data: any) => {
                        setToolStatus(prev => ({ ...prev, [data.session_id]: data.message || 'Thinking...' }));
                    });

                    echoChannel.listen('.user.typing', (data: any) => {
                        if (data.role === 'user') {
                            setTypingSessions(prev => ({ ...prev, [data.session_id]: data.is_typing }));
                        }
                    });

                    echoChannel.listen('.priority.updated', (data: any) => {
                        setSessions(prev => {
                            const newSessions = prev.map(s => {
                                if (s.id === data.session_id) {
                                    const metadata = { ...(s as any).metadata || {} };
                                    metadata.priority_score = data.priority_score;
                                    return { ...s, metadata };
                                }
                                return s;
                            });
                            return newSessions.sort((a, b) => {
                                const scoreA = (a as any).metadata?.priority_score || 0;
                                const scoreB = (b as any).metadata?.priority_score || 0;
                                return scoreB - scoreA;
                            });
                        });
                    });
                }
            } catch (err) {
                console.warn('[useChat] Echo init failed:', err);
            }
        };

        initSession();

        return () => {
            if (echoRef.current) {
                echoRef.current.disconnect();
            }
        };
    }, [apiUrl]);

    // Auto-polling for session list refresh
    useEffect(() => {
        if (pollInterval <= 0) return;

        pollIntervalRef.current = setInterval(() => {
            fetchSessions();
        }, pollInterval);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [pollInterval, apiUrl]);

    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get(routes.sessions);
            setSessions(res.data.data);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl]);

    const fetchTickets = useCallback(async (status?: string) => {
        setIsLoading(true);
        try {
            const res = await api.get(routes.tickets, { params: { status } });
            setTickets(res.data.data);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl]);

    const updateTicketStatus = useCallback(async (ticketId: string, status: string) => {
        await api.post(`${routes.tickets}/${ticketId}/status`, { status });
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: status as any } : t));
    }, [apiUrl]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get(routes.stats);
            setStats(res.data);
        } catch (err) {
            console.warn('[useMonitor] Stats fetch failed');
        }
    }, [apiUrl]);

    const selectSession = useCallback(async (session: ChatSession) => {
        setActiveSession(session);
        // Clear unread for this session
        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[session.id];
            return next;
        });

        try {
            // Fetch session with messages
            const res = await api.get(`${routes.sessions}/${session.id}`);
            
            // Handle different possible response structures
            const sessionData = res.data.session || res.data;
            const fetchedMessages = sessionData.messages || [];
            
            setMessages(fetchedMessages);
        } catch (err) {
            console.error('[useMonitor] Failed to fetch messages:', err);
            setMessages([]);
        }
    }, [apiUrl]);

    const toggleAi = useCallback(async (sessionId: string, enabled: boolean) => {
        await api.post(`${routes.sessions}/${sessionId}/toggle-ai`, { enabled });
    }, [apiUrl]);

    const sendManualMessage = useCallback(async (sessionId: string, message: string) => {
        try {
            const res = await api.post(`${routes.sessions}/${sessionId}/messages`, { message });
            const newMessage = res.data.message || res.data.data || res.data;
            
            if (newMessage && newMessage.id) {
                setMessages(prev => {
                    const exists = prev.some(m => String(m.id) === String(newMessage.id));
                    if (exists) return prev;
                    return [...prev, newMessage];
                });
            }
        } catch (err) {
            console.error("Failed to send manual message", err);
        }
    }, [apiUrl]);

    const sendTyping = useCallback(async (sessionId: string, isTyping: boolean) => {
        try {
            await api.post(`${routes.sessions}/${sessionId}/typing`, { role: 'assistant', is_typing: isTyping });
        } catch (err) {
            // silent fail
        }
    }, [apiUrl]);

    // Polling fallback for real-time messages in case WebSockets fail
    useEffect(() => {
        if (!activeSession?.id) return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await api.get(`${routes.sessions}/${activeSession.id}`);
                const latestSession = res.data.session || res.data;
                const latestMessages = latestSession.messages || [];
                
                if (latestMessages.length > 0) {
                    setMessages(prev => {
                        // Merge messages, keeping uniqueness
                        const merged = [...prev];
                        let changed = false;
                        
                        latestMessages.forEach((msg: any) => {
                            if (!merged.some(m => String(m.id) === String(msg.id))) {
                                merged.push(msg);
                                changed = true;
                            }
                        });
                        
                        return changed ? merged.sort((a, b) => 
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        ) : prev;
                    });
                }
            } catch (err) {
                console.error("Polling failed", err);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, [activeSession?.id, api]);

    const endSession = useCallback(async (sessionId: string) => {
        await api.post(`${routes.endSession}/${sessionId}/end`);
        // Remove from sessions list
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        // Clear active if it's the ended session
        if (activeSessionIdRef.current === sessionId) {
            setActiveSession(null);
            setMessages([]);
        }
    }, [apiUrl]);

    return {
        sessions,
        activeSession,
        messages,
        tickets,
        stats,
        isLoading,
        unreadCounts,
        toolStatus,
        typingSessions,
        fetchSessions,
        fetchTickets,
        updateTicketStatus,
        fetchStats,
        selectSession,
        toggleAi,
        sendManualMessage,
        sendTyping,
        endSession,
    };
}
