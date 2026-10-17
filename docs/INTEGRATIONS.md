# VibeTasks Integrations Guide

VibeTasks integrates with your development workflow to automatically capture feedback, bug reports, and errors as actionable tasks.

## Table of Contents

1. [Overview](#overview)
2. [GitHub Issues Integration](#github-issues-integration)
3. [Email Integration](#email-integration)
4. [Slack Integration](#slack-integration)
5. [Sentry Integration](#sentry-integration)
6. [Browser Extension](#browser-extension)
7. [VS Code Extension](#vs-code-extension)
8. [GitHub Action](#github-action)
9. [CLI](#cli)
10. [MCP Server](#mcp-server)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### How Integrations Work

All integrations use webhooks to send data to VibeTasks. When an event occurs (e.g., a new GitHub issue, an email, a Sentry error), the source sends a webhook payload to your VibeTasks webhook URL. VibeTasks then:

1. **Authenticates** the request using your webhook token
2. **Classifies** the content as bug/feedback
3. **Creates a task** with appropriate priority, tags, and metadata
4. **Deduplicates** to avoid creating duplicate tasks

### Webhook URL Format

All webhook URLs follow this pattern:
```
https://your-app.vercel.app/api/webhooks/{integration}?token={webhook_secret}
```

### Task Source Types

Tasks created via integrations are tagged with a `source_type`:

| Source Type | Description |
|-------------|-------------|
| `github_bug` | GitHub issue classified as bug |
| `github_feedback` | GitHub issue classified as feedback |
| `email_bug` | Email classified as bug report |
| `email_feedback` | Email classified as feedback |
| `slack_bug` | Slack message classified as bug |
| `slack_feedback` | Slack message classified as feedback |
| `sentry_error` | Error from Sentry |
| `browser_extension` | Created via browser extension |
| `vscode_extension` | Created via VS Code extension |
| `cli` | Created via CLI |
| `mcp` | Created via MCP server |

---

## GitHub Issues Integration

Automatically create tasks from GitHub issues. Perfect for tracking bug reports and feature requests.

### Setup Steps

1. **Enable the Integration**
   - Go to **Settings > Integrations** in VibeTasks
   - Click **Enable** on GitHub integration
   - Copy your webhook URL and webhook secret

2. **Configure GitHub Webhook**
   - Go to your GitHub repository
   - Navigate to **Settings > Webhooks > Add webhook**
   - Configure:
     - **Payload URL**: Your VibeTasks webhook URL
       ```
       https://your-app.vercel.app/api/webhooks/github?token=YOUR_TOKEN
       ```
     - **Content type**: `application/json`
     - **Secret**: (Optional) Your GitHub secret for signature verification
     - **Events**: Select "Let me select individual events"
       - Check: **Issues** (required)
       - Optional: **Issue comments**

3. **Configure Integration Settings** (in VibeTasks)
   - **Default Priority**: Priority for new tasks (default: high for bugs)
   - **Enabled Events**: `issues`, `issue_comment`
   - **Default Project Tag**: Auto-tag tasks with this project
   - **Auto-close on Resolve**: Close VibeTasks task when GitHub issue closes

### How Classification Works

Issues are classified as **bugs** if labels or content contain:
- `bug`, `error`, `crash`, `fix`, `broken`, `fail`, `issue`, `exception`

Otherwise, classified as **feedback**.

### Priority Mapping

| GitHub Labels | VibeTasks Priority |
|---------------|-------------------|
| `critical`, `urgent`, `p0`, `p1`, `high-priority` | High |
| `p2`, `medium-priority` | Medium |
| `low-priority`, `p3`, `minor` | Low |
| No priority labels | None (or High for bugs) |

### What Gets Created

When a GitHub issue is opened:
```
Title: [repo-name] Original issue title
Notes: **GitHub Issue #123**
       
       [Issue body content]
       
       ---
       [View on GitHub](https://github.com/...)
       
Tags: github, bug/feedback
Priority: Based on labels
```

### Sync Behavior

| GitHub Event | VibeTasks Action |
|--------------|------------------|
| Issue opened | Create new task |
| Issue closed | Mark task as done |
| Issue reopened | Reopen task (set to todo) |
| Issue edited | (Not synced) |

---

## Email Integration

Turn support emails into tasks automatically. Works with Mailgun, SendGrid, Postmark, or any email provider with inbound parsing.

### Supported Providers

| Provider | Setup Complexity | Inbound Parsing |
|----------|-----------------|-----------------|
| **Mailgun** | Easy | Routes > Create Route |
| **SendGrid** | Easy | Inbound Parse > Add Host |
| **Postmark** | Easy | Servers > Inbound |
| **Generic** | Medium | Forward via rules |

### Setup Steps

1. **Enable the Integration**
   - Go to **Settings > Integrations** in VibeTasks
   - Click **Enable** on Email integration
   - Select your provider
   - Copy your webhook URL

2. **Configure Your Email Provider**

   **Mailgun:**
   ```
   1. Go to Sending > Routes
   2. Create a new route:
      - Expression Type: Match Recipient
      - Recipient: bugs@yourdomain.com
      - Action: Forward to webhook URL
        https://your-app.vercel.app/api/webhooks/email?token=TOKEN&provider=mailgun
   ```

   **SendGrid:**
   ```
   1. Go to Settings > Inbound Parse
   2. Add Host/URL:
      - Subdomain: inbound (or your choice)
      - Domain: yourdomain.com
      - URL: https://your-app.vercel.app/api/webhooks/email?token=TOKEN&provider=sendgrid
   ```

   **Postmark:**
   ```
   1. Go to your Server > Inbound
   2. Configure webhook URL:
      https://your-app.vercel.app/api/webhooks/email?token=TOKEN&provider=postmark
   3. Enable inbound processing
   ```

3. **Configure Integration Settings**
   - **Allowed Senders**: Restrict to specific domains (e.g., `*@company.com`)
   - **Default Priority**: Priority for new tasks
   - **Auto-classify**: Enable/disable bug vs feedback classification

### Email Classification

Emails are classified as **bugs** if subject or body contains:
- `bug`, `error`, `crash`, `broken`, `not working`, `fail`, `issue`, `problem`, `exception`, `stack trace`

**Priority** is extracted from subject:
- `urgent`, `critical`, `asap` → High
- `important` → Medium
- Default → None

### What Gets Created

```
Title: [Email] Original subject line
Notes: **From:** sender@example.com
       **Subject:** Bug report: App crashes on login
       
       ---
       
       [Email body content]
       
Tags: email, bug/feedback
```

---

## Slack Integration

Capture feedback from Slack channels and create tasks automatically.

### Setup Steps

1. **Create a Slack App**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click **Create New App** > **From scratch**
   - Name it "VibeTasks" and select your workspace

2. **Configure Event Subscriptions**
   - Go to **Event Subscriptions** > Enable Events
   - Set Request URL to your webhook:
     ```
     https://your-app.vercel.app/api/webhooks/slack?token=YOUR_TOKEN
     ```
   - Subscribe to bot events:
     - `message.channels` (public channels)
     - `message.groups` (private channels)
     - `reaction_added` (emoji reactions)

3. **Install the App**
   - Go to **OAuth & Permissions**
   - Add scopes: `channels:history`, `groups:history`, `reactions:read`
   - Click **Install to Workspace**

4. **Enable in VibeTasks**
   - Go to **Settings > Integrations**
   - Enable Slack integration
   - Enter your **Slack Signing Secret** (from Basic Information)
   - Configure trigger settings

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Signing Secret** | For request verification | Required |
| **Allowed Channels** | Channel IDs to monitor | All |
| **Trigger Words** | Keywords that create tasks | `feedback`, `bug`, `feature request` |
| **Trigger Reactions** | Emoji that create tasks | `:eyes:`, `:memo:`, `:bug:` |
| **Default Priority** | Priority for new tasks | Medium |

### How It Works

A task is created when:
1. A message contains a **trigger word** (e.g., "bug", "feedback")
2. Someone adds a **trigger reaction** to a message

### What Gets Created

```
Title: [Slack] First 100 characters of message...
Notes: **From Slack**
       
       Channel: #feedback
       User: @john.doe
       
       ---
       
       Full message content here
       
Tags: slack, bug/feedback
```

---

## Sentry Integration

Automatically create tasks from Sentry errors. Includes deduplication and error count tracking.

### Setup Steps

1. **Enable in VibeTasks**
   - Go to **Settings > Integrations**
   - Click **Enable** on Sentry integration
   - Copy your webhook URL and token

2. **Configure Sentry Webhook**
   - Go to your Sentry organization
   - Navigate to **Settings > Integrations > Webhooks**
   - Add a new webhook:
     ```
     URL: https://your-app.vercel.app/api/webhooks/sentry?token=YOUR_TOKEN
     ```
   - Enable for issues: `issue.created`, `issue.resolved`, `issue.unresolved`

3. **Configure Settings**
   - **Enabled Levels**: Which error levels create tasks (default: `fatal,error`)
   - **Default Priority**: Priority mapping
   - **Auto-create Tasks**: Enable/disable task creation
   - **Default Project Tag**: Tag for Sentry tasks

### Sentry Events

| Sentry Event | VibeTasks Action |
|--------------|------------------|
| `issue.created` | Create task (or increment count) |
| `issue.resolved` | Mark task as done |
| `issue.unresolved` | Reopen task |
| `issue.assigned` | Add note with assignee |
| `issue.archived` | Archive task |

### Deduplication

VibeTasks tracks `sentry_issue_id` to prevent duplicates:
- If an issue already has a task, the error count is incremented
- The task's `sentry_last_seen` is updated
- Completed tasks are reopened if the issue recurs

### Priority Mapping

| Sentry Level | Default Priority |
|--------------|-----------------|
| `fatal` | High |
| `error` | High |
| `warning` | Medium |
| `info` | Low |
| `debug` | None |

### What Gets Created

```
Title: [ERROR] TypeError: Cannot read property 'x' of undefined
Notes: ### Sentry Issue: PROJ-123
       
       **Project:** my-app (javascript)
       **Level:** error
       **Culprit:** /src/components/Button.tsx in handleClick
       **Error:** TypeError: Cannot read property 'x' of undefined
       
       ---
       
       **Occurrences:** 142
       **Users affected:** 23
       **First seen:** Jan 10, 2026, 3:45 PM
       **Last seen:** Jan 11, 2026, 9:30 AM
       
       ---
       
       [View in Sentry](https://sentry.io/...)

Tags: sentry, error
Fields: sentry_issue_id, sentry_project, sentry_error_count, etc.
```

---

## Browser Extension

Capture tasks from any webpage using our Chrome/Firefox extension.

### Installation

**Chrome:**
1. Download from Chrome Web Store (coming soon)
2. Or load unpacked from `apps/browser-extension`

**Firefox:**
1. Download from Firefox Add-ons (coming soon)

### Features

- **Quick Capture**: Keyboard shortcut (Ctrl+Shift+T / Cmd+Shift+T)
- **Page Context**: Automatically captures URL, title, selected text
- **Screenshot**: Capture visible area or selection
- **Right-click Menu**: "Add to VibeTasks" on any selection

### Setup

1. Install the extension
2. Click the extension icon
3. Log in with your VibeTasks account
4. Configure keyboard shortcuts (optional)

### Usage

**Quick Add:**
1. Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac)
2. Type your task title
3. Press Enter

**From Selection:**
1. Select text on any page
2. Right-click > "Add to VibeTasks"
3. Edit title/notes if needed
4. Save

---

## VS Code Extension

Manage tasks directly from VS Code with deep editor integration.

### Installation

```bash
# From marketplace (coming soon)
code --install-extension vibetasks.vibetasks-vscode

# Or install from VSIX
code --install-extension vibetasks-vscode-*.vsix
```

### Features

- **Task Panel**: View and manage tasks in the sidebar
- **Quick Add**: `Ctrl+Shift+P` > "VibeTasks: Add Task"
- **TODO Comments**: Scan for TODO/FIXME comments and create tasks
- **Diagnostics**: Create tasks from compiler errors
- **Status Bar**: See task count, click to open panel
- **Context Notes**: Right-click > "Update Context Notes"

### Setup

1. Install the extension
2. Run `VibeTasks: Login` from command palette
3. Authenticate via browser
4. The extension syncs automatically

### Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `VibeTasks: Add Task` | Create new task | `Ctrl+Alt+T` |
| `VibeTasks: View Tasks` | Open task panel | `Ctrl+Alt+V` |
| `VibeTasks: Scan TODOs` | Create tasks from comments | - |
| `VibeTasks: Start Vibing` | Set task to vibing | - |
| `VibeTasks: Complete Task` | Mark task done | - |
| `VibeTasks: Login` | Authenticate | - |

---

## GitHub Action

Create tasks automatically from CI/CD pipelines, test failures, and build errors.

### Installation

Add to your workflow:

```yaml
# .github/workflows/vibetasks.yml
name: VibeTasks Integration

on:
  workflow_run:
    workflows: ["CI", "Tests"]
    types: [completed]

jobs:
  create-task-on-failure:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - name: Create VibeTasks Task
        uses: vibetasks/github-action@v1
        with:
          webhook-url: ${{ secrets.VIBETASKS_WEBHOOK_URL }}
          title: "CI Failed: ${{ github.event.workflow_run.name }}"
          priority: high
          tags: ci,build-failure
          notes: |
            **Workflow:** ${{ github.event.workflow_run.name }}
            **Branch:** ${{ github.event.workflow_run.head_branch }}
            **Commit:** ${{ github.event.workflow_run.head_sha }}
            
            [View Run](https://github.com/${{ github.repository }}/actions/runs/${{ github.event.workflow_run.id }})
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `webhook-url` | VibeTasks webhook URL | Yes | - |
| `title` | Task title | Yes | - |
| `notes` | Task description | No | - |
| `priority` | `none`, `low`, `medium`, `high` | No | `high` |
| `tags` | Comma-separated tags | No | `ci` |
| `project-tag` | Project identifier | No | Repo name |
| `source-type` | Source type | No | `github_action` |

### Example: Test Failure Reporting

```yaml
- name: Run Tests
  id: tests
  run: npm test
  continue-on-error: true

- name: Report Test Failures
  if: steps.tests.outcome == 'failure'
  uses: vibetasks/github-action@v1
  with:
    webhook-url: ${{ secrets.VIBETASKS_WEBHOOK_URL }}
    title: "Test Failures in ${{ github.ref_name }}"
    priority: high
    notes: |
      Tests failed on branch `${{ github.ref_name }}`
      
      Run `npm test` locally to reproduce.
```

---

## CLI

The VibeTasks CLI provides full task management from your terminal.

### Installation

```bash
npm install -g @vibetasks/cli
# or
pnpm add -g @vibetasks/cli
```

### Authentication

```bash
# Login via browser
vibetasks login --browser

# Check auth status
vibetasks config
```

### Commands

```bash
# Task Management
vibetasks add "Fix login bug" --priority high --tag backend
vibetasks list                    # Show all tasks
vibetasks list --vibing          # Show in-progress tasks
vibetasks list --inbox           # Show inbox (errors/feedback)
vibetasks done <task-id>         # Mark task complete
vibetasks vibing <task-id>       # Start working on task

# With subtasks
vibetasks add "Implement feature" --subtasks "Design API" "Write tests" "Implement"

# Session management
vibetasks session start <task-id> # Start timed session
vibetasks session stop            # Stop current session

# Daemon (background monitoring)
vibetasks daemon start            # Start background service
vibetasks daemon stop             # Stop daemon
```

### Configuration

```bash
# View config
vibetasks config

# Set defaults
vibetasks config set default_project my-project
vibetasks config set default_priority medium
```

---

## MCP Server

The Model Context Protocol (MCP) server enables AI assistants to manage your tasks.

### Setup with Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "npx",
      "args": ["@vibetasks/mcp-server"],
      "env": {}
    }
  }
}
```

### Authentication

The first time Claude uses VibeTasks, it will prompt you to authenticate:

1. Claude will show an authentication URL
2. Open the URL in your browser
3. Log in to VibeTasks
4. Return to Claude

### Available Tools

| Tool | Description |
|------|-------------|
| `get_tasks` | List tasks with filters |
| `create_task` | Create a new task |
| `update_task` | Modify a task |
| `complete_task` | Mark task as done |
| `start_vibing` | Start working on task |
| `pause_vibing` | Pause with context notes |
| `get_inbox` | View errors and feedback |
| `search_tasks` | Search by title |

### Example Prompts

```
"What's on my task list?"
"Create a task to fix the login bug, high priority"
"What errors came in from Sentry?"
"Start working on the API refactor task"
"I'm done with the current task, mark it complete"
```

---

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Events

1. **Check URL format**: Ensure token is in query string
   ```
   https://your-app/api/webhooks/github?token=YOUR_TOKEN
   ```

2. **Test the endpoint**: Visit the URL in browser - you should see a response

3. **Check webhook logs**: Go to Settings > Integrations > View Logs

4. **Verify secret**: If using signature verification, ensure secrets match

#### Tasks Not Being Created

1. **Check integration is enabled**: Settings > Integrations

2. **Check filters**: Some integrations filter by level, sender, etc.

3. **Check for duplicates**: Tasks with same `sentry_issue_id` or `github_issue_id` update existing tasks

4. **Check logs**: View webhook logs for error messages

#### Authentication Issues

**CLI:**
```bash
# Clear auth and re-login
vibetasks logout
vibetasks login --browser
```

**MCP Server:**
```bash
# Delete stored credentials
rm -rf ~/.vibetasks
# Restart Claude Desktop
```

**Browser Extension:**
1. Click extension icon
2. Click "Logout"
3. Re-authenticate

### Getting Help

- **Documentation**: [vibetasks.com/docs](https://vibetasks.com/docs)
- **GitHub Issues**: [github.com/vibetasks/vibetasks/issues](https://github.com/vibetasks/vibetasks/issues)
- **Discord**: [discord.gg/vibetasks](https://discord.gg/vibetasks)

### Debug Mode

Enable verbose logging:

```bash
# CLI
DEBUG=vibetasks* vibetasks list

# MCP Server
DEBUG=vibetasks* npx @vibetasks/mcp-server
```
