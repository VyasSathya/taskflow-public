/**
 * VibeTasks Shared Package
 * Types, services, and utilities used across all platforms:
 * - Web app (Next.js)
 * - Mobile app (React Native/Expo)
 * - CLI (@vibetasks/cli)
 * - MCP Server (@vibetasks/mcp-server)
 */

// =============================================================================
// TYPES - Comprehensive shared types for all platforms
// =============================================================================
export * from './types';

// =============================================================================
// VIBETASKS FILE TYPES - For .vibetasks.json schema
// =============================================================================
// Re-export vibetasks file types explicitly to avoid TaskStatus duplicate
export {
  TaskAttachment,
  VibeTask,
  VibeProject,
  VibeSettings,
  VibeTasksFile,
  DEFAULT_SETTINGS,
  createEmptyVibeTasksFile,
  generateId,
  createTask as createVibeTask,
  createSubtask as createVibeSubtask,
} from './types/vibetasks';

// Re-export Subtask from vibetasks as VibeSubtask to avoid conflict
export type { Subtask as VibeSubtask } from './types/vibetasks';

// =============================================================================
// SERVICES - Database operations
// =============================================================================
export * from './services';

// =============================================================================
// AI SETUP CONTENT - For MCP server setup
// =============================================================================
export { AI_SETUP_CONTENT } from './ai-setup-content';
export type { AISetupContent } from './ai-setup-content';

// =============================================================================
// ERROR PARSER - Shared error detection and parsing
// =============================================================================
export {
  parseError,
  generateErrorTaskTitle,
  detectProjectFromError,
  containsError,
  detectErrorCategory,
} from './utils/error-parser';
