/**
 * Session Manager
 * Tracks AI sessions with unique IDs so work can be resumed after crashes
 * 
 * Each session gets a short memorable ID (e.g., "fox-42", "moon-17")
 * Sessions log:
 * - Tasks created
 * - Tasks completed
 * - Files modified
 * - Context notes
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

// Memorable word lists for session IDs
const ADJECTIVES = [
  'swift', 'calm', 'bold', 'warm', 'cool', 'bright', 'dark', 'quick',
  'slow', 'wise', 'keen', 'soft', 'loud', 'deep', 'high', 'low'
];

const NOUNS = [
  'fox', 'owl', 'bear', 'wolf', 'hawk', 'moon', 'star', 'sun',
  'tree', 'wave', 'wind', 'fire', 'snow', 'rain', 'leaf', 'stone'
];

export interface SessionAction {
  timestamp: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'file_modified' | 'note';
  description: string;
  taskId?: string;
  taskTitle?: string;
  filePath?: string;
}

export interface Session {
  id: string;           // Short memorable ID like "fox-42"
  fullId: string;       // Full UUID for uniqueness
  startedAt: string;
  endedAt?: string;
  project?: string;     // Project directory
  actions: SessionAction[];
  summary?: string;     // AI-generated summary of what was done
}

export interface SessionStore {
  currentSession?: string;  // Current session ID
  sessions: Session[];
}

export class SessionManager {
  private storePath: string;
  private store: SessionStore | null = null;

  constructor() {
    this.storePath = join(homedir(), '.vibetasks', 'sessions.json');
  }

  /**
   * Generate a memorable session ID like "swift-fox-42"
   */
  private generateSessionId(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}-${noun}-${num}`;
  }

  /**
   * Load sessions from disk
   */
  private async load(): Promise<SessionStore> {
    if (this.store) return this.store;

    try {
      const data = await readFile(this.storePath, 'utf-8');
      this.store = JSON.parse(data);
      return this.store!;
    } catch {
      // Initialize empty store
      this.store = { sessions: [] };
      return this.store;
    }
  }

  /**
   * Save sessions to disk
   */
  private async save(): Promise<void> {
    const dir = join(homedir(), '.vibetasks');
    await mkdir(dir, { recursive: true });
    await writeFile(this.storePath, JSON.stringify(this.store, null, 2));
  }

  /**
   * Start a new session
   */
  async startSession(project?: string): Promise<Session> {
    const store = await this.load();
    
    // End any current session
    if (store.currentSession) {
      await this.endSession();
    }

    const session: Session = {
      id: this.generateSessionId(),
      fullId: randomUUID(),
      startedAt: new Date().toISOString(),
      project,
      actions: [],
    };

    store.sessions.push(session);
    store.currentSession = session.id;
    await this.save();

    return session;
  }

  /**
   * Get current session (or start one if none exists)
   */
  async getCurrentSession(): Promise<Session | null> {
    const store = await this.load();
    
    if (!store.currentSession) {
      return null;
    }

    return store.sessions.find(s => s.id === store.currentSession) || null;
  }

  /**
   * Get or create current session
   */
  async getOrCreateSession(project?: string): Promise<Session> {
    const current = await this.getCurrentSession();
    if (current) return current;
    return this.startSession(project);
  }

  /**
   * Log an action in the current session
   */
  async logAction(action: Omit<SessionAction, 'timestamp'>): Promise<void> {
    const store = await this.load();
    const session = store.sessions.find(s => s.id === store.currentSession);
    
    if (!session) {
      // Auto-start a session if none exists
      const newSession = await this.startSession();
      newSession.actions.push({
        ...action,
        timestamp: new Date().toISOString(),
      });
    } else {
      session.actions.push({
        ...action,
        timestamp: new Date().toISOString(),
      });
    }
    
    await this.save();
  }

  /**
   * End the current session
   */
  async endSession(summary?: string): Promise<Session | null> {
    const store = await this.load();
    const session = store.sessions.find(s => s.id === store.currentSession);
    
    if (session) {
      session.endedAt = new Date().toISOString();
      session.summary = summary;
      store.currentSession = undefined;
      await this.save();
    }

    return session || null;
  }

  /**
   * Get a session by ID (partial match supported)
   */
  async getSession(id: string): Promise<Session | null> {
    const store = await this.load();
    
    // Try exact match first
    let session = store.sessions.find(s => s.id === id);
    if (session) return session;

    // Try partial match
    session = store.sessions.find(s => s.id.includes(id) || s.fullId.startsWith(id));
    return session || null;
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const store = await this.load();
    return store.sessions
      .slice(-limit)
      .reverse();
  }

  /**
   * Get session summary for handoff to next AI
   */
  async getSessionHandoff(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return `Session "${sessionId}" not found.`;
    }

    const lines: string[] = [
      `## Session: ${session.id}`,
      `Started: ${session.startedAt}`,
      session.endedAt ? `Ended: ${session.endedAt}` : `Status: ACTIVE`,
      session.project ? `Project: ${session.project}` : '',
      '',
      `### Actions (${session.actions.length}):`,
    ];

    for (const action of session.actions) {
      const time = new Date(action.timestamp).toLocaleTimeString();
      switch (action.type) {
        case 'task_created':
          lines.push(`- [${time}] Created task: "${action.taskTitle}" (${action.taskId})`);
          break;
        case 'task_completed':
          lines.push(`- [${time}] Completed: "${action.taskTitle}"`);
          break;
        case 'task_updated':
          lines.push(`- [${time}] Updated: "${action.taskTitle}"`);
          break;
        case 'file_modified':
          lines.push(`- [${time}] Modified: ${action.filePath}`);
          break;
        case 'note':
          lines.push(`- [${time}] Note: ${action.description}`);
          break;
      }
    }

    if (session.summary) {
      lines.push('', '### Summary:', session.summary);
    }

    return lines.filter(Boolean).join('\n');
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
