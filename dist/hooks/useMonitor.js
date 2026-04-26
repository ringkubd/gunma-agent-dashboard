"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
export function useMonitor(apiUrl, options = {}) {
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [toolStatus, setToolStatus] = useState({});
    const echoRef = useRef(null);
    const activeSessionIdRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const pollInterval = options.pollInterval ?? 15000;
    useEffect(() => {
        activeSessionIdRef.current = activeSession?.id ?? null;
    }, [activeSession?.id]);
    // Initialize Echo & CSRF
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const initSession = async () => {
            // 1. Get CSRF Cookie first
            try {
                await axios.get(`${apiUrl}/sanctum/csrf-cookie`, { withCredentials: true });
            }
            catch (err) {
                console.warn('[useMonitor] CSRF init failed:', err);
            }
            // 2. Setup Axios defaults
            axios.defaults.withCredentials = true;
            const getCsrfToken = () => {
                const name = 'XSRF-TOKEN=';
                const decodedCookie = decodeURIComponent(document.cookie);
                const ca = decodedCookie.split(';');
                for (let i = 0; i < ca.length; i++) {
                    let c = ca[i].trim();
                    if (c.indexOf(name) === 0)
                        return c.substring(name.length, c.length);
                }
                return '';
            };
            const csrfToken = getCsrfToken();
            const authToken = localStorage.getItem('token') || localStorage.getItem('tk');
            // 3. Initialize Echo
            window.Pusher = Pusher;
            const url = new URL(apiUrl);
            try {
                echoRef.current = new Echo({
                    broadcaster: 'pusher',
                    key: process.env.NEXT_PUBLIC_PUSHER_KEY || '3e004c455a5824baf3a03f6d9cc6bcc5',
                    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
                    wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST || 'localhost',
                    wsPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT || 6001),
                    forceTLS: process.env.NEXT_PUBLIC_PUSHER_FORCE_TLS === 'true',
                    enabledTransports: ['ws', 'wss'],
                    disableStats: true,
                    authEndpoint: process.env.NEXT_PUBLIC_PUSHER_AUTH_ENDPOINT || `${url.origin}/api/broadcasting/auth`,
                    auth: {
                        headers: {
                            Authorization: authToken ? `Bearer ${authToken}` : '',
                            'X-XSRF-TOKEN': csrfToken,
                            'Accept': 'application/json'
                        }
                    }
                });
                if (echoRef.current) {
                    const channel = echoRef.current.private('gunma-admin.chats');
                    channel.listen('.message.new', (data) => {
                        setSessions(prev => {
                            const index = prev.findIndex(s => s.id === data.session_id);
                            if (index === -1)
                                return prev;
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
                                if (prev.some(m => m.id === data.id))
                                    return prev;
                                return [...prev, data];
                            });
                        }
                        setToolStatus(prev => {
                            const next = { ...prev };
                            delete next[data.session_id];
                            return next;
                        });
                    });
                    channel.listen('.ai.status_changed', (data) => {
                        setSessions(prev => prev.map(s => s.id === data.session_id ? { ...s, is_ai_enabled: data.is_ai_enabled } : s));
                        setActiveSession(prev => {
                            if (!prev || prev.id !== data.session_id)
                                return prev;
                            if (prev.is_ai_enabled === data.is_ai_enabled)
                                return prev;
                            return { ...prev, is_ai_enabled: data.is_ai_enabled };
                        });
                    });
                    channel.listen('.tool.executing', (data) => {
                        setToolStatus(prev => ({
                            ...prev,
                            [data.session_id]: data.message || 'Thinking...'
                        }));
                    });
                    channel.listen('.priority.updated', (data) => {
                        setSessions(prev => {
                            const newSessions = prev.map(s => {
                                if (s.id === data.session_id) {
                                    const metadata = { ...s.metadata || {} };
                                    metadata.priority_score = data.priority_score;
                                    return { ...s, metadata };
                                }
                                return s;
                            });
                            return newSessions.sort((a, b) => {
                                const scoreA = a.metadata?.priority_score || 0;
                                const scoreB = b.metadata?.priority_score || 0;
                                return scoreB - scoreA;
                            });
                        });
                    });
                }
            }
            catch (err) {
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
        if (pollInterval <= 0)
            return;
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
            const res = await axios.get(`${apiUrl}/api/admin/chat/sessions`);
            setSessions(res.data.data);
        }
        finally {
            setIsLoading(false);
        }
    }, [apiUrl]);
    const fetchTickets = useCallback(async (status) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${apiUrl}/api/admin/chat/tickets`, { params: { status } });
            setTickets(res.data.data);
        }
        finally {
            setIsLoading(false);
        }
    }, [apiUrl]);
    const updateTicketStatus = useCallback(async (ticketId, status) => {
        await axios.post(`${apiUrl}/api/admin/chat/tickets/${ticketId}/status`, { status });
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: status } : t));
    }, [apiUrl]);
    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get(`${apiUrl}/api/admin/chat/stats`);
            setStats(res.data);
        }
        catch (err) {
            console.warn('[useMonitor] Stats fetch failed');
        }
    }, [apiUrl]);
    const selectSession = useCallback(async (session) => {
        setActiveSession(session);
        // Clear unread for this session
        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[session.id];
            return next;
        });
        const res = await axios.get(`${apiUrl}/api/admin/chat/sessions/${session.id}`);
        setMessages(res.data.messages || []);
    }, [apiUrl]);
    const toggleAi = useCallback(async (sessionId, enabled) => {
        await axios.post(`${apiUrl}/api/admin/chat/sessions/${sessionId}/toggle-ai`, { enabled });
    }, [apiUrl]);
    const sendManualMessage = useCallback(async (sessionId, message) => {
        await axios.post(`${apiUrl}/api/admin/chat/sessions/${sessionId}/messages`, { message });
    }, [apiUrl]);
    const endSession = useCallback(async (sessionId) => {
        await axios.post(`${apiUrl}/api/chat/sessions/${sessionId}/end`);
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
        fetchSessions,
        fetchTickets,
        updateTicketStatus,
        fetchStats,
        selectSession,
        toggleAi,
        sendManualMessage,
        endSession,
    };
}
