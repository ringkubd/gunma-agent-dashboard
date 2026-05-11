import React from 'react';
import { UseMonitorAuth, UseMonitorPusher, UseMonitorRoutes } from '../hooks/useMonitor';
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
export declare const AgentDashboard: React.FC<AgentDashboardProps>;
export {};
