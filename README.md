# Gunma Agent Dashboard

A monitoring and management interface for the Gunma AI Agent.

## Features
- **Live Monitoring**: View active chat sessions in real-time.
- **Human Takeover**: Disable AI for specific sessions and respond manually.
- **Session History**: Review past conversations and tool call results.

## Usage

```tsx
import { AgentDashboard } from '@gunma/agent-dashboard';

function AdminPage() {
  return (
    <div className="p-8">
      <AgentDashboard apiUrl="https://your-api.com/api/admin/chat" />
    </div>
  );
}
```

## Styling
The dashboard uses CSS variables for easy theming. You can override them in your global CSS:
```css
:root {
  --gunma-primary: #10b981;
  --gunma-sidebar-bg: #f9fafb;
}
```
