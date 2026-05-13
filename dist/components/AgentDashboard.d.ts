import React from 'react';
import { UseMonitorAuth, UseMonitorPusher, UseMonitorRoutes } from '../hooks/useMonitor';
interface AgentDashboardProps {
    apiUrl: string;
    pollInterval?: number;
    pusher?: UseMonitorPusher;
    auth?: UseMonitorAuth;
    broadcastChannel?: string;
    routes?: UseMonitorRoutes;
}
export declare const AgentDashboard: React.FC<AgentDashboardProps>;
export {};
