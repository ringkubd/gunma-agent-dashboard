"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useMonitor } from '../hooks/useMonitor';
import { MessageSquare, Bot, User, Pause, Play, Send, Search, UserCircle, Mail, Trash2, ShoppingCart, CreditCard, AlertCircle, Info, Loader2 } from 'lucide-react';
export const AgentDashboard = ({ apiUrl, pollInterval, pusher, auth, broadcastChannel, routes }) => {
    const { sessions, activeSession, messages, tickets, stats, isLoading, unreadCounts, toolStatus, typingSessions, fetchSessions, fetchTickets, updateTicketStatus, fetchStats, selectSession, toggleAi, sendManualMessage, sendTyping, endSession } = useMonitor(apiUrl, { pollInterval, pusher, auth, broadcastChannel, routes });
    const [view, setView] = useState('chats');
    const [manualText, setManualText] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [confirmEndId, setConfirmEndId] = useState(null);
    const typingTimerRef = React.useRef(null);
    const isTypingRef = React.useRef(false);
    const renderMarkdown = (text) => {
        if (!text)
            return '';
        // ── Step 1: Extract and replace product blocks ──
        const productBlocks = [];
        const websiteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gunmahalalfood.com';
        // Use /s flag to allow dot to match newlines inside the product block
        text = text.replace(/:{2,3}product\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]:{2,3}/gs, (_, id, title, price, image, slug) => {
            const cleanId = id.trim();
            const cleanTitle = title.trim();
            const cleanPrice = price.trim().replace(/\.000$/, '').replace(/\.00$/, '');
            const cleanImage = image.trim();
            const cleanSlug = slug.trim();
            const card = `
                <div class="gunma-product-mini-card" data-id="${cleanId}">
                    <a href="${websiteUrl}/${cleanSlug}" target="_blank" rel="noopener" class="gunma-product-mini-img-link">
                        <img src="${cleanImage}" alt="${cleanTitle}" loading="lazy"/>
                    </a>
                    <div class="gunma-product-mini-body">
                        <span class="gunma-product-mini-title">${cleanTitle}</span>
                        <div class="gunma-product-mini-footer">
                            <span class="gunma-product-mini-price">৳${cleanPrice}</span>
                        </div>
                    </div>
                </div>`;
            productBlocks.push(card);
            return `{{PRODUCT_CARD_${productBlocks.length - 1}}}`;
        });
        // ── Step 2: Extract the "Add ALL" bulk link ──
        const bulkPattern = /\*?\*?\[?🛒 Add ALL Ingredients? to Cart\]?\(?[^)]*\)?\*?\*?/gi;
        text = text.replace(bulkPattern, '');
        // ── Step 3: Escape HTML (but NOT our placeholders) ──
        text = text
            .replace(/&(?!amp;)/g, '&amp;')
            .replace(/<(?!(\/?(h[1-6]|br|strong|em|ul|li|p|div|span|hr|img|a|code|button)\b))/g, '&lt;');
        // ── Step 4: Headers ──
        text = text
            .replace(/^### (.+)$/gm, '<h4 class="gunma-h4">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 class="gunma-h3">$1</h3>')
            .replace(/^# (.+)$/gm, '<h2 class="gunma-h2">$1</h2>');
        // ── Step 5: Bold & italic ──
        text = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
        // ── Step 6: Lists ──
        text = text.replace(/^[-*•]\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="gunma-list">$1</ul>');
        // ── Step 7: Step-by-step instructions ──
        text = text.replace(/^(\d+)\.\s+(.+)$/gm, (_, num, content) => `<div class="gunma-step"><span class="gunma-step-num">${num}</span><span>${content}</span></div>`);
        // ── Step 8: Images ──
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="gunma-msg-img" loading="lazy"/>');
        text = text.replace(/\[IMAGE:\s*(https?:\/\/[^\]]+)\]/g, '<div class="gunma-msg-img-container"><img src="$1" alt="Uploaded image" class="gunma-msg-img gunma-msg-img--uploaded" loading="lazy"/></div>');
        // ── Step 9: Links ──
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="gunma-link">$1</a>');
        // ── Step 10: Horizontal rules ──
        text = text.replace(/^---+$/gm, '<hr class="gunma-hr"/>');
        // ── Step 11: Line breaks ──
        text = text.replace(/\n/g, '<br/>');
        text = text.replace(/(<\/div>|<\/ul>|<\/li>|<\/h[1-4]>|<hr\s?\/?>)<br\/>/g, '$1');
        text = text.replace(/(<br\/>){2,}/g, '<br/>');
        // ── Step 12: Restore product cards & wrap in grid if consecutive ──
        productBlocks.forEach((card, i) => {
            text = text.replace(`{{PRODUCT_CARD_${i}}}`, card);
        });
        // Smart Grid Wrapping
        text = text.replace(/(<div class="gunma-product-mini-card".*?<\/div>(\s|<br\/?>)*)+/g, (match) => {
            const cardsOnly = match.replace(/<br\/?>/g, '').trim();
            return `<div class="gunma-product-grid">${cardsOnly}</div>`;
        });
        return text;
    };
    useEffect(() => {
        fetchSessions();
        fetchStats();
    }, []);
    useEffect(() => {
        if (view === 'tickets') {
            fetchTickets();
        }
    }, [view]);
    const filteredSessions = sessions.filter(s => {
        const matchesSearch = s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            s.visitor_id.includes(search);
        let matchesFilter = true;
        switch (filter) {
            case 'active':
                matchesFilter = s.status === 'active' && s.is_ai_enabled;
                break;
            case 'manual':
                matchesFilter = s.status === 'active' && !s.is_ai_enabled;
                break;
            case 'ended':
                matchesFilter = s.status === 'ended';
                break;
        }
        return matchesSearch && matchesFilter;
    });
    const handleSend = async (e) => {
        e.preventDefault();
        if (!manualText.trim() || !activeSession)
            return;
        if (isTypingRef.current) {
            isTypingRef.current = false;
            sendTyping(activeSession.id, false);
        }
        await sendManualMessage(activeSession.id, manualText);
        setManualText('');
    };
    const handleInputChange = (e) => {
        setManualText(e.target.value);
        if (!activeSession)
            return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            sendTyping(activeSession.id, true);
        }
        if (typingTimerRef.current)
            clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                sendTyping(activeSession.id, false);
            }
        }, 3000);
    };
    const handleEndSession = async (sessionId) => {
        await endSession(sessionId);
        setConfirmEndId(null);
    };
    const filterTabs = [
        { key: 'all', label: 'All' },
        { key: 'active', label: 'AI Active' },
        { key: 'manual', label: 'Manual' },
        { key: 'ended', label: 'Ended' },
    ];
    const [showSidePanel, setShowSidePanel] = useState(true);
    return (_jsxs("div", { className: "gunma-dashboard", children: [stats && (_jsxs("div", { className: "stats-bar", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon chats", children: _jsx(MessageSquare, { size: 20 }) }), _jsxs("div", { className: "stat-data", children: [_jsx("span", { className: "stat-value", children: stats.total_sessions }), _jsx("span", { className: "stat-label", children: "Total Chats" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon active", children: _jsx(Bot, { size: 20 }) }), _jsxs("div", { className: "stat-data", children: [_jsx("span", { className: "stat-value", children: stats.active_sessions }), _jsx("span", { className: "stat-label", children: "AI Handled" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon manual", children: _jsx(User, { size: 20 }) }), _jsxs("div", { className: "stat-data", children: [_jsx("span", { className: "stat-value", children: stats.manual_sessions }), _jsx("span", { className: "stat-label", children: "Manual Mode" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon tickets", children: _jsx(AlertCircle, { size: 20 }) }), _jsxs("div", { className: "stat-data", children: [_jsx("span", { className: "stat-value", children: stats.pending_tickets }), _jsx("span", { className: "stat-label", children: "Pending Tickets" })] })] })] })), _jsxs("div", { className: "dashboard-layout", children: [_jsxs("aside", { className: "session-sidebar", children: [_jsxs("div", { className: "sidebar-header", children: [_jsxs("div", { className: "brand-header", children: [_jsx(Bot, { className: "brand-icon" }), _jsx("h2", { children: "Piku Monitor" })] }), _jsxs("div", { className: "view-switcher", children: [_jsxs("button", { className: `view-btn ${view === 'chats' ? 'active' : ''}`, onClick: () => setView('chats'), children: [_jsx(MessageSquare, { size: 16 }), " Chats"] }), _jsxs("button", { className: `view-btn ${view === 'tickets' ? 'active' : ''}`, onClick: () => setView('tickets'), children: [_jsx(AlertCircle, { size: 16 }), " Tickets"] })] }), view === 'chats' && (_jsxs("div", { className: "sidebar-controls", children: [_jsxs("div", { className: "search-box", children: [_jsx(Search, { size: 16 }), _jsx("input", { type: "text", placeholder: "Search...", value: search, onChange: (e) => setSearch(e.target.value) })] }), _jsx("div", { className: "filter-tabs", children: filterTabs.map(tab => (_jsx("button", { className: `filter-tab ${filter === tab.key ? 'active' : ''}`, onClick: () => setFilter(tab.key), children: tab.label }, tab.key))) })] }))] }), _jsx("div", { className: "sidebar-content", children: isLoading && !sessions.length && !tickets.length ? (_jsxs("div", { className: "loading-state", children: [_jsx(Loader2, { className: "animate-spin" }), _jsx("span", { children: "Loading..." })] })) : view === 'chats' ? (_jsx("div", { className: "session-list", children: filteredSessions.map(s => (_jsxs("div", { className: `session-item ${activeSession?.id === s.id ? 'active' : ''}`, onClick: () => selectSession(s), children: [_jsxs("div", { className: "avatar", children: [s.channel === 'email' ? _jsx(Mail, { size: 24 }) : _jsx(UserCircle, { size: 24 }), unreadCounts[s.id] > 0 && _jsx("span", { className: "unread-badge", children: unreadCounts[s.id] }), s.status === 'active' && _jsx("span", { className: "status-dot online" })] }), _jsxs("div", { className: "session-info", children: [_jsxs("div", { className: "session-top", children: [_jsx("span", { className: "name", children: s.customer_name || 'Guest User' }), _jsx("span", { className: "time", children: new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }), _jsxs("div", { className: "session-bottom", children: [_jsx("span", { className: `channel-tag ${s.channel}`, children: s.channel }), s.metadata?.priority_score > 50 && (_jsx("span", { className: "priority-tag critical", children: "Urgent" })), typingSessions[s.id] && _jsx("span", { className: "typing-tag", children: "Typing..." }), !s.is_ai_enabled && s.status === 'active' && _jsx("span", { className: "manual-tag", children: "Manual" })] })] })] }, s.id))) })) : (_jsx("div", { className: "ticket-list", children: tickets.map(t => (_jsxs("div", { className: "ticket-item", children: [_jsx("div", { className: `status-indicator ${t.status}`, title: t.status }), _jsxs("div", { className: "ticket-main", children: [_jsxs("div", { className: "ticket-top", children: [_jsx("span", { className: "ticket-type", children: t.issue_type }), _jsx("span", { className: "ticket-date", children: new Date(t.created_at).toLocaleDateString() })] }), _jsx("div", { className: "ticket-subject", children: t.subject || 'Complaint' }), _jsx("div", { className: "ticket-customer", children: t.name || 'Anonymous' }), _jsx("div", { className: "ticket-footer", children: _jsxs("select", { value: t.status, onChange: (e) => updateTicketStatus(t.id, e.target.value), className: `status-picker ${t.status}`, children: [_jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "open", children: "Open" }), _jsx("option", { value: "resolved", children: "Resolved" }), _jsx("option", { value: "closed", children: "Closed" })] }) })] })] }, t.id))) })) })] }), _jsx("main", { className: "chat-monitor", children: view === 'chats' ? (activeSession ? (_jsxs("div", { className: "monitor-container", children: [_jsxs("div", { className: "monitor-main", children: [_jsxs("header", { className: "monitor-header", children: [_jsxs("div", { className: "user-profile", children: [_jsxs("div", { className: "profile-info", children: [_jsx("h3", { children: activeSession.customer_name || 'Guest User' }), _jsxs("span", { className: "visitor-id", children: ["ID: ", activeSession.visitor_id] })] }), _jsx("button", { className: `panel-toggle ${showSidePanel ? 'active' : ''}`, onClick: () => setShowSidePanel(!showSidePanel), children: _jsx(Info, { size: 18 }) })] }), _jsxs("div", { className: "control-actions", children: [_jsx("button", { className: `ai-toggle ${activeSession.is_ai_enabled ? 'enabled' : 'disabled'}`, onClick: () => toggleAi(activeSession.id, !activeSession.is_ai_enabled), title: activeSession.is_ai_enabled ? "Stop AI to reply manually" : "Let AI handle this chat", children: activeSession.is_ai_enabled ? (_jsxs(_Fragment, { children: [_jsx(Pause, { size: 18 }), " Stop AI & Take Control"] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 18 }), " Resume AI Handling"] })) }), _jsx("button", { className: "end-session-btn", onClick: () => setConfirmEndId(activeSession.id), children: _jsx(Trash2, { size: 18 }) })] })] }), _jsxs("div", { className: "message-history", children: [messages.map(m => (_jsxs("div", { className: `message-row ${m.role}`, children: [_jsx("div", { className: "message-icon", children: m.role === 'user' ? _jsx(User, { size: 16 }) : _jsx(Bot, { size: 16 }) }), _jsxs("div", { className: "message-content", children: [_jsx("div", { className: "message-bubble", dangerouslySetInnerHTML: { __html: renderMarkdown(m.content) } }), _jsx("span", { className: "timestamp", children: new Date(m.created_at).toLocaleTimeString() })] })] }, m.id))), toolStatus[activeSession.id] && (_jsxs("div", { className: "tool-status-indicator", children: [_jsx(Loader2, { className: "animate-spin", size: 14 }), _jsx("span", { children: toolStatus[activeSession.id] })] })), typingSessions[activeSession.id] && (_jsxs("div", { className: "typing-indicator-row", children: [_jsxs("div", { className: "typing-dots", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsx("span", { children: "Customer is typing..." })] }))] }), _jsx("form", { className: "manual-input", onSubmit: handleSend, children: _jsxs("div", { className: "input-wrapper", children: [_jsx("input", { type: "text", placeholder: activeSession.is_ai_enabled ? "Pause AI to reply manually..." : "Type a message...", value: manualText, onChange: handleInputChange, disabled: activeSession.is_ai_enabled }), _jsx("button", { type: "submit", disabled: activeSession.is_ai_enabled || !manualText.trim(), children: _jsx(Send, { size: 20 }) })] }) })] }), showSidePanel && (_jsxs("aside", { className: "customer-info-panel", children: [_jsxs("div", { className: "panel-section", children: [_jsxs("div", { className: "section-header", children: [_jsx(UserCircle, { size: 18 }), _jsx("h4", { children: "Customer Insight" })] }), _jsxs("div", { className: "profile-card", children: [_jsxs("div", { className: "info-row", children: [_jsx("label", { children: "Channel" }), _jsx("span", { className: "status-badge", children: activeSession.channel })] }), _jsxs("div", { className: "info-row", children: [_jsx("label", { children: "Priority" }), _jsxs("span", { children: [activeSession.metadata?.priority_score || 0, "%"] })] })] })] }), _jsxs("div", { className: "panel-section", children: [_jsxs("div", { className: "section-header", children: [_jsx(CreditCard, { size: 18 }), _jsx("h4", { children: "Loyalty & Wallet" })] }), _jsxs("div", { className: "points-card", children: [_jsxs("div", { className: "point-stat", children: [_jsx("span", { className: "stat-value", children: "--" }), _jsx("label", { children: "Points" })] }), _jsxs("div", { className: "point-stat", children: [_jsx("span", { className: "stat-value", children: "--" }), _jsx("label", { children: "Wallet" })] })] }), _jsx("p", { className: "hint-text", children: "Authenticate to see real-time customer data." })] }), _jsxs("div", { className: "panel-section", children: [_jsxs("div", { className: "section-header", children: [_jsx(ShoppingCart, { size: 18 }), _jsx("h4", { children: "Shopping Cart" })] }), _jsx("div", { className: "cart-list empty", children: _jsx("p", { children: "No active cart items found for this session." }) })] })] }))] })) : (_jsxs("div", { className: "empty-monitor", children: [_jsx(Bot, { size: 64, className: "floating-bot" }), _jsx("h2", { children: "Select a Conversation" }), _jsx("p", { children: "Monitor live interactions between Piku and your customers here." })] }))) : (_jsxs("div", { className: "empty-monitor", children: [_jsx(AlertCircle, { size: 64 }), _jsx("h2", { children: "Ticket Management" }), _jsx("p", { children: "Formal claims, cancellations, and issues are listed in the sidebar." }), _jsxs("div", { className: "ticket-guide", children: [_jsx("h3", { children: "Status Legend" }), _jsxs("div", { className: "legend-items", children: [_jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "dot pending" }), " Pending Review"] }), _jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "dot open" }), " Investigation Open"] }), _jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "dot resolved" }), " Resolved"] }), _jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "dot closed" }), " Closed"] })] })] })] })) })] }), confirmEndId && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "confirm-modal", children: [_jsx("h3", { children: "End this session?" }), _jsx("p", { children: "This will archive the chat and disconnect the user." }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn-cancel", onClick: () => setConfirmEndId(null), children: "Keep Active" }), _jsx("button", { className: "btn-danger", onClick: () => handleEndSession(confirmEndId), children: "End Session" })] })] }) }))] }));
};
