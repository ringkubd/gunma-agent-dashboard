# gunma-agent-dashboard

The official admin monitoring and control dashboard for the Gunma AI Agent (Piku).

## Features
- **Live Chat Monitor**: Watch real-time interactions between Piku and customers.
- **AI/Manual Toggle**: Seamlessly take over conversations or pause AI on a per-session basis.
- **Support Ticket Management**: Centralized view for claims, cancellations, and payment issues.
- **Real-time Analytics**: Monitor total sessions, active AI, and pending tickets.
- **Customer Insights**: View cart contents, points balance, and loyalty history.

## Installation & Update

### Install
```bash
npm install gunma-agent-dashboard
```

### Update
```bash
npm install gunma-agent-dashboard@latest
```

## Configuration (.env.local)
The dashboard requires these Next.js public variables for real-time sync:
```env
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
NEXT_PUBLIC_PUSHER_HOST=localhost
NEXT_PUBLIC_PUSHER_PORT=6001
NEXT_PUBLIC_PUSHER_FORCE_TLS=false
```

## Development & Pushing to GitHub
If you are modifying the package locally in the `packages/` directory:
1. **Navigate to the package**: `cd packages/gunma-agent-dashboard`
2. **Build the package**: `npm run build`
3. **Commit changes**: `git add . && git commit -m "your message"`
4. **Push to GitHub**: `git push origin main`
5. **Update Host App**: Run `npm install` in your `admin_dashboard` project.

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

## License
MIT © Anwar

