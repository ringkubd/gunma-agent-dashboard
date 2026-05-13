"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMonitor, ChatSession, SupportTicket, UseMonitorAuth, UseMonitorPusher, UseMonitorRoutes } from '../hooks/useMonitor';
import { 
    MessageSquare, 
    Bot, 
    User, 
    Pause, 
    Play, 
    Send, 
    Search,
    Clock,
    UserCircle,
    Mail,
    Trash2,
    Filter,
    ShoppingCart,
    CreditCard,
    AlertCircle,
    Info,
    ExternalLink,
    Maximize2,
    Image as ImageIcon,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronDown,
    Stamp,
    Volume2
} from 'lucide-react';

interface AgentDashboardProps {
    apiUrl: string;
    pollInterval?: number;
    pusher?: UseMonitorPusher;
    auth?: UseMonitorAuth;
    broadcastChannel?: string;
    routes?: UseMonitorRoutes;
}

type SessionFilter = 'all' | 'active' | 'manual' | 'ended';

function getInitials(name?: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getInitialsColor(name?: string | null): string {
    if (!name) return '#64748b';
    const colors = ['#0f5132', '#1a7a4a', '#2563eb', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626', '#db2777'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
}

const QUICK_REPLIES = [
    { label: 'Greeting', text: 'Hello! How can I assist you today?' },
    { label: 'Order Status', text: 'Let me check your order status. Could you please provide your order ID?' },
    { label: 'Payment Issue', text: 'I understand you\'re having a payment issue. Let me look into this for you.' },
    { label: 'Delivery', text: 'Your delivery is being processed. I\'ll update you once it\'s on its way.' },
    { label: 'Thanks', text: 'You\'re welcome! Is there anything else I can help with?' },
];

function playNotification() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch {}
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ apiUrl, pollInterval, pusher, auth, broadcastChannel, routes }: AgentDashboardProps) => {
    const { 
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
        endSession
    } = useMonitor(apiUrl, { pollInterval, pusher, auth, broadcastChannel, routes });

    const [view, setView] = useState<'chats' | 'tickets'>('chats');
    const [manualText, setManualText] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<SessionFilter>('all');
    const [confirmEndId, setConfirmEndId] = useState<string | null>(null);
    const [showSidePanel, setShowSidePanel] = useState(true);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [msgSearch, setMsgSearch] = useState('');
    const [prevSessionsLen, setPrevSessionsLen] = useState(0);
    const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = React.useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sound notification on new sessions
    useEffect(() => {
        if (sessions.length > prevSessionsLen && prevSessionsLen > 0) {
            playNotification();
        }
        setPrevSessionsLen(sessions.length);
    }, [sessions.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const renderMarkdown = (text: string): string => {
        if (!text) return '';
        const productBlocks: string[] = [];
        const websiteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gunmahalalfood.com';
        text = text.replace(/:{2,3}product\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]:{2,3}/gs,
            (_, id, title, price, image, slug) => {
                const card = `
                <div class="gunma-product-mini-card" data-id="${id.trim()}">
                    <a href="${websiteUrl}/${slug.trim()}" target="_blank" class="gunma-product-mini-img-link">
                        <img src="${image.trim()}" alt="${title.trim()}" loading="lazy"/>
                    </a>
                    <div class="gunma-product-mini-body">
                        <span class="gunma-product-mini-title">${title.trim()}</span>
                        <div class="gunma-product-mini-footer">
                            <span class="gunma-product-mini-price">৳${price.trim().replace(/\.000$/, '')}</span>
                        </div>
                    </div>
                </div>`;
                productBlocks.push(card);
                return `{{PRODUCT_CARD_${productBlocks.length - 1}}}`;
            }
        );
        const bulkPattern = /\*?\*?\[?🛒 Add ALL Ingredients? to Cart\]?\(?[^)]*\)?\*?\*?/gi;
        text = text.replace(bulkPattern, '');
        text = text.replace(/&(?!amp;)/g, '&amp;').replace(/<(?!(\/?(h[1-6]|br|strong|em|ul|li|p|div|span|hr|img|a|code|button)\b))/g, '&lt;');
        text = text.replace(/^### (.+)$/gm, '<h4 class="gunma-h4">$1</h4>').replace(/^## (.+)$/gm, '<h3 class="gunma-h3">$1</h3>').replace(/^# (.+)$/gm, '<h2 class="gunma-h2">$1</h2>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
        text = text.replace(/^[-*•]\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="gunma-list">$1</ul>');
        text = text.replace(/^(\d+)\.\s+(.+)$/gm, (_, num, content) => `<div class="gunma-step"><span class="gunma-step-num">${num}</span><span>${content}</span></div>`);
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="gunma-msg-img" loading="lazy"/>');
        text = text.replace(/\[IMAGE:\s*(https?:\/\/[^\]]+)\]/g, '<div class="gunma-msg-img-container"><img src="$1" alt="Uploaded image" class="gunma-msg-img gunma-msg-img--uploaded" loading="lazy"/></div>');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="gunma-link">$1</a>');
        text = text.replace(/^---+$/gm, '<hr class="gunma-hr"/>');
        text = text.replace(/\n/g, '<br/>');
        text = text.replace(/(<\/div>|<\/ul>|<\/li>|<\/h[1-4]>|<hr\s?\/?>)<br\/>/g, '$1');
        text = text.replace(/(<br\/>){2,}/g, '<br/>');
        productBlocks.forEach((card, i) => { text = text.replace(`{{PRODUCT_CARD_${i}}}`, card); });
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
        if (view === 'tickets') fetchTickets();
    }, [view]);

    const filteredSessions = sessions.filter(s => {
        const matchesSearch = (s.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) || 
            s.visitor_id.includes(search) ||
            (s.customer_email ?? '').toLowerCase().includes(search.toLowerCase());
        let matchesFilter = true;
        switch (filter) {
            case 'active': matchesFilter = s.status === 'active' && s.is_ai_enabled; break;
            case 'manual': matchesFilter = s.status === 'active' && !s.is_ai_enabled; break;
            case 'ended': matchesFilter = s.status === 'ended'; break;
        }
        return matchesSearch && matchesFilter;
    });

    const filteredMessages = msgSearch
        ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
        : messages;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualText.trim() || !activeSession) return;
        if (isTypingRef.current) { isTypingRef.current = false; sendTyping(activeSession.id, false); }
        await sendManualMessage(activeSession.id, manualText);
        setManualText('');
        setShowQuickReplies(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualText(e.target.value);
        if (!activeSession) return;
        if (!isTypingRef.current) { isTypingRef.current = true; sendTyping(activeSession.id, true); }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            if (isTypingRef.current) { isTypingRef.current = false; sendTyping(activeSession.id, false); }
        }, 3000);
    };

    const handleEndSession = async (sessionId: string) => {
        await endSession(sessionId);
        setConfirmEndId(null);
    };

    const handleQuickReply = (text: string) => {
        setManualText(text);
        setShowQuickReplies(false);
    };

    const filterTabs: { key: SessionFilter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'active', label: 'AI Active' },
        { key: 'manual', label: 'Manual' },
        { key: 'ended', label: 'Ended' },
    ];

    return (
        <div className="gunma-dashboard">
            {stats && (
                <div className="stats-bar">
                    <div className="stat-card">
                        <div className="stat-icon chats"><MessageSquare size={20} /></div>
                        <div className="stat-data">
                            <span className="stat-value">{stats.total_sessions}</span>
                            <span className="stat-label">Total Chats</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon active"><Bot size={20} /></div>
                        <div className="stat-data">
                            <span className="stat-value">{stats.active_sessions}</span>
                            <span className="stat-label">AI Handled</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon manual"><User size={20} /></div>
                        <div className="stat-data">
                            <span className="stat-value">{stats.manual_sessions}</span>
                            <span className="stat-label">Manual Mode</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon tickets"><AlertCircle size={20} /></div>
                        <div className="stat-data">
                            <span className="stat-value">{stats.pending_tickets}</span>
                            <span className="stat-label">Pending Tickets</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-layout">
                <aside className="session-sidebar">
                    <div className="sidebar-header">
                        <div className="brand-header">
                            <Bot className="brand-icon" />
                            <h2>Piku Monitor</h2>
                        </div>
                        <div className="view-switcher">
                            <button className={`view-btn ${view === 'chats' ? 'active' : ''}`} onClick={() => setView('chats')}>
                                <MessageSquare size={16} /> Chats
                            </button>
                            <button className={`view-btn ${view === 'tickets' ? 'active' : ''}`} onClick={() => setView('tickets')}>
                                <AlertCircle size={16} /> Tickets
                            </button>
                        </div>
                        {view === 'chats' && (
                            <div className="sidebar-controls">
                                <div className="search-box">
                                    <Search size={16} />
                                    <input type="text" placeholder="Search by name, email or ID..." value={search}
                                        onChange={(e) => setSearch(e.target.value)} />
                                </div>
                                <div className="filter-tabs">
                                    {filterTabs.map(tab => (
                                        <button key={tab.key} className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                                            onClick={() => setFilter(tab.key)}>{tab.label}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sidebar-content">
                        {isLoading && !sessions.length && !tickets.length ? (
                            <div className="loading-state">
                                <Loader2 className="animate-spin" />
                                <span>Loading...</span>
                            </div>
                        ) : view === 'chats' ? (
                            <div className="session-list">
                                {filteredSessions.map(s => (
                                    <div key={s.id} className={`session-item ${activeSession?.id === s.id ? 'active' : ''}`}
                                        onClick={() => selectSession(s)}>
                                        <div className="avatar">
                                            {s.channel === 'email' ? <Mail size={24} /> : (
                                                <div className="initials-circle" style={{ backgroundColor: getInitialsColor(s.customer_name) }}>
                                                    {getInitials(s.customer_name)}
                                                </div>
                                            )}
                                            {unreadCounts[s.id] > 0 && <span className="unread-badge">{unreadCounts[s.id]}</span>}
                                            {s.status === 'active' && <span className="status-dot online" />}
                                        </div>
                                        <div className="session-info">
                                            <div className="session-top">
                                                <span className="name">{s.customer_name || 'Guest User'}</span>
                                                <span className="time" title={new Date(s.updated_at).toLocaleString()}>{timeAgo(s.updated_at)}</span>
                                            </div>
                                            {s.customer_email && <span className="email-line">{s.customer_email}</span>}
                                            <div className="session-bottom">
                                                <span className={`channel-tag ${s.channel}`}>{s.channel}</span>
                                                {(s as any).metadata?.priority_score > 50 && <span className="priority-tag critical">Urgent</span>}
                                                {typingSessions[s.id] && <span className="typing-tag">Typing...</span>}
                                                {!s.is_ai_enabled && s.status === 'active' && <span className="manual-tag">Manual</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!isLoading && filteredSessions.length === 0 && (
                                    <div className="empty-list">No sessions found</div>
                                )}
                            </div>
                        ) : (
                            <div className="ticket-list">
                                {tickets.map(t => (
                                    <div key={t.id} className="ticket-item">
                                        <div className={`status-indicator ${t.status}`} title={t.status} />
                                        <div className="ticket-main">
                                            <div className="ticket-top">
                                                <span className="ticket-type">{t.issue_type}</span>
                                                <span className="ticket-date">{timeAgo(t.created_at)}</span>
                                            </div>
                                            <div className="ticket-subject">{t.subject || 'Complaint'}</div>
                                            <div className="ticket-customer">{t.name || 'Anonymous'}</div>
                                            <div className="ticket-footer">
                                                <select value={t.status} onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                                                    className={`status-picker ${t.status}`}>
                                                    <option value="pending">Pending</option>
                                                    <option value="open">Open</option>
                                                    <option value="resolved">Resolved</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="chat-monitor">
                    {view === 'chats' ? (
                        activeSession ? (
                            <div className="monitor-container">
                                <div className="monitor-main">
                                    <header className="monitor-header">
                                        <div className="user-profile">
                                            <div className="initials-circle large" style={{ backgroundColor: getInitialsColor(activeSession.customer_name) }}>
                                                {getInitials(activeSession.customer_name)}
                                            </div>
                                            <div className="profile-info">
                                                <h3>{activeSession.customer_name || 'Guest User'}</h3>
                                                <span className="visitor-id">
                                                    {activeSession.customer_email || `ID: ${activeSession.visitor_id}`}
                                                    {activeSession.customer_email && <span className="id-hint"> · {activeSession.visitor_id}</span>}
                                                </span>
                                            </div>
                                            <button className={`panel-toggle ${showSidePanel ? 'active' : ''}`}
                                                onClick={() => setShowSidePanel(!showSidePanel)}>
                                                <Info size={18} />
                                            </button>
                                        </div>
                                        <div className="control-actions">
                                            <button className={`ai-toggle ${activeSession.is_ai_enabled ? 'enabled' : 'disabled'}`}
                                                onClick={() => toggleAi(activeSession.id, !activeSession.is_ai_enabled)}
                                                title={activeSession.is_ai_enabled ? "Stop AI to reply manually" : "Let AI handle this chat"}>
                                                {activeSession.is_ai_enabled ? <><Pause size={18} /> Stop AI</> : <><Play size={18} /> Resume AI</>}
                                            </button>
                                            <button className="end-session-btn" onClick={() => setConfirmEndId(activeSession.id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </header>

                                    {messages.length > 5 && (
                                        <div className="msg-search-bar">
                                            <Search size={14} />
                                            <input type="text" placeholder="Search in messages..." value={msgSearch}
                                                onChange={(e) => setMsgSearch(e.target.value)} />
                                            {msgSearch && <XCircle size={16} className="msg-search-clear" onClick={() => setMsgSearch('')} />}
                                        </div>
                                    )}

                                    <div className="message-history">
                                        {filteredMessages.length === 0 && msgSearch ? (
                                            <div className="empty-msg-search">No messages match your search</div>
                                        ) : (
                                            filteredMessages.map(m => (
                                                <div key={m.id} className={`message-row ${m.role}`}>
                                                    <div className="message-icon">
                                                        {m.role === 'user' ? (
                                                            <div className="initials-circle small" style={{ backgroundColor: getInitialsColor(activeSession.customer_name) }}>
                                                                {getInitials(activeSession.customer_name)}
                                                            </div>
                                                        ) : <Bot size={16} />}
                                                    </div>
                                                    <div className="message-content">
                                                        <div className="message-meta">
                                                            <span className="message-sender">{m.role === 'user' ? (activeSession.customer_name || 'Customer') : 'Piku AI'}</span>
                                                            <span className="timestamp">{new Date(m.created_at).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="message-bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {toolStatus[activeSession.id] && (
                                            <div className="tool-status-indicator">
                                                <Loader2 className="animate-spin" size={14} />
                                                <span>{toolStatus[activeSession.id]}</span>
                                            </div>
                                        )}
                                        {typingSessions[activeSession.id] && (
                                            <div className="typing-indicator-row">
                                                <div className="typing-dots"><span></span><span></span><span></span></div>
                                                <span>{activeSession.customer_name || 'Customer'} is typing...</span>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <div className="input-area">
                                        {showQuickReplies && (
                                            <div className="quick-replies-panel">
                                                {QUICK_REPLIES.map((qr, i) => (
                                                    <button key={i} className="quick-reply-btn" onClick={() => handleQuickReply(qr.text)}>
                                                        {qr.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <form className="manual-input" onSubmit={handleSend}>
                                            <div className="input-wrapper">
                                                <button type="button" className="quick-reply-toggle" onClick={() => setShowQuickReplies(!showQuickReplies)}
                                                    title="Quick replies">
                                                    <Stamp size={18} />
                                                </button>
                                                <input type="text"
                                                    placeholder={activeSession.is_ai_enabled ? "Pause AI to reply..." : "Type a message..."}
                                                    value={manualText} onChange={handleInputChange} disabled={activeSession.is_ai_enabled} />
                                                <button type="submit" disabled={activeSession.is_ai_enabled || !manualText.trim()}>
                                                    <Send size={20} />
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {showSidePanel && (
                                    <aside className="customer-info-panel">
                                        <div className="panel-section">
                                            <div className="section-header"><UserCircle size={18} /><h4>Customer Insight</h4></div>
                                            <div className="profile-card">
                                                <div className="info-row"><label>Channel</label><span className="status-badge">{activeSession.channel}</span></div>
                                                <div className="info-row"><label>Name</label><span>{activeSession.customer_name || 'Guest'}</span></div>
                                                <div className="info-row"><label>Email</label><span>{activeSession.customer_email || '—'}</span></div>
                                                <div className="info-row"><label>Visitor ID</label><span className="visitor-id">{activeSession.visitor_id}</span></div>
                                                <div className="info-row"><label>Priority</label><span>{(activeSession as any).metadata?.priority_score || 0}%</span></div>
                                                <div className="info-row"><label>Status</label><span className={`status-badge ${activeSession.status}`}>{activeSession.status}</span></div>
                                            </div>
                                        </div>
                                        <div className="panel-section">
                                            <div className="section-header"><CreditCard size={18} /><h4>Loyalty & Wallet</h4></div>
                                            <div className="points-card">
                                                <div className="point-stat"><span className="stat-value">--</span><label>Points</label></div>
                                                <div className="point-stat"><span className="stat-value">--</span><label>Wallet</label></div>
                                            </div>
                                            <p className="hint-text">Connect customer account to see loyalty data.</p>
                                        </div>
                                        <div className="panel-section">
                                            <div className="section-header"><ShoppingCart size={18} /><h4>Shopping Cart</h4></div>
                                            <div className="cart-list empty"><p>No active cart items.</p></div>
                                        </div>
                                    </aside>
                                )}
                            </div>
                        ) : (
                            <div className="empty-monitor">
                                <Bot size={64} className="floating-bot" />
                                <h2>Select a Conversation</h2>
                                <p>Monitor live interactions between Piku and your customers here.</p>
                            </div>
                        )
                    ) : (
                        <div className="empty-monitor">
                            <AlertCircle size={64} />
                            <h2>Ticket Management</h2>
                            <p>Formal claims, cancellations, and issues are listed in the sidebar.</p>
                            <div className="ticket-guide">
                                <h3>Status Legend</h3>
                                <div className="legend-items">
                                    <div className="legend-item"><span className="dot pending" /> Pending Review</div>
                                    <div className="legend-item"><span className="dot open" /> Investigation Open</div>
                                    <div className="legend-item"><span className="dot resolved" /> Resolved</div>
                                    <div className="legend-item"><span className="dot closed" /> Closed</div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            
            {confirmEndId && (
                <div className="modal-overlay">
                    <div className="confirm-modal">
                        <h3>End this session?</h3>
                        <p>This will archive the chat and disconnect the user.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setConfirmEndId(null)}>Keep Active</button>
                            <button className="btn-danger" onClick={() => handleEndSession(confirmEndId)}>End Session</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
