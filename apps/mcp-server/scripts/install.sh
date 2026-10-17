#!/bin/bash

# TaskFlow MCP Server Installation Script

set -e

echo "🚀 Installing TaskFlow MCP Server..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Build the server
echo "📦 Building MCP server..."
cd "$PROJECT_ROOT"
npm run build

# Get the absolute path to dist/index.js
DIST_PATH="$PROJECT_ROOT/dist/index.js"

# Check if Claude Code config directory exists
CLAUDE_CONFIG_DIR="$HOME/.config/claude-code"

if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
  echo "❌ Claude Code config directory not found at $CLAUDE_CONFIG_DIR"
  echo "   Make sure Claude Code is installed."
  exit 1
fi

# Create or update config.json
CONFIG_FILE="$CLAUDE_CONFIG_DIR/config.json"

echo "⚙️  Configuring Claude Code..."

# Read existing config or create new
if [ -f "$CONFIG_FILE" ]; then
  # Backup existing config
  cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
  echo "   Backed up existing config to config.json.backup"
fi

# Read Supabase key from environment or prompt
if [ -z "$TASKFLOW_SUPABASE_KEY" ]; then
  echo ""
  echo "📝 Please enter your Supabase anon key:"
  echo "   (Find it at: https://supabase.com/dashboard/project/_/settings/api)"
  read -r SUPABASE_KEY
else
  SUPABASE_KEY="$TASKFLOW_SUPABASE_KEY"
fi

# Create config with proper paths
cat > "$CONFIG_FILE" <<EOF
{
  "mcpServers": {
    "taskflow": {
      "command": "node",
      "args": [
        "$DIST_PATH"
      ],
      "env": {
        "TASKFLOW_SUPABASE_URL": "https://your-project-ref.supabase.co",
        "TASKFLOW_SUPABASE_KEY": "$SUPABASE_KEY"
      }
    }
  },
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "node",
        "args": ["$DIST_PATH"],
        "env": {
          "CLAUDE_HOOK_TYPE": "SessionStart",
          "TASKFLOW_SUPABASE_URL": "https://your-project-ref.supabase.co"
        }
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node",
        "args": ["$DIST_PATH"],
        "env": {
          "CLAUDE_HOOK_TYPE": "SessionEnd",
          "TASKFLOW_SUPABASE_URL": "https://your-project-ref.supabase.co"
        }
      }
    ]
  }
}
EOF

echo ""
echo "✅ TaskFlow MCP Server installed successfully!"
echo ""
echo "📍 Configuration written to: $CONFIG_FILE"
echo "📍 Server location: $DIST_PATH"
echo ""
echo "🔄 Next steps:"
echo "   1. Restart Claude Code"
echo "   2. Type '@' in a chat to see TaskFlow tools"
echo "   3. Your tasks will load automatically on session start"
echo ""
