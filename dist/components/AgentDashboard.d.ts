import React from 'react';
interface AgentDashboardProps {
    apiUrl: string;
    /** Auto-refresh interval in ms (0 = disabled). Default: 15000 */
    pollInterval?: number;
}
export declare const AgentDashboard: React.FC<AgentDashboardProps>;
export {};
