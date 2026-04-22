import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
export function useMonitor(apiUrl) {
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const echoRef = useRef(null);
    // Initialize Echo
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        window.Pusher = Pusher;
        const url = new URL(apiUrl);
        echoRef.current = new Echo({
            broadcaster: 'reverb',
            key: 'gunma-key',
            wsHost: url.hostname,
            wsPort: 8080,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
        });
        const channel = echoRef.current.private('gunma-admin.chats');
        channel.listen('.message.new', (data) => {
            // Update session list order
            setSessions(prev => {
                const index = prev.findIndex(s => s.id === data.session_id);
                if (index === -1)
                    return prev; // Optionally fetch new session
                const newSessions = [...prev];
                const session = { ...newSessions[index], updated_at: data.created_at };
                newSessions.splice(index, 1);
                return [session, ...newSessions];
            });
            // If it's the active session, add message
            if (activeSession?.id === data.session_id) {
                setMessages(prev => [...prev, data]);
            }
        });
        channel.listen('.ai.status_changed', (data) => {
            setSessions(prev => prev.map(s => s.id === data.session_id ? { ...s, is_ai_enabled: data.is_ai_enabled } : s));
            if (activeSession?.id === data.session_id) {
                setActiveSession(prev => prev ? { ...prev, is_ai_enabled: data.is_ai_enabled } : null);
            }
        });
        return () => echoRef.current?.disconnect();
    }, [apiUrl, activeSession?.id]);
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
    const selectSession = useCallback(async (session) => {
        setActiveSession(session);
        const res = await axios.get(`${apiUrl}/api/admin/chat/sessions/${session.id}`);
        setMessages(res.data.messages || []);
    }, [apiUrl]);
    const toggleAi = useCallback(async (sessionId, enabled) => {
        await axios.post(`${apiUrl}/api/admin/chat/sessions/${sessionId}/toggle-ai`, { enabled });
    }, [apiUrl]);
    const sendManualMessage = useCallback(async (sessionId, message) => {
        await axios.post(`${apiUrl}/api/admin/chat/sessions/${sessionId}/messages`, { message });
    }, [apiUrl]);
    return {
        sessions,
        activeSession,
        messages,
        isLoading,
        fetchSessions,
        selectSession,
        toggleAi,
        sendManualMessage
    };
}
