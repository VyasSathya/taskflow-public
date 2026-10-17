# VibeTasks Error Capture Action

Automatically create VibeTasks tasks when your CI/CD pipeline fails. This action captures build/test output, parses error details, and creates trackable tasks with all the context needed to fix the issue.

## Features

- **Automatic Error Detection**: Detects TypeScript, ESLint, Jest, Python, and general build errors
- **Smart Error Parsing**: Extracts file paths, line numbers, and error messages
- **Task Creation**: Creates high-priority tasks with full context
- **Subtask Templates**: Includes standard debugging subtasks
- **PR Comments**: Optionally comments on PRs with task details
- **Tag Support**: Automatically tags tasks for easy filtering

## Quick Start

### 1. Add Secrets to Your Repository

Go to your repository's Settings > Secrets and variables > Actions, and add:

| Secret | Description | Required |
|--------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxx.supabase.co`) | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (recommended for reliability) | No |
| `VIBETASKS_USER_ID` | Your VibeTasks user ID (UUID from Supabase auth) | Yes |

### 2. Create a Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install & Build
        id: build
        run: |
          npm ci
          npm run build
        continue-on-error: true

      - name: Capture Error
        if: steps.build.outcome == 'failure'
        uses: your-org/VibeTasks/.github/actions/vibetasks-error@main
        with:
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-anon-key: ${{ secrets.SUPABASE_ANON_KEY }}
          user-id: ${{ secrets.VIBETASKS_USER_ID }}

      - name: Fail if build failed
        if: steps.build.outcome == 'failure'
        run: exit 1
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `supabase-url` | Supabase project URL | Yes | - |
| `supabase-anon-key` | Supabase anon key | Yes | - |
| `supabase-service-key` | Supabase service role key | No | - |
| `user-id` | VibeTasks user ID | Yes | - |
| `project-name` | Project name for task | No | Repository name |
| `priority` | Task priority: none, low, medium, high | No | `high` |
| `tags` | Comma-separated tags | No | `ci,automated` |
| `error-context` | Additional error context | No | - |
| `max-log-lines` | Max log lines to capture | No | `100` |
| `comment-on-pr` | Comment on PR with task link | No | `true` |
| `github-token` | Token for PR comments | No | `${{ github.token }}` |
| `failure-types` | Types to detect: build,test,lint,typecheck,all | No | `all` |

## Outputs

| Output | Description |
|--------|-------------|
| `task-id` | ID of the created VibeTasks task |
| `task-url` | URL to the created task |
| `error-summary` | Brief summary of the error |

## Examples

### Basic Usage

```yaml
- name: Capture Error
  if: failure()
  uses: your-org/VibeTasks/.github/actions/vibetasks-error@main
  with:
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-anon-key: ${{ secrets.SUPABASE_ANON_KEY }}
    user-id: ${{ secrets.VIBETASKS_USER_ID }}
```

### With Custom Tags and Priority

```yaml
- name: Capture Error
  if: failure()
  uses: your-org/VibeTasks/.github/actions/vibetasks-error@main
  with:
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-anon-key: ${{ secrets.SUPABASE_ANON_KEY }}
    user-id: ${{ secrets.VIBETASKS_USER_ID }}
    project-name: 'my-awesome-app'
    priority: 'medium'
    tags: 'ci,frontend,react'
    error-context: 'This error occurs in the production build step'
