#!/usr/bin/env node

/**
 * TaskFlow MCP Server
 * Provides task management integration for Claude Code, Cursor, and other AI coding tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { setupTools } from './tools/index.js';
import { setupResources } from './resources/index.js';

// Check if running as a hook
const hookType = process.env.CLAUDE_HOOK_TYPE;

if (hookType === 'SessionStart') {
  // Handle SessionStart hook
  const { handleSessionStart } = await import('./hooks/session-start.js');
  await handleSessionStart();
  process.exit(0);
} else if (hookType === 'SessionEnd' || hookType === 'Stop') {
  // Handle SessionEnd hook
  const { handleSessionEnd } = await import('./hooks/session-end.js');
  await handleSessionEnd();
  process.exit(0);
}

// Normal MCP server mode
async function main() {
  try {
    // Initialize authentication
    const authManager = new AuthManager();

    // Supabase configuration with production fallback
    const supabaseUrl =
      process.env.TASKFLOW_SUPABASE_URL ||
      (await authManager.getConfig('supabase_url')) ||
      (process.env.SUPABASE_URL || '');
    const supabaseKey =
      process.env.TASKFLOW_SUPABASE_KEY ||
      (await authManager.getConfig('supabase_key')) ||
      (process.env.SUPABASE_ANON_KEY || '');
    const accessToken = await authManager.getAccessToken();

    if (!accessToken) {
      console.error('ERROR: Not authenticated.', { severity: 'error' });
      console.error('Run: taskflow login', { severity: 'error' });
      process.exit(1);
    }

    if (!accessToken) {
      console.error('ERROR: Not authenticated.', { severity: 'error' });
      console.error('Run: taskflow login', { severity: 'error' });
      process.exit(1);
    }

    // Create TaskOperations instance
    const taskOps = await TaskOperations.fromAuthManager(authManager);

    // Create MCP server
    const server = new Server(
      {
        name: 'taskflow-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Setup tools and resources
    const tools = setupTools(taskOps);
    const resources = setupResources(taskOps);

    // Register tool list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = tools.find((t) => t.name === request.params.name);

      if (!tool) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      try {
        return await tool.handler(request.params.arguments || {}, taskOps);
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error.message,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });

    // Register resource list handler
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: resources.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      };
    });

    // Register resource read handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = resources.find((r) => r.uri === request.params.uri);

      if (!resource) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      try {
        return await resource.handler(taskOps);
      } catch (error: any) {
        throw new Error(`Failed to read resource: ${error.message}`);
      }
    });

    // Connect via STDIO
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log to stderr (STDIO requirement)
    console.error('TaskFlow MCP server started', { severity: 'info' });
  } catch (error: any) {
    console.error('Fatal error:', error, { severity: 'error' });
    process.exit(1);
  }
}

main();
