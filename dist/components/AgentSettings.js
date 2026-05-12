"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Bot, Save, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
export const AgentSettings = ({ apiUrl }) => {
    const [prompts, setPrompts] = useState({});
    const [systemPrompt, setSystemPrompt] = useState('');
    const [responseStyle, setResponseStyle] = useState('short');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const api = axios.create({
        baseURL: apiUrl,
        withCredentials: true,
        timeout: 30000,
    });
    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/chat/prompts');
            const data = res.data?.data || {};
            setPrompts(data);
            setSystemPrompt(data.system_prompt || '');
            setResponseStyle(data.response_style || 'short');
        }
        catch (err) {
            setMessage({ type: 'error', text: 'Failed to load prompts' });
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchPrompts();
    }, [apiUrl]);
    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/api/admin/chat/prompts', {
                system_prompt: systemPrompt,
                response_style: responseStyle,
            });
            setMessage({ type: 'success', text: 'Prompt updated successfully. Changes take effect on next AI response.' });
        }
        catch (err) {
            setMessage({ type: 'error', text: 'Failed to save prompt' });
        }
        finally {
            setSaving(false);
        }
    };
    const charCount = systemPrompt.length;
    if (loading) {
        return (_jsxs("div", { className: "gunma-loading", style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }, children: [_jsx(Loader2, { className: "animate-spin", size: 32 }), _jsx("span", { style: { marginLeft: 12 }, children: "Loading prompt settings..." })] }));
    }
    return (_jsxs("div", { className: "gunma-settings", style: { padding: 24, maxWidth: 900 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }, children: [_jsx(Bot, { size: 28, style: { color: '#10b981' } }), _jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 20, fontWeight: 700 }, children: "Agent Settings" }), _jsx("p", { style: { margin: '4px 0 0', color: '#64748b', fontSize: 13 }, children: "Control how Piku responds to customers. Changes apply to new conversations." })] }), _jsx("button", { onClick: fetchPrompts, style: { marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }, title: "Refresh", children: _jsx(RefreshCw, { size: 16 }) })] }), _jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("label", { style: { display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }, children: "Response Length" }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: [
                            { value: 'short', label: 'Short & Direct', desc: '1-3 sentences' },
                            { value: 'balanced', label: 'Balanced', desc: '3-5 sentences' },
                            { value: 'detailed', label: 'Detailed', desc: 'Thorough responses' },
                        ].map((opt) => (_jsxs("button", { onClick: () => setResponseStyle(opt.value), style: {
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: 10,
                                border: `2px solid ${responseStyle === opt.value ? '#10b981' : '#e2e8f0'}`,
                                background: responseStyle === opt.value ? '#f0fdf4' : '#fff',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 2 }, children: opt.label }), _jsx("div", { style: { color: '#64748b', fontSize: 12 }, children: opt.desc })] }, opt.value))) })] }), _jsxs("div", { style: { marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("label", { style: { fontWeight: 600, fontSize: 14 }, children: "System Prompt" }), _jsxs("span", { style: { fontSize: 12, color: charCount > 3000 ? '#ef4444' : '#64748b' }, children: [charCount, " characters"] })] }), _jsx("textarea", { value: systemPrompt, onChange: (e) => setSystemPrompt(e.target.value), style: {
                            width: '100%',
                            minHeight: 400,
                            padding: 16,
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontFamily: 'monospace',
                            resize: 'vertical',
                        }, placeholder: "Enter the system prompt that defines Piku's behavior..." })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16 }, children: [_jsxs("button", { onClick: handleSave, disabled: saving, style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 24px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#10b981',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                        }, children: [saving ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(Save, { size: 16 }), saving ? 'Saving...' : 'Save Changes'] }), message && (_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: message.type === 'success' ? '#166534' : '#991b1b',
                            fontSize: 13,
                        }, children: [message.type === 'success' ? _jsx(CheckCircle2, { size: 16 }) : _jsx(AlertCircle, { size: 16 }), message.text] }))] })] }));
};
