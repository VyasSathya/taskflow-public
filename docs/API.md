# VibeTasks API Reference

This document covers the webhook API endpoints and authentication for VibeTasks integrations.

## Table of Contents

1. [Authentication](#authentication)
2. [Webhook Endpoints](#webhook-endpoints)
3. [Task API](#task-api)
4. [Rate Limits](#rate-limits)
5. [Error Responses](#error-responses)
6. [Webhook Payloads](#webhook-payloads)

---

## Authentication

### Webhook Authentication

All webhook endpoints use token-based authentication via query parameter:

```
https://your-app.vercel.app/api/webhooks/{integration}?token={webhook_secret}
```

The `webhook_secret` is generated when you enable an integration and can be found in:
- **Settings > Integrations > {Integration Name} > Webhook Secret**

### Signature Verification (Optional)

Some integrations support optional signature verification for additional security:

#### GitHub Webhooks
```javascript
// Verify X-Hub-Signature-256 header
const crypto = require('crypto');

function verifyGitHubSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

#### Slack Webhooks
```javascript
// Verify X-Slack-Signature header
function verifySlackSignature(body, timestamp, signature, secret) {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  const mySignature = 'v0=' + hmac.update(baseString).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
}
```

#### Sentry Webhooks
```javascript
// Verify Sentry-Hook-Signature header
function verifySentrySignature(body, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(body, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

### API Token Authentication

For direct API calls (not webhooks), use bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://your-app.vercel.app/api/tasks
```

Access tokens are obtained via the OAuth flow used by CLI and extensions.

---

## Webhook Endpoints

### GitHub Webhook

**Endpoint:** `POST /api/webhooks/github`

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Your webhook secret |

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Hub-Signature-256` | No | HMAC signature for verification |
| `X-GitHub-Event` | Yes | Event type (`issues`, `issue_comment`) |
| `Content-Type` | Yes | `application/json` |

**Supported Events:**
- `issues` - opened, closed, reopened
- `issue_comment` - created (optional)

**Response:**
```json
{
  "success": true,
  "task_id": "uuid",
  "type": "bug",
  "message": "Created bug task from GitHub issue"
}
```

---

### Email Webhook

**Endpoint:** `POST /api/webhooks/email`

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Your webhook secret |
| `provider` | No | `mailgun`, `sendgrid`, `postmark`, `generic` |

**Content Types:**
- `application/json`
- `multipart/form-data`
- `application/x-www-form-urlencoded`

**Provider Payload Formats:**

*Mailgun:*
```json
{
  "sender": "user@example.com",
  "from": "User Name <user@example.com>",
  "subject": "Bug Report",
  "stripped-text": "Plain text body",
  "stripped-html": "<p>HTML body</p>"
}
```

*SendGrid:*
```json
{
  "from": "user@example.com",
  "subject": "Bug Report",
  "text": "Plain text body",
  "html": "<p>HTML body</p>"
}
```

*Postmark:*
```json
{
  "From": "user@example.com",
  "FromFull": { "Email": "user@example.com", "Name": "User" },
  "Subject": "Bug Report",
  "TextBody": "Plain text body",
  "HtmlBody": "<p>HTML body</p>"
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "uuid",
  "type": "feedback",
  "message": "Created feedback task from email"
}
```

---

### Slack Webhook

**Endpoint:** `POST /api/webhooks/slack`

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Your webhook secret |

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Slack-Request-Timestamp` | No | Request timestamp |
| `X-Slack-Signature` | No | HMAC signature |
| `Content-Type` | Yes | `application/json` |

**Supported Events:**
- `url_verification` - Slack URL challenge
- `event_callback` with `message` event

**URL Verification Payload:**
```json
{
  "type": "url_verification",
  "challenge": "abc123..."
}
```

**Response:**
```json
{
  "challenge": "abc123..."
}
```

**Message Event Payload:**
```json
{
  "type": "event_callback",
  "event": {
    "type": "message",
    "channel": "C12345",
    "user": "U12345",
    "text": "bug: the app crashes on login",
    "ts": "1234567890.123456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "uuid",
  "type": "bug",
  "message": "Created bug task from Slack message"
}
```

---

### Sentry Webhook

**Endpoint:** `POST /api/webhooks/sentry`

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Your webhook secret |

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Sentry-Hook-Resource` | Yes | `issue` |
| `Sentry-Hook-Signature` | No | HMAC signature |
| `Sentry-Hook-Timestamp` | No | Request timestamp |

**Supported Actions:**
- `created` - New issue
- `resolved` - Issue resolved
- `unresolved` - Issue reopened
- `assigned` - Issue assigned
- `archived` - Issue archived

**Payload Structure:**
```json
{
  "action": "created",
  "installation": {
    "uuid": "installation-uuid"
  },
  "data": {
    "issue": {
      "id": "12345",
      "shortId": "PROJ-123",
      "title": "TypeError: Cannot read property 'x' of undefined",
      "culprit": "/src/components/Button.tsx",
      "permalink": "https://sentry.io/...",
      "level": "error",
      "status": "unresolved",
      "platform": "javascript",
      "project": {
        "id": "1",
        "name": "my-project",
        "slug": "my-project",
        "platform": "javascript"
      },
      "metadata": {
        "title": "TypeError",
        "type": "TypeError",
        "value": "Cannot read property 'x' of undefined",
        "filename": "/src/components/Button.tsx"
      },
      "count": "142",
      "userCount": 23,
      "firstSeen": "2026-01-10T15:45:00Z",
      "lastSeen": "2026-01-11T09:30:00Z"
    }
  },
  "actor": {
    "type": "application",
    "id": "sentry",
    "name": "Sentry"
  }
}
```

**Response:**
```json
{
  "success": true,
  "action": "created",
  "taskId": "uuid",
  "processingTimeMs": 45
}
```

**GET /api/webhooks/sentry** (for verification):
```json
{
  "message": "VibeTasks Sentry Webhook Endpoint",
  "status": "active",
  "usage": "POST /api/webhooks/sentry?token=YOUR_WEBHOOK_TOKEN",
  "supportedResources": ["issue"],
  "supportedActions": ["created", "resolved", "unresolved", "assigned", "archived"]
}
```

---

## Task API

### Task Object

```typescript
interface Task {
  // Core fields
  id: string;
  user_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;

  // Content
  description?: string;
  notes?: string;
  notes_format: 'html' | 'markdown';

  // Status
  status: 'todo' | 'vibing' | 'done' | 'archived';
  completed: boolean;
  completed_at?: string;
  archived_at?: string;

  // Scheduling
  due_date?: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  energy_required?: 'low' | 'medium' | 'high';

  // Context
  project_tag?: string;
  created_by?: 'ai' | 'human';
  context_notes?: string;
  source_type?: TaskSourceType;

  // Integration metadata
  github_issue_id?: number;
  github_issue_number?: number;
  github_repo?: string;
  github_url?: string;
  
  email_from?: string;
  email_subject?: string;
  
  slack_channel?: string;
  slack_user?: string;
  slack_ts?: string;
  
  sentry_issue_id?: string;
  sentry_project?: string;
  sentry_error_count?: number;
  sentry_first_seen?: string;
  sentry_last_seen?: string;
  sentry_level?: string;
  sentry_url?: string;

  // Relations
  tags?: Tag[];
  attachments?: Attachment[];
  subtasks_json?: InlineSubtask[];
}
```

### Source Types

```typescript
type TaskSourceType =
  | 'manual'
  | 'github_bug'
  | 'github_feedback'
  | 'email_bug'
  | 'email_feedback'
  | 'slack_bug'
  | 'slack_feedback'
  | 'sentry_error'
  | 'browser_extension'
  | 'vscode_extension'
  | 'cli'
  | 'mcp'
  | 'github_action';
```

---

## Rate Limits

### Webhook Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/webhooks/sentry` | 100 requests | 1 minute |
| `/api/webhooks/github` | 100 requests | 1 minute |
| `/api/webhooks/email` | 50 requests | 1 minute |
| `/api/webhooks/slack` | 100 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Remaining: 99
Retry-After: 60
```

**Rate Limit Response:**
```json
{
  "error": "Rate limit exceeded. Try again later."
}
```
HTTP Status: `429 Too Many Requests`

### API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Task CRUD | 1000 requests | 1 hour |
| Search | 100 requests | 1 minute |

---

## Error Responses

### Error Format

All errors follow this structure:

```json
{
  "error": "Short error description",
  "message": "Detailed error message (optional)",
  "code": "ERROR_CODE (optional)",
  "details": { } // Additional context (optional)
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| `400` | `INVALID_PAYLOAD` | Request body is malformed |
| `401` | `MISSING_TOKEN` | No authentication token provided |
| `401` | `INVALID_TOKEN` | Token is invalid or expired |
| `401` | `INVALID_SIGNATURE` | Webhook signature verification failed |
| `403` | `INTEGRATION_DISABLED` | Integration is not enabled |
| `404` | `NOT_FOUND` | Resource not found |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Server error |

### Example Error Responses

**Missing Token:**
```json
{
  "error": "Missing token"
}
```
Status: `401 Unauthorized`

**Invalid Token:**
```json
{
  "error": "Invalid token"
}
```
Status: `401 Unauthorized`

**Invalid Signature:**
```json
{
  "error": "Invalid signature"
}
```
Status: `401 Unauthorized`

**Rate Limited:**
```json
{
  "error": "Rate limit exceeded. Try again later."
}
```
Status: `429 Too Many Requests`

**Failed to Create Task:**
```json
{
  "error": "Failed to create task"
}
```
Status: `500 Internal Server Error`

---

## Webhook Payloads

### Creating Custom Integrations

You can send custom webhooks using the generic email endpoint:

```bash
curl -X POST \
  "https://your-app.vercel.app/api/webhooks/email?token=YOUR_TOKEN&provider=generic" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "system@yourapp.com",
    "subject": "Custom Event: Build completed",
    "text": "Build #123 completed successfully\n\nDetails: ...",
    "html": "<p>Build completed</p>"
  }'
```

### Testing Webhooks

Test your webhook configuration:

```bash
# Test GitHub webhook
curl -X POST \
  "https://your-app.vercel.app/api/webhooks/github?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issues" \
  -d '{
    "action": "opened",
    "issue": {
      "id": 1,
      "number": 1,
      "title": "Test Issue",
      "body": "This is a test issue",
      "html_url": "https://github.com/test/repo/issues/1",
      "labels": []
    },
    "repository": {
      "name": "test-repo",
      "full_name": "user/test-repo"
    }
  }'

# Test Sentry webhook
curl -X POST \
  "https://your-app.vercel.app/api/webhooks/sentry?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Sentry-Hook-Resource: issue" \
  -d '{
    "action": "created",
    "data": {
      "issue": {
        "id": "test-123",
        "shortId": "TEST-1",
        "title": "Test Error",
        "culprit": "test.js",
        "permalink": "https://sentry.io/test",
        "level": "error",
        "project": {
          "name": "test-project",
          "slug": "test-project",
          "platform": "javascript"
        },
        "count": "1",
        "userCount": 1,
        "firstSeen": "2026-01-11T00:00:00Z",
        "lastSeen": "2026-01-11T00:00:00Z"
      }
    }
  }'
```

### Webhook Response Codes

| Status | Meaning |
|--------|---------|
| `200 OK` | Webhook processed successfully |
| `201 Created` | Task was created |
| `400 Bad Request` | Invalid payload format |
| `401 Unauthorized` | Authentication failed |
| `429 Too Many Requests` | Rate limited |
| `500 Internal Server Error` | Server error |

---

## SDK Support

### TypeScript Types

Import shared types in your TypeScript projects:

```typescript
import type {
  Task,
  Tag,
  TaskStatus,
  TaskPriority,
  TaskSourceType,
  GitHubIntegration,
  SentryIntegration,
  // ... other types
} from '@vibetasks/shared';
```

### JavaScript Usage

```javascript
// Using the CLI programmatically
const { TaskOperations, AuthManager } = require('@vibetasks/mcp-core');

async function main() {
  const auth = new AuthManager();
  const ops = await TaskOperations.fromAuthManager(auth);
  
  const tasks = await ops.getTasks('all');
  console.log(tasks);
}
```

---

## Changelog

### v1.3.0 (Current)
- Added comprehensive shared types package
- Added `source_type` field to track task origins
- Improved Sentry integration with deduplication
- Added GitHub Action support

### v1.2.0
- Initial webhook API
- GitHub, Email, Slack, Sentry integrations
- Basic rate limiting
