import React from 'react';
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
export declare const AgentSettings: React.FC<AgentSettingsProps>;
export {};
