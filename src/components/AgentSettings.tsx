"use client";

import React, { useState, useEffect } from 'react';
import { Bot, Save, RefreshCw, CheckCircle2, AlertCircle, Loader2, Cpu, Plug, Zap } from 'lucide-react';
import axios from 'axios';

interface AgentSettingsProps {
    apiUrl: string;
    /** Optional token resolver. Defaults to localStorage keys ['token','tk']. */
    getToken?: () => string | null;
    /** localStorage keys to try for the admin token. Default: ['token','tk']. */
    tokenKeys?: string[];
    /** Admin route prefix. Default: '/api/admin/chat'. */
    adminPrefix?: string;
    /** Whether to show the LLM provider/model panel. Default: true. */
    showProviderSettings?: boolean;
}

interface PromptData {
    system_prompt?: string;
    response_style?: string;
}

interface ProviderData {
    llm_provider?: string;
    llm_base_url?: string;
    llm_api_key?: string;
    llm_model?: string;
    llm_fallback_enabled?: string | boolean;
    llm_fallback_base_url?: string;
    llm_fallback_api_key?: string;
    llm_fallback_model?: string;
    embedding_provider?: string;
    embedding_base_url?: string;
    embedding_api_key?: string;
    embedding_model?: string;
    embedding_dims?: string | number;
}

type Presets = Record<string, { label: string; base_url: string; embed_base_url: string }>;

