# gunma-agent-dashboard

The official admin monitoring and control dashboard for the Gunma AI Agent (Piku).

## Features
- **Live Chat Monitor**: Watch real-time interactions between Piku and customers.
- **AI/Manual Toggle**: Seamlessly take over conversations or pause AI on a per-session basis.
- **Support Ticket Management**: Centralized view for claims, cancellations, and payment issues.
- **Real-time Analytics**: Monitor total sessions, active AI, and pending tickets.
- **Customer Insights**: View cart contents, points balance, and loyalty history.

## Installation
```bash
npm install gunma-agent-dashboard
```

## Usage
```tsx
import { AgentDashboard } from 'gunma-agent-dashboard';
import 'gunma-agent-dashboard/styles.css';

function App() {
  return (
    <AgentDashboard 
      apiUrl="https://your-api-domain.com" 
      pollInterval={10000} 
    />
  );
}
```

## CSS Integration
Make sure to import the styles in your main entry point:
```javascript
import 'gunma-agent-dashboard/styles.css';
```

## License
MIT © Anwar
