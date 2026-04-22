import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useMonitor } from '../hooks/useMonitor';
import { MessageSquare, Bot, User, Pause, Play, Send, Search, UserCircle } from 'lucide-react';
export const AgentDashboard = ({ apiUrl }) => {
    const { sessions, activeSession, messages, isLoading, fetchSessions, selectSession, toggleAi, sendManualMessage } = useMonitor(apiUrl);
    const [manualText, setManualText] = useState('');
    const [search, setSearch] = useState('');
    useEffect(() => {
        fetchSessions();
    }, []);
    const filteredSessions = sessions.filter(s => s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.visitor_id.includes(search));
    const handleSend = async (e) => {
        e.preventDefault();
        if (!manualText.trim() || !activeSession)
            return;
        await sendManualMessage(activeSession.id, manualText);
        setManualText('');
    };
    return (_jsx("div", { className: "gunma-dashboard", children: _jsxs("div", { className: "dashboard-layout", children: [_jsxs("aside", { className: "session-sidebar", children: [_jsxs("div", { className: "sidebar-header", children: [_jsx("h2", { children: "Conversations" }), _jsxs("div", { className: "search-box", children: [_jsx(Search, { size: 16 }), _jsx("input", { type: "text", placeholder: "Search sessions...", value: search, onChange: (e) => setSearch(e.target.value) })] })] }), _jsxs("div", { className: "session-list", children: [isLoading && _jsx("div", { className: "loading-state", children: "Loading sessions..." }), filteredSessions.map(s => (_jsxs("div", { className: `session-item ${activeSession?.id === s.id ? 'active' : ''}`, onClick: () => selectSession(s), children: [_jsx("div", { className: "avatar", children: _jsx(UserCircle, { size: 32 }) }), _jsxs("div", { className: "session-info", children: [_jsxs("div", { className: "session-top", children: [_jsx("span", { className: "name", children: s.customer_name || 'Guest User' }), _jsx("span", { className: "time", children: new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }), _jsxs("div", { className: "session-bottom", children: [_jsx("span", { className: "channel", children: s.channel }), !s.is_ai_enabled && _jsx("span", { className: "manual-badge", children: "Manual" })] })] })] }, s.id)))] })] }), _jsx("main", { className: "chat-monitor", children: activeSession ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "monitor-header", children: [_jsxs("div", { className: "user-profile", children: [_jsx("h3", { children: activeSession.customer_name || 'Guest User' }), _jsxs("span", { className: "visitor-id", children: ["ID: ", activeSession.visitor_id] })] }), _jsx("div", { className: "control-actions", children: _jsx("button", { className: `ai-toggle ${activeSession.is_ai_enabled ? 'enabled' : 'disabled'}`, onClick: () => toggleAi(activeSession.id, !activeSession.is_ai_enabled), children: activeSession.is_ai_enabled ? (_jsxs(_Fragment, { children: [_jsx(Pause, { size: 18 }), " Stop AI"] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 18 }), " Resume AI"] })) }) })] }), _jsx("div", { className: "message-history", children: messages.map(m => (_jsxs("div", { className: `message-row ${m.role}`, children: [_jsx("div", { className: "message-icon", children: m.role === 'user' ? _jsx(User, { size: 16 }) : _jsx(Bot, { size: 16 }) }), _jsxs("div", { className: "message-content", children: [_jsx("div", { className: "message-bubble", children: m.content }), _jsx("span", { className: "timestamp", children: new Date(m.created_at).toLocaleTimeString() })] })] }, m.id))) }), _jsxs("form", { className: "manual-input", onSubmit: handleSend, children: [_jsx("input", { type: "text", placeholder: activeSession.is_ai_enabled ? "Disable AI to respond manually..." : "Type your response...", value: manualText, onChange: (e) => setManualText(e.target.value), disabled: activeSession.is_ai_enabled }), _jsx("button", { type: "submit", disabled: activeSession.is_ai_enabled || !manualText.trim(), children: _jsx(Send, { size: 20 }) })] })] })) : (_jsxs("div", { className: "empty-monitor", children: [_jsx(MessageSquare, { size: 64 }), _jsx("p", { children: "Select a conversation to start monitoring" })] })) })] }) }));
};