```

### Multiple Steps with Different Error Types

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install
        run: npm ci
      
      - name: Lint
        id: lint
        run: npm run lint
        continue-on-error: true
      
      - name: Type Check
        id: typecheck
        run: npm run typecheck
        continue-on-error: true
      
      - name: Build
        id: build
        run: npm run build
        continue-on-error: true
      
      - name: Test
        id: test
        run: npm test
        continue-on-error: true
      
      - name: Check Results
        id: check
        run: |
          FAILED=""
          [ "${{ steps.lint.outcome }}" == "failure" ] && FAILED="${FAILED}lint,"
          [ "${{ steps.typecheck.outcome }}" == "failure" ] && FAILED="${FAILED}typecheck,"
          [ "${{ steps.build.outcome }}" == "failure" ] && FAILED="${FAILED}build,"
          [ "${{ steps.test.outcome }}" == "failure" ] && FAILED="${FAILED}test,"
          
          if [ -n "$FAILED" ]; then
            echo "failed=${FAILED}" >> $GITHUB_OUTPUT
            echo "has_failures=true" >> $GITHUB_OUTPUT
          else
            echo "has_failures=false" >> $GITHUB_OUTPUT
          fi
      
      - name: Capture Errors
        if: steps.check.outputs.has_failures == 'true'
        uses: your-org/VibeTasks/.github/actions/vibetasks-error@main
        with:
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-anon-key: ${{ secrets.SUPABASE_ANON_KEY }}
          user-id: ${{ secrets.VIBETASKS_USER_ID }}
          tags: 'ci,${{ steps.check.outputs.failed }}'
          error-context: 'Failed steps: ${{ steps.check.outputs.failed }}'
      
      - name: Fail Job
        if: steps.check.outputs.has_failures == 'true'
        run: exit 1
```

### Python Project

```yaml
- name: Run Tests
  id: test
  run: |
    pip install -r requirements.txt
    pytest --tb=short 2>&1 | tee test-output.txt
  continue-on-error: true

- name: Capture Error
  if: steps.test.outcome == 'failure'
  uses: your-org/VibeTasks/.github/actions/vibetasks-error@main
  with:
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-anon-key: ${{ secrets.SUPABASE_ANON_KEY }}
    user-id: ${{ secrets.VIBETASKS_USER_ID }}
    tags: 'ci,python,pytest'
```

## Using the Reusable Workflow

For a complete CI setup, use the reusable workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    uses: your-org/VibeTasks/.github/workflows/reusable-ci-with-error-capture.yml@main
    with:
      node-version: '20'
      project-name: 'my-project'
      build-command: 'npm run build'
      test-command: 'npm test'
    secrets:
      SUPABASE_URL: ${{ secrets.VIBETASKS_SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.VIBETASKS_SUPABASE_ANON_KEY }}
      VIBETASKS_USER_ID: ${{ secrets.VIBETASKS_USER_ID }}
```

## Error Detection

The action detects these error types:

| Error Type | Detection Pattern |
|------------|-------------------|
| TypeScript | `error TS` |
| ESLint | `eslint`, `error`, `warning` patterns |
| Jest/Tests | `FAIL`, test suite failures |
| Python | `Traceback`, Python exceptions |
| Node.js | `TypeError`, `ReferenceError`, etc. |
| npm/yarn | `npm ERR!`, yarn errors |
| Build | `build failed`, `compilation failed` |

## Task Structure

Created tasks include:

- **Title**: `[CI] {Error Type}: {Summary}`
- **Notes**: Full markdown report with:
  - Workflow/job/run information
  - Commit and branch details
  - Error details and log excerpt
  - Links to the workflow run
- **Subtasks**:
  1. Reproduce the error locally
  2. Identify root cause
  3. Implement fix
  4. Verify CI passes
- **Tags**: `ci`, `automated`, plus any custom tags
- **Priority**: Configurable (default: high)
- **Project**: Repository name or custom

## Finding Your User ID

To find your VibeTasks user ID:

1. Log into VibeTasks
2. Open browser developer tools (F12)
3. Go to the Network tab
4. Look for any API call to Supabase
5. Find the `user_id` in the request/response

Or query Supabase directly:
```sql
SELECT id FROM auth.users WHERE email = 'your-email@example.com';
```

## Troubleshooting

### Task not created

1. Check that all required secrets are set
2. Verify the user ID is a valid UUID
3. Check the Supabase URL includes the protocol (`https://`)
4. Look at the action logs for API errors

### No error details captured

1. Ensure `continue-on-error: true` is set on failing steps
2. Check that error output is going to stdout/stderr
3. Try increasing `max-log-lines`

### PR comment not appearing

1. Verify `comment-on-pr: 'true'`
2. Check that the workflow has `pull_request` trigger
3. Ensure the token has PR comment permissions

## Contributing

Found a bug or want to add support for more error types? Open an issue or PR!

## License

MIT
