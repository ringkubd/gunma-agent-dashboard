"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Bot, Save, RefreshCw, CheckCircle2, AlertCircle, Loader2, Cpu, Plug, Zap } from 'lucide-react';
import axios from 'axios';
export const AgentSettings = ({ apiUrl, getToken, tokenKeys = ['token', 'tk'], adminPrefix = '/api/admin/chat', showProviderSettings = true, }) => {
    const [activeTab, setActiveTab] = useState('prompt');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [responseStyle, setResponseStyle] = useState('short');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    // Provider state
    const [provider, setProvider] = useState({});
    const [presets, setPresets] = useState({});
    const [models, setModels] = useState([]);
    const [testResult, setTestResult] = useState(null);
    const [busyAction, setBusyAction] = useState(null);
    const api = axios.create({ baseURL: apiUrl, withCredentials: true, timeout: 30000 });
    // Ensure the Sanctum CSRF cookie exists before stateful (write) requests.
    const ensureCsrf = async () => {
        if (typeof document === 'undefined')
            return;
        if (/(?:^|;\s*)XSRF-TOKEN=/.test(document.cookie))
            return;
        try {
            await axios.get(`${apiUrl.replace(/\/$/, '')}/sanctum/csrf-cookie`, { withCredentials: true });
        }
        catch {
            // Best effort.
        }
    };
    // Auth + CSRF interception (AgentSettings previously had none).
    api.interceptors.request.use(async (config) => {
        const method = (config.method || 'get').toLowerCase();
        if (method !== 'get')
            await ensureCsrf();
        let raw = null;
        if (getToken)
            raw = getToken();
        else if (typeof window !== 'undefined') {
            for (const k of tokenKeys) {
                raw = localStorage.getItem(k);
                if (raw)
                    break;
            }
        }
        if (raw)
            config.headers.Authorization = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
        if (typeof document !== 'undefined') {
            const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
            if (m)
                config.headers['X-XSRF-TOKEN'] = decodeURIComponent(m[1]);
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
        }
        catch {
            setMessage({ type: 'error', text: 'Failed to load prompts' });
        }
        finally {
            setLoading(false);
        }
    };
    const fetchProvider = async () => {
        try {
            const res = await api.get(`${adminPrefix}/settings/llm`);
            setProvider(res.data?.data || {});
            setPresets(res.data?.presets || {});
        }
        catch {
            setMessage({ type: 'error', text: 'Failed to load provider settings' });
        }
    };
    useEffect(() => {
        fetchPrompts();
        if (showProviderSettings)
            fetchProvider();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl]);
    const handleSavePrompt = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put(`${adminPrefix}/prompts`, { system_prompt: systemPrompt, response_style: responseStyle });
            setMessage({ type: 'success', text: 'Prompt updated. Changes take effect on next AI response.' });
        }
        catch {
            setMessage({ type: 'error', text: 'Failed to save prompt' });
        }
        finally {
            setSaving(false);
        }
    };
    const applyPreset = (key) => {
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
        }
        catch (e) {
            setMessage({ type: 'error', text: e?.response?.data?.message || 'Failed to save provider settings' });
        }
        finally {
            setSaving(false);
        }
    };
    const handleLoadModels = async () => {
        setBusyAction('models');
        setTestResult(null);
        try {
            const res = await api.get(`${adminPrefix}/models`);
            setModels(res.data?.data || []);
        }
        catch {
            setTestResult({ ok: false, text: 'Could not load models from provider.' });
        }
        finally {
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
        }
        catch (e) {
            setTestResult({ ok: false, text: e?.response?.data?.error || 'Connection failed.' });
        }
        finally {
            setBusyAction(null);
        }
    };
    const charCount = systemPrompt.length;
    if (loading) {
        return (_jsxs("div", { className: "gunma-loading", style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }, children: [_jsx(Loader2, { className: "animate-spin", size: 32 }), _jsx("span", { style: { marginLeft: 12 }, children: "Loading settings..." })] }));
    }
    const inputStyle = {
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
    };
    const labelStyle = { display: 'block', fontWeight: 600, margin: '12px 0 6px', fontSize: 13 };
    return (_jsxs("div", { className: "gunma-settings", style: { padding: 24, maxWidth: 900 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }, children: [_jsx(Bot, { size: 28, style: { color: '#10b981' } }), _jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 20, fontWeight: 700 }, children: "Agent Settings" }), _jsx("p", { style: { margin: '4px 0 0', color: '#64748b', fontSize: 13 }, children: "Control how Piku responds and which AI provider powers it." })] }), _jsx("button", { onClick: () => { fetchPrompts(); if (showProviderSettings)
                            fetchProvider(); }, style: { marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }, title: "Refresh", children: _jsx(RefreshCw, { size: 16 }) })] }), showProviderSettings && (_jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 20 }, children: [_jsxs("button", { onClick: () => setActiveTab('prompt'), style: {
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            border: '1px solid #e2e8f0',
                            background: activeTab === 'prompt' ? '#10b981' : '#fff',
                            color: activeTab === 'prompt' ? '#fff' : '#0f172a',
                        }, children: [_jsx(Bot, { size: 14, style: { verticalAlign: '-2px', marginRight: 6 } }), " Prompt"] }), _jsxs("button", { onClick: () => setActiveTab('provider'), style: {
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            border: '1px solid #e2e8f0',
                            background: activeTab === 'provider' ? '#10b981' : '#fff',
                            color: activeTab === 'provider' ? '#fff' : '#0f172a',
                        }, children: [_jsx(Cpu, { size: 14, style: { verticalAlign: '-2px', marginRight: 6 } }), " Provider & Model"] })] })), (activeTab === 'prompt' || !showProviderSettings) && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("label", { style: { display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }, children: "Response Length" }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: [
                                    { value: 'short', label: 'Short & Direct', desc: '1-3 sentences' },
                                    { value: 'balanced', label: 'Balanced', desc: '3-5 sentences' },
                                    { value: 'detailed', label: 'Detailed', desc: 'Thorough responses' },
                                ].map((opt) => (_jsxs("button", { onClick: () => setResponseStyle(opt.value), style: {
                                        flex: 1, padding: '12px 16px', borderRadius: 10,
                                        border: `2px solid ${responseStyle === opt.value ? '#10b981' : '#e2e8f0'}`,
                                        background: responseStyle === opt.value ? '#f0fdf4' : '#fff',
                                        cursor: 'pointer', textAlign: 'left',
                                    }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 2 }, children: opt.label }), _jsx("div", { style: { color: '#64748b', fontSize: 12 }, children: opt.desc })] }, opt.value))) })] }), _jsxs("div", { style: { marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("label", { style: { fontWeight: 600, fontSize: 14 }, children: "System Prompt" }), _jsxs("span", { style: { fontSize: 12, color: charCount > 3000 ? '#ef4444' : '#64748b' }, children: [charCount, " characters"] })] }), _jsx("textarea", { value: systemPrompt, onChange: (e) => setSystemPrompt(e.target.value), style: {
                                    width: '100%', minHeight: 400, padding: 16, borderRadius: 10,
                                    border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.6,
                                    fontFamily: 'monospace', resize: 'vertical',
                                }, placeholder: "Enter the system prompt that defines Piku's behavior..." })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16 }, children: [_jsxs("button", { onClick: handleSavePrompt, disabled: saving, style: {
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10,
                                    border: 'none', background: '#10b981', color: '#fff', fontWeight: 600,
                                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                                }, children: [saving ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(Save, { size: 16 }), saving ? 'Saving...' : 'Save Changes'] }), message && _jsx(MessagePill, { message: message })] })] })), showProviderSettings && activeTab === 'provider' && (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }, children: "Provider Preset" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: Object.entries(presets).map(([key, p]) => (_jsx("button", { onClick: () => applyPreset(key), style: {
                                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                                        border: `2px solid ${provider.llm_provider === key ? '#10b981' : '#e2e8f0'}`,
                                        background: provider.llm_provider === key ? '#f0fdf4' : '#fff',
                                    }, children: p.label }, key))) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "LLM Base URL (/v1)" }), _jsx("input", { style: inputStyle, value: provider.llm_base_url ?? '', onChange: (e) => setProvider({ ...provider, llm_base_url: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "LLM Model" }), _jsx("input", { style: inputStyle, value: provider.llm_model ?? '', onChange: (e) => setProvider({ ...provider, llm_model: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "LLM API Key" }), _jsx("input", { style: inputStyle, type: "password", value: provider.llm_api_key ?? '', onChange: (e) => setProvider({ ...provider, llm_api_key: e.target.value }), placeholder: "(unchanged)" })] }), _jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "Fallback Model" }), _jsx("input", { style: inputStyle, value: provider.llm_fallback_model ?? '', onChange: (e) => setProvider({ ...provider, llm_fallback_model: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "Embedding Base URL" }), _jsx("input", { style: inputStyle, value: provider.embedding_base_url ?? '', onChange: (e) => setProvider({ ...provider, embedding_base_url: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "Embedding Model" }), _jsx("input", { style: inputStyle, value: provider.embedding_model ?? '', onChange: (e) => setProvider({ ...provider, embedding_model: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: labelStyle, children: "Embedding Dimensions" }), _jsx("input", { style: inputStyle, value: provider.embedding_dims ?? '', onChange: (e) => setProvider({ ...provider, embedding_dims: e.target.value }) })] })] }), models.length > 0 && (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx("label", { style: labelStyle, children: "Available Models (click to use)" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflow: 'auto' }, children: models.map((m) => (_jsx("button", { onClick: () => setProvider({ ...provider, llm_model: m }), style: { padding: '4px 10px', borderRadius: 999, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, cursor: 'pointer' }, children: m }, m))) })] })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }, children: [_jsxs("button", { onClick: handleSaveProvider, disabled: saving, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }, children: [saving ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(Save, { size: 16 }), " Save Provider"] }), _jsxs("button", { onClick: handleLoadModels, disabled: busyAction === 'models', style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, cursor: 'pointer' }, children: [busyAction === 'models' ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(Plug, { size: 16 }), " Load Models"] }), _jsxs("button", { onClick: handleTest, disabled: busyAction === 'test', style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, cursor: 'pointer' }, children: [busyAction === 'test' ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(Zap, { size: 16 }), " Test Connection"] })] }), testResult && (_jsx("div", { style: { marginTop: 12, padding: '8px 14px', borderRadius: 8, fontSize: 13,
                            background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                            color: testResult.ok ? '#166534' : '#991b1b' }, children: testResult.text })), message && _jsx("div", { style: { marginTop: 12 }, children: _jsx(MessagePill, { message: message }) })] }))] }));
};
function MessagePill({ message }) {
    return (_jsxs("div", { style: {
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8,
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: 13,
        }, children: [message.type === 'success' ? _jsx(CheckCircle2, { size: 16 }) : _jsx(AlertCircle, { size: 16 }), message.text] }));
}