export const AgentSettings: React.FC<AgentSettingsProps> = ({
    apiUrl,
    getToken,
    tokenKeys = ['token', 'tk'],
    adminPrefix = '/api/admin/chat',
    showProviderSettings = true,
}) => {
    const [activeTab, setActiveTab] = useState<'prompt' | 'provider'>('prompt');

    const [systemPrompt, setSystemPrompt] = useState('');
    const [responseStyle, setResponseStyle] = useState('short');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Provider state
    const [provider, setProvider] = useState<ProviderData>({});
    const [presets, setPresets] = useState<Presets>({});
    const [models, setModels] = useState<string[]>([]);
    const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);

    const api = axios.create({ baseURL: apiUrl, withCredentials: true, timeout: 30000 });

    // Ensure the Sanctum CSRF cookie exists before stateful (write) requests.
    const ensureCsrf = async () => {
        if (typeof document === 'undefined') return;
        if (/(?:^|;\s*)XSRF-TOKEN=/.test(document.cookie)) return;
        try {
            await axios.get(`${apiUrl.replace(/\/$/, '')}/sanctum/csrf-cookie`, { withCredentials: true });
        } catch {
            // Best effort.
        }
    };

    // Auth + CSRF interception (AgentSettings previously had none).
    api.interceptors.request.use(async (config) => {
        const method = (config.method || 'get').toLowerCase();
        if (method !== 'get') await ensureCsrf();

        let raw: string | null = null;
        if (getToken) raw = getToken();
        else if (typeof window !== 'undefined') {
            for (const k of tokenKeys) {
                raw = localStorage.getItem(k);
                if (raw) break;
            }
        }
        if (raw) config.headers.Authorization = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;

        if (typeof document !== 'undefined') {
            const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
            if (m) config.headers['X-XSRF-TOKEN'] = decodeURIComponent(m[1]);
        }
        return config;
    });

    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const res = await api.get(`${adminPrefix}/prompts`);
            const data = res.data?.data || {};
            setSystemPrompt(data.system_prompt || '');
            setResponseStyle(data.response_style || 'short');
        } catch {
            setMessage({ type: 'error', text: 'Failed to load prompts' });
        } finally {
            setLoading(false);
        }
    };

    const fetchProvider = async () => {
        try {
            const res = await api.get(`${adminPrefix}/settings/llm`);
            setProvider(res.data?.data || {});
            setPresets(res.data?.presets || {});
        } catch {
            setMessage({ type: 'error', text: 'Failed to load provider settings' });
        }
    };

    useEffect(() => {
        fetchPrompts();
        if (showProviderSettings) fetchProvider();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl]);

    const handleSavePrompt = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put(`${adminPrefix}/prompts`, { system_prompt: systemPrompt, response_style: responseStyle });
            setMessage({ type: 'success', text: 'Prompt updated. Changes take effect on next AI response.' });
        } catch {
            setMessage({ type: 'error', text: 'Failed to save prompt' });
        } finally {
            setSaving(false);
        }
    };

    const applyPreset = (key: string) => {
        const p = presets[key];
        setProvider((prev) => ({
            ...prev,
            llm_provider: key,
            llm_base_url: p?.base_url ?? prev.llm_base_url,
            embedding_provider: key,
            embedding_base_url: p?.embed_base_url ?? prev.embedding_base_url,
        }));
    };

    const handleSaveProvider = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await api.put(`${adminPrefix}/settings/llm`, provider);
            setMessage({
                type: 'success',
                text: res.data?.warning || 'Provider settings saved. Next AI response uses the new provider.',
            });
        } catch (e: any) {
            setMessage({ type: 'error', text: e?.response?.data?.message || 'Failed to save provider settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleLoadModels = async () => {
        setBusyAction('models');
        setTestResult(null);
        try {
            const res = await api.get(`${adminPrefix}/models`);
            setModels(res.data?.data || []);
        } catch {
            setTestResult({ ok: false, text: 'Could not load models from provider.' });
        } finally {
            setBusyAction(null);
        }
    };

    const handleTest = async () => {
        setBusyAction('test');
        setTestResult(null);
        try {
            const res = await api.post(`${adminPrefix}/settings/test`, {
                base_url: provider.llm_base_url,
                model: provider.llm_model,
            });
            setTestResult({ ok: true, text: `Connected. Model replied: "${res.data?.reply}"` });
        } catch (e: any) {
            setTestResult({ ok: false, text: e?.response?.data?.error || 'Connection failed.' });
        } finally {
            setBusyAction(null);
        }
    };

    const charCount = systemPrompt.length;

    if (loading) {
        return (
            <div className="gunma-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Loader2 className="animate-spin" size={32} />
                <span style={{ marginLeft: 12 }}>Loading settings...</span>
            </div>
        );
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
    };
    const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 600, margin: '12px 0 6px', fontSize: 13 };

    return (
        <div className="gunma-settings" style={{ padding: 24, maxWidth: 900 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Bot size={28} style={{ color: '#10b981' }} />
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Agent Settings</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                        Control how Piku responds and which AI provider powers it.
                    </p>
                </div>
                <button
                    onClick={() => { fetchPrompts(); if (showProviderSettings) fetchProvider(); }}
                    style={{ marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {showProviderSettings && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button
                        onClick={() => setActiveTab('prompt')}
                        style={{
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            border: '1px solid #e2e8f0',
                            background: activeTab === 'prompt' ? '#10b981' : '#fff',
                            color: activeTab === 'prompt' ? '#fff' : '#0f172a',
                        }}
                    >
                        <Bot size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Prompt
                    </button>
                    <button
                        onClick={() => setActiveTab('provider')}
                        style={{
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            border: '1px solid #e2e8f0',
                            background: activeTab === 'provider' ? '#10b981' : '#fff',
                            color: activeTab === 'provider' ? '#fff' : '#0f172a',
                        }}
                    >
                        <Cpu size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Provider & Model
                    </button>
                </div>
            )}

            {(activeTab === 'prompt' || !showProviderSettings) && (
                <>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Response Length</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[
                                { value: 'short', label: 'Short & Direct', desc: '1-3 sentences' },
                                { value: 'balanced', label: 'Balanced', desc: '3-5 sentences' },
                                { value: 'detailed', label: 'Detailed', desc: 'Thorough responses' },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setResponseStyle(opt.value)}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: 10,
                                        border: `2px solid ${responseStyle === opt.value ? '#10b981' : '#e2e8f0'}`,
                                        background: responseStyle === opt.value ? '#f0fdf4' : '#fff',
                                        cursor: 'pointer', textAlign: 'left',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{opt.label}</div>
                                    <div style={{ color: '#64748b', fontSize: 12 }}>{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <label style={{ fontWeight: 600, fontSize: 14 }}>System Prompt</label>
                            <span style={{ fontSize: 12, color: charCount > 3000 ? '#ef4444' : '#64748b' }}>{charCount} characters</span>
                        </div>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            style={{
                                width: '100%', minHeight: 400, padding: 16, borderRadius: 10,
                                border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.6,
                                fontFamily: 'monospace', resize: 'vertical',
                            }}
                            placeholder="Enter the system prompt that defines Piku's behavior..."
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button
                            onClick={handleSavePrompt}
                            disabled={saving}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10,
                                border: 'none', background: '#10b981', color: '#fff', fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                            }}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {message && <MessagePill message={message} />}
                    </div>
                </>
            )}

            {showProviderSettings && activeTab === 'provider' && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Provider Preset</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {Object.entries(presets).map(([key, p]) => (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                                        border: `2px solid ${provider.llm_provider === key ? '#10b981' : '#e2e8f0'}`,
                                        background: provider.llm_provider === key ? '#f0fdf4' : '#fff',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>LLM Base URL (/v1)</label>
                            <input style={inputStyle} value={provider.llm_base_url ?? ''} onChange={(e) => setProvider({ ...provider, llm_base_url: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>LLM Model</label>
                            <input style={inputStyle} value={provider.llm_model ?? ''} onChange={(e) => setProvider({ ...provider, llm_model: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>LLM API Key</label>
                            <input style={inputStyle} type="password" value={provider.llm_api_key ?? ''} onChange={(e) => setProvider({ ...provider, llm_api_key: e.target.value })} placeholder="(unchanged)" />
                        </div>
                        <div>
                            <label style={labelStyle}>Fallback Model</label>
                            <input style={inputStyle} value={provider.llm_fallback_model ?? ''} onChange={(e) => setProvider({ ...provider, llm_fallback_model: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Embedding Base URL</label>
                            <input style={inputStyle} value={provider.embedding_base_url ?? ''} onChange={(e) => setProvider({ ...provider, embedding_base_url: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Embedding Model</label>
                            <input style={inputStyle} value={provider.embedding_model ?? ''} onChange={(e) => setProvider({ ...provider, embedding_model: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Embedding Dimensions</label>
                            <input style={inputStyle} value={provider.embedding_dims ?? ''} onChange={(e) => setProvider({ ...provider, embedding_dims: e.target.value })} />
                        </div>
                    </div>

                    {models.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>Available Models (click to use)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflow: 'auto' }}>
                                {models.map((m) => (
                                    <button key={m} onClick={() => setProvider({ ...provider, llm_model: m })}
                                        style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, cursor: 'pointer' }}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                        <button onClick={handleSaveProvider} disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Provider
                        </button>
                        <button onClick={handleLoadModels} disabled={busyAction === 'models'}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                            {busyAction === 'models' ? <Loader2 className="animate-spin" size={16} /> : <Plug size={16} />} Load Models
                        </button>
                        <button onClick={handleTest} disabled={busyAction === 'test'}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                            {busyAction === 'test' ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />} Test Connection
                        </button>
                    </div>

                    {testResult && (
                        <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 8, fontSize: 13,
                            background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                            color: testResult.ok ? '#166534' : '#991b1b' }}>
                            {testResult.text}
                        </div>
                    )}
                    {message && <div style={{ marginTop: 12 }}><MessagePill message={message} /></div>}
                </div>
            )}
        </div>
    );
};

function MessagePill({ message }: { message: { type: 'success' | 'error'; text: string } }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8,
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: 13,
        }}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
        </div>
    );
}
