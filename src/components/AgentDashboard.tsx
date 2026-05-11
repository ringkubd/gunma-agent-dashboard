"use client";

import React, { useState, useEffect } from 'react';
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
    Loader2
} from 'lucide-react';

interface AgentDashboardProps {
    apiUrl: string;
    /** Auto-refresh interval in ms (0 = disabled). Default: 15000 */
    pollInterval?: number;
    /** Pusher/Echo real-time configuration. Required for WebSocket features. */
    pusher?: UseMonitorPusher;
    /** Authentication configuration. */
    auth?: UseMonitorAuth;
    /** Private channel name. Default: 'gunma-admin.chats' */
    broadcastChannel?: string;
    /** API route overrides. */
    routes?: UseMonitorRoutes;
}

type SessionFilter = 'all' | 'active' | 'manual' | 'ended';

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
    const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = React.useRef(false);

    const renderMarkdown = (text: string): string => {
        if (!text) return '';

        // ── Step 1: Extract and replace product blocks ──
        const productBlocks: string[] = [];
        const websiteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gunmahalalfood.com';

        // Use /s flag to allow dot to match newlines inside the product block
        text = text.replace(/:{2,3}product\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]:{2,3}/gs,
            (_, id, title, price, image, slug) => {
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
            }
        );

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
        text = text.replace(/^(\d+)\.\s+(.+)$/gm,
            (_, num, content) =>
                `<div class="gunma-step"><span class="gunma-step-num">${num}</span><span>${content}</span></div>`
        );

        // ── Step 8: Images ──
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
            '<img src="$2" alt="$1" class="gunma-msg-img" loading="lazy"/>');
        
        text = text.replace(/\[IMAGE:\s*(https?:\/\/[^\]]+)\]/g,
            '<div class="gunma-msg-img-container"><img src="$1" alt="Uploaded image" class="gunma-msg-img gunma-msg-img--uploaded" loading="lazy"/></div>');

        // ── Step 9: Links ──
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener" class="gunma-link">$1</a>');

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
        text = text.replace(
            /(<div class="gunma-product-mini-card".*?<\/div>(\s|<br\/?>)*)+/g,
            (match) => {
                const cardsOnly = match.replace(/<br\/?>/g, '').trim();
                return `<div class="gunma-product-grid">${cardsOnly}</div>`;
            }
        );

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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualText.trim() || !activeSession) return;
        
        if (isTypingRef.current) {
            isTypingRef.current = false;
            sendTyping(activeSession.id, false);
        }

        await sendManualMessage(activeSession.id, manualText);
        setManualText('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualText(e.target.value);
        if (!activeSession) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            sendTyping(activeSession.id, true);
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                sendTyping(activeSession.id, false);
            }
        }, 3000);
    };

    const handleEndSession = async (sessionId: string) => {
        await endSession(sessionId);
        setConfirmEndId(null);
    };

    const filterTabs: { key: SessionFilter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'active', label: 'AI Active' },
        { key: 'manual', label: 'Manual' },
        { key: 'ended', label: 'Ended' },
    ];

    const [showSidePanel, setShowSidePanel] = useState(true);

    return (
        <div className="gunma-dashboard">
            {/* Stats Header */}
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
                {/* Sidebar */}
                <aside className="session-sidebar">
                    <div className="sidebar-header">
                        <div className="brand-header">
                            <Bot className="brand-icon" />
                            <h2>Piku Monitor</h2>
                        </div>

                        <div className="view-switcher">
                            <button 
                                className={`view-btn ${view === 'chats' ? 'active' : ''}`}
                                onClick={() => setView('chats')}
                            >
                                <MessageSquare size={16} /> Chats
                            </button>
                            <button 
                                className={`view-btn ${view === 'tickets' ? 'active' : ''}`}
                                onClick={() => setView('tickets')}
                            >
                                <AlertCircle size={16} /> Tickets
                            </button>
                        </div>
                        
                        {view === 'chats' && (
                            <div className="sidebar-controls">
                                <div className="search-box">
                                    <Search size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="filter-tabs">
                                    {filterTabs.map(tab => (
                                        <button
                                            key={tab.key}
                                            className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                                            onClick={() => setFilter(tab.key)}
                                        >
                                            {tab.label}
                                        </button>
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
                                    <div 
                                        key={s.id} 
                                        className={`session-item ${activeSession?.id === s.id ? 'active' : ''}`}
                                        onClick={() => selectSession(s)}
                                    >
                                        <div className="avatar">
                                            {s.channel === 'email' ? <Mail size={24} /> : <UserCircle size={24} />}
                                            {unreadCounts[s.id] > 0 && <span className="unread-badge">{unreadCounts[s.id]}</span>}
                                            {s.status === 'active' && <span className="status-dot online" />}
                                        </div>
                                        <div className="session-info">
                                            <div className="session-top">
                                                <span className="name">{s.customer_name || 'Guest User'}</span>
                                                <span className="time">{new Date(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="session-bottom">
                                                <span className={`channel-tag ${s.channel}`}>{s.channel}</span>
                                                {(s as any).metadata?.priority_score > 50 && (
                                                    <span className="priority-tag critical">Urgent</span>
                                                )}
                                                {typingSessions[s.id] && <span className="typing-tag">Typing...</span>}
                                                {!s.is_ai_enabled && s.status === 'active' && <span className="manual-tag">Manual</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="ticket-list">
                                {tickets.map(t => (
                                    <div key={t.id} className="ticket-item">
                                        <div className={`status-indicator ${t.status}`} title={t.status} />
                                        <div className="ticket-main">
                                            <div className="ticket-top">
                                                <span className="ticket-type">{t.issue_type}</span>
                                                <span className="ticket-date">{new Date(t.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="ticket-subject">{t.subject || 'Complaint'}</div>
                                            <div className="ticket-customer">{t.name || 'Anonymous'}</div>
                                            <div className="ticket-footer">
                                                <select 
                                                    value={t.status} 
                                                    onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                                                    className={`status-picker ${t.status}`}
                                                >
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

                {/* Main Content Area */}
                <main className="chat-monitor">
                    {view === 'chats' ? (
                        activeSession ? (
                            <div className="monitor-container">
                                <div className="monitor-main">
                                    <header className="monitor-header">
                                        <div className="user-profile">
                                            <div className="profile-info">
                                                <h3>{activeSession.customer_name || 'Guest User'}</h3>
                                                <span className="visitor-id">ID: {activeSession.visitor_id}</span>
                                            </div>
                                            <button 
                                                className={`panel-toggle ${showSidePanel ? 'active' : ''}`}
                                                onClick={() => setShowSidePanel(!showSidePanel)}
                                            >
                                                <Info size={18} />
                                            </button>
                                        </div>

                                        <div className="control-actions">
                                            <button 
                                                className={`ai-toggle ${activeSession.is_ai_enabled ? 'enabled' : 'disabled'}`}
                                                onClick={() => toggleAi(activeSession.id, !activeSession.is_ai_enabled)}
                                                title={activeSession.is_ai_enabled ? "Stop AI to reply manually" : "Let AI handle this chat"}
                                            >
                                                {activeSession.is_ai_enabled ? (
                                                    <><Pause size={18} /> Stop AI & Take Control</>
                                                ) : (
                                                    <><Play size={18} /> Resume AI Handling</>
                                                )}
                                            </button>
                                            
                                            <button 
                                                className="end-session-btn"
                                                onClick={() => setConfirmEndId(activeSession.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </header>

                                    <div className="message-history">
                                        {messages.map(m => (
                                            <div key={m.id} className={`message-row ${m.role}`}>
                                                <div className="message-icon">
                                                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                                </div>
                                                <div className="message-content">
                                                    <div 
                                                        className="message-bubble"
                                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                                                    />
                                                    <span className="timestamp">{new Date(m.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {toolStatus[activeSession.id] && (
                                            <div className="tool-status-indicator">
                                                <Loader2 className="animate-spin" size={14} />
                                                <span>{toolStatus[activeSession.id]}</span>
                                            </div>
                                        )}
                                        {typingSessions[activeSession.id] && (
                                            <div className="typing-indicator-row">
                                                <div className="typing-dots">
                                                    <span></span><span></span><span></span>
                                                </div>
                                                <span>Customer is typing...</span>
                                            </div>
                                        )}
                                    </div>

                                    <form className="manual-input" onSubmit={handleSend}>
                                        <div className="input-wrapper">
                                            <input 
                                                type="text" 
                                                placeholder={activeSession.is_ai_enabled ? "Pause AI to reply manually..." : "Type a message..."}
                                                value={manualText}
                                                onChange={handleInputChange}
                                                disabled={activeSession.is_ai_enabled}
                                            />
                                            <button type="submit" disabled={activeSession.is_ai_enabled || !manualText.trim()}>
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {showSidePanel && (
                                    <aside className="customer-info-panel">
                                        <div className="panel-section">
                                            <div className="section-header">
                                                <UserCircle size={18} />
                                                <h4>Customer Insight</h4>
                                            </div>
                                            <div className="profile-card">
                                                <div className="info-row">
                                                    <label>Channel</label>
                                                    <span className="status-badge">{activeSession.channel}</span>
                                                </div>
                                                <div className="info-row">
                                                    <label>Priority</label>
                                                    <span>{(activeSession as any).metadata?.priority_score || 0}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="panel-section">
                                            <div className="section-header">
                                                <CreditCard size={18} />
                                                <h4>Loyalty & Wallet</h4>
                                            </div>
                                            <div className="points-card">
                                                <div className="point-stat">
                                                    <span className="stat-value">--</span>
                                                    <label>Points</label>
                                                </div>
                                                <div className="point-stat">
                                                    <span className="stat-value">--</span>
                                                    <label>Wallet</label>
                                                </div>
                                            </div>
                                            <p className="hint-text">Authenticate to see real-time customer data.</p>
                                        </div>

                                        <div className="panel-section">
                                            <div className="section-header">
                                                <ShoppingCart size={18} />
                                                <h4>Shopping Cart</h4>
                                            </div>
                                            <div className="cart-list empty">
                                                <p>No active cart items found for this session.</p>
                                            </div>
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
