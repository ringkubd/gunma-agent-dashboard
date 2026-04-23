"use client";

import React, { useState, useEffect } from 'react';
import { useMonitor, ChatSession, SupportTicket } from '../hooks/useMonitor';
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
}

type SessionFilter = 'all' | 'active' | 'manual' | 'ended';

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ apiUrl, pollInterval }: AgentDashboardProps) => {
    const { 
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
        endSession
    } = useMonitor(apiUrl, { pollInterval });

    const [view, setView] = useState<'chats' | 'tickets'>('chats');
    const [manualText, setManualText] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<SessionFilter>('all');
    const [confirmEndId, setConfirmEndId] = useState<string | null>(null);

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
        
        await sendManualMessage(activeSession.id, manualText);
        setManualText('');
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
                                            >
                                                {activeSession.is_ai_enabled ? (
                                                    <><Bot size={18} /> AI Handling</>
                                                ) : (
                                                    <><Pause size={18} /> Manual Mode</>
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
                                                    <div className="message-bubble">
                                                        {m.content.includes('[IMAGE: ') ? (
                                                            <div className="image-attachment">
                                                                <ImageIcon size={14} /> 
                                                                <span>Attachment</span>
                                                                <img 
                                                                    src={m.content.match(/\[IMAGE:\s*(.+?)\]/)?.[1]} 
                                                                    alt="Attached" 
                                                                    className="dashboard-msg-img"
                                                                    onClick={() => window.open(m.content.match(/\[IMAGE:\s*(.+?)\]/)?.[1], '_blank')}
                                                                />
                                                            </div>
                                                        ) : (
                                                            m.content
                                                        )}
                                                    </div>
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
                                    </div>

                                    <form className="manual-input" onSubmit={handleSend}>
                                        <div className="input-wrapper">
                                            <input 
                                                type="text" 
                                                placeholder={activeSession.is_ai_enabled ? "Pause AI to reply manually..." : "Type a message..."}
                                                value={manualText}
                                                onChange={(e) => setManualText(e.target.value)}
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
