# VibeTasks Documentation

## Quick Links

| Document | Description |
|----------|-------------|
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Complete guide to all VibeTasks integrations (GitHub, Email, Slack, Sentry, Extensions, CLI, MCP) |
| [API.md](./API.md) | Webhook API reference, authentication, rate limits, and payloads |
| [TYPES.md](./TYPES.md) | Shared type system documentation |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Getting started with VibeTasks |
| [TASKFLOW_MCP_GUIDE.md](./TASKFLOW_MCP_GUIDE.md) | MCP server setup for Claude |
| [AI-CONTEXT-TEMPLATE.md](./AI-CONTEXT-TEMPLATE.md) | Template for AI context notes |

## Architecture Overview

```
VibeTasks Monorepo
├── apps/
│   ├── web/              # Next.js web application
│   ├── mobile/           # React Native/Expo mobile app
│   ├── mcp-server/       # MCP server for Claude
│   ├── browser-extension/ # Chrome/Firefox extension
│   └── vscode-extension/ # VS Code extension
├── packages/
│   ├── shared/           # Shared types and services (@vibetasks/shared)
│   ├── cli/              # Command-line interface (@vibetasks/cli)
│   └── mcp-core/         # MCP core functionality (@vibetasks/mcp-core)
├── supabase/
│   └── functions/        # Edge functions (notifications, calendar sync)
└── docs/                 # This documentation
```

## Integrations Summary

| Integration | Source | Auto-creates Tasks | Sync Status |
|-------------|--------|-------------------|-------------|
| GitHub Issues | Webhooks | Yes | Bidirectional |
| Email (Mailgun/SendGrid/Postmark) | Webhooks | Yes | One-way |
| Slack | Event API | Yes | One-way |
| Sentry | Webhooks | Yes | Bidirectional |
| Browser Extension | Direct | Yes | Real-time |
| VS Code Extension | Direct | Yes | Real-time |
| CLI | Direct | Yes | Real-time |
| MCP Server | Direct | Yes | Real-time |
| GitHub Action | Webhooks | Yes | One-way |

## Type System

All platforms share types from `@vibetasks/shared`:

```typescript
import type { Task, Tag, TaskStatus, TaskSourceType } from '@vibetasks/shared';
```

See [TYPES.md](./TYPES.md) for complete type documentation.

## Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discord**: Community support
- **Documentation**: You're here!
