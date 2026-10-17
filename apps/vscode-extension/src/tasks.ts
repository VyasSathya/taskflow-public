import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { DiagnosticInfo, DiagnosticsCollector, ErrorContext } from './diagnostics';

/**
 * Source type for task tracking - matches shared types
 */
export type TaskSourceType = 'vscode_extension';

/**
 * Task representation from VibeTasks API
 */
export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  status: 'todo' | 'vibing' | 'done' | 'archived';
  project_tag?: string;
  created_by: 'ai' | 'human';
  source_type?: TaskSourceType;
  error_context?: ErrorContext;
  created_at: string;
}

/**
 * TaskCreator handles creating VibeTasks tasks from VS Code diagnostics
 */
export class TaskCreator {
  private authManager: AuthManager;
  private diagnosticsCollector: DiagnosticsCollector;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.diagnosticsCollector = new DiagnosticsCollector();
  }

  /**
   * Create a task from a VS Code diagnostic
   */
  async createTaskFromDiagnostic(
    diagnostic: DiagnosticInfo,
    document: vscode.TextDocument
  ): Promise<Task> {
    const config = vscode.workspace.getConfiguration('vibetasks');
    
    // Build task title using error context format
    const errorContext = this.diagnosticsCollector.toErrorContext(diagnostic, document);
    const title = this.buildTitleFromErrorContext(errorContext);
    
    // Build task notes with context
    const notes = this.buildNotes(diagnostic, document);
    
    // Get project tag
    const projectTag = this.getProjectTag(document.uri);
    
    // Get priority from config
    const priority = config.get<'none' | 'low' | 'medium' | 'high'>('defaultPriority', 'high');

    return await this.createTask({
      title,
      notes,
      priority,
      project_tag: projectTag,
      error_context: errorContext,
    });
  }

  /**
   * Create a task from selected text (manual error capture)
   */
  async createTaskFromText(
    errorText: string,
    document: vscode.TextDocument,
    selection?: vscode.Selection
  ): Promise<Task> {
    const config = vscode.workspace.getConfiguration('vibetasks');
    
    // Parse the error text into ErrorContext format
    const errorContext = this.diagnosticsCollector.parseRawErrorText(errorText, document);
    
    // If we have a selection, add the line number from cursor position
    if (selection && !errorContext.line_number) {
      errorContext.line_number = selection.active.line + 1;  // Convert to 1-based
      errorContext.column = selection.active.character + 1;
    }
    
    // Build title from error context
    const title = this.buildTitleFromErrorContext(errorContext);
    
    // Get project tag
    const projectTag = this.getProjectTag(document.uri);
    
    // Get priority from config
    const priority = config.get<'none' | 'low' | 'medium' | 'high'>('defaultPriority', 'high');

    // Build notes with full error and file context
    const fileName = this.getRelativeFileName(document.uri);
    const notes = this.buildNotesFromErrorContext(errorContext, fileName);

    return await this.createTask({
      title,
      notes,
      priority,
      project_tag: projectTag,
      error_context: errorContext,
    });
  }

  /**
   * Create a task via Supabase API
   */
  private async createTask(taskData: {
    title: string;
    notes?: string;
    priority: 'none' | 'low' | 'medium' | 'high';
    project_tag?: string;
    error_context?: ErrorContext;
  }): Promise<Task> {
    const client = await this.authManager.getAuthenticatedClient();
    
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        title: taskData.title,
        notes: taskData.notes,
        notes_format: 'markdown',
        priority: taskData.priority,
        status: 'todo',
        project_tag: taskData.project_tag,
        created_by: 'human', // VS Code extension is user-initiated
        source_type: 'vscode_extension',
        error_context: taskData.error_context,
        position: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Task;
  }

  /**
   * Build task title from ErrorContext (shared format)
   * Format: "Fix [category] [error_type]: [message] in [file:line]"
   */
  private buildTitleFromErrorContext(error: ErrorContext): string {
    const prefix: Record<string, string> = {
      nodejs: 'Fix',
      typescript: 'Fix TS',
      npm: 'Resolve npm',
      webpack: 'Fix webpack',
      vite: 'Fix Vite',
      expo: 'Fix Expo',
      python: 'Fix Python',
      rust: 'Fix Rust',
      go: 'Fix Go',
      eslint: 'Fix ESLint',
      general: 'Fix',
    };

    const category = error.category || 'general';
    let title = `${prefix[category]} ${error.error_type || 'error'}`;
    
    // Add message snippet if available
    if (error.message) {
      const snippet = error.message
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50);
      title += `: ${snippet}`;
      if (error.message.length > 50) title += '...';
    }
    
    // Add file reference if available
    if (error.file_path && error.line_number) {
      const fileName = error.file_path.split(/[/\\]/).pop();
      title += ` in ${fileName}:${error.line_number}`;
    }
    
    return title.substring(0, 100);
  }

  /**
   * Build task title from diagnostic (legacy method for backwards compatibility)
   */
  private buildTitle(diagnostic: DiagnosticInfo): string {
    const source = diagnostic.source;
    const code = diagnostic.code;
    
    // Clean up the message
    let message = diagnostic.message
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Build title with source/code prefix
    let title = '';
    
    if (source === 'ts' || source === 'typescript') {
      // TypeScript error
      if (code) {
        title = `TS${code}: `;
      }
    } else if (source === 'eslint') {
      // ESLint error
      if (code) {
        title = `ESLint(${code}): `;
      }
    } else if (source && code) {
      // Other source with code
      title = `[${source}] ${code}: `;
    } else if (source) {
      // Source only
      title = `[${source}] `;
    }

    title += message;

    // Truncate to reasonable length
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title;
  }

  /**
   * Build notes from ErrorContext for manual error captures
   */
  private buildNotesFromErrorContext(error: ErrorContext, fileName: string): string {
    const parts: string[] = [];
    
    // Location info
    if (error.file_path || fileName) {
      const location = error.line_number
        ? `\`${error.file_path || fileName}:${error.line_number}${error.column ? ':' + error.column : ''}\``
        : `\`${error.file_path || fileName}\``;
      parts.push(`**Location:** ${location}`);
    }
    
    // Category and type
    if (error.category && error.category !== 'general') {
      parts.push(`**Category:** ${error.category}`);
    }
    if (error.error_type) {
      parts.push(`**Error Type:** ${error.error_type}`);
    }
    
    parts.push('');
    
    // Full error text
    parts.push('**Error:**');
    parts.push('```');
    parts.push(error.raw_text);
    parts.push('```');
    
    // Suggestion if available
    if (error.suggestion) {
      parts.push('');
      parts.push(`**Suggestion:** ${error.suggestion}`);
    }
    
    // Code snippet if available
    if (error.code_snippet) {
      parts.push('');
      parts.push('**Code Context:**');
      parts.push('```');
      parts.push(error.code_snippet);
      parts.push('```');
    }
    
    return parts.join('\n');
  }

  /**
   * Build task notes with diagnostic context
   */
  private buildNotes(diagnostic: DiagnosticInfo, document: vscode.TextDocument): string {
    const parts: string[] = [];
    
    // File and location
    const fileName = this.getRelativeFileName(document.uri);
    const line = diagnostic.range.start.line + 1;
    const col = diagnostic.range.start.character + 1;
    parts.push(`**Location:** \`${fileName}:${line}:${col}\``);
    
    // Severity
    parts.push(`**Severity:** ${this.getSeverityEmoji(diagnostic.severity)} ${this.getSeverityText(diagnostic.severity)}`);
    
    // Source and code
    if (diagnostic.source || diagnostic.code) {
      const sourceCode = [diagnostic.source, diagnostic.code].filter(Boolean).join(' ');
      parts.push(`**Source:** ${sourceCode}`);
    }
    
    parts.push('');
    
    // Full error message
    parts.push('**Error Message:**');
    parts.push('```');
    parts.push(diagnostic.message);
    parts.push('```');
    
    parts.push('');
    
    // Code snippet
    parts.push('**Code Context:**');
    parts.push('```' + this.getLanguageId(document));
    parts.push(this.diagnosticsCollector.getCodeSnippet(document, diagnostic.range, 3));
    parts.push('```');
    
    // Related information if available
    if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
      parts.push('');
      parts.push('**Related:**');
      for (const info of diagnostic.relatedInformation) {
        const relFile = this.getRelativeFileName(info.location.uri);
        const relLine = info.location.range.start.line + 1;
        parts.push(`- \`${relFile}:${relLine}\`: ${info.message}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Parse error text from selected text
   */
  private parseErrorText(errorText: string): { title: string; notes: string } {
    const lines = errorText.trim().split('\n');
    
    let title = 'Error to fix';
    
    // Try to extract a meaningful title from common error patterns
    if (errorText.includes('TypeError:')) {
      const match = errorText.match(/TypeError:\s*(.+?)(?:\n|$)/);
      if (match) {
        title = `TypeError: ${match[1].slice(0, 60)}`;
      }
    } else if (errorText.includes('Error:')) {
      const match = errorText.match(/Error:\s*(.+?)(?:\n|$)/);
      if (match) {
        title = `Error: ${match[1].slice(0, 60)}`;
      }
    } else if (errorText.includes('error TS')) {
      const match = errorText.match(/error (TS\d+):\s*(.+?)(?:\n|$)/);
      if (match) {
        title = `${match[1]}: ${match[2].slice(0, 50)}`;
      }
    } else if (errorText.includes('Failed to compile')) {
      title = 'Build Error: Failed to compile';
    } else if (lines[0]) {
      title = lines[0].slice(0, 80);
    }

    // Truncate title
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // Notes with full error
    const notes = `\`\`\`\n${errorText}\n\`\`\``;

    return { title, notes };
  }

  /**
   * Get project tag from workspace or settings
   */
  private getProjectTag(uri: vscode.Uri): string | undefined {
    const config = vscode.workspace.getConfiguration('vibetasks');
    const defaultProject = config.get<string>('defaultProject');
    
    if (defaultProject) {
      return defaultProject;
    }

    // Try to auto-detect from workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      // Find which workspace folder contains this file
      for (const folder of workspaceFolders) {
        if (uri.fsPath.startsWith(folder.uri.fsPath)) {
          return folder.name;
        }
      }
      
      // Default to first workspace folder
      return workspaceFolders[0].name;
    }

    return undefined;
  }

  /**
   * Get relative file name from workspace
   */
  private getRelativeFileName(uri: vscode.Uri): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return uri.fsPath;
    }

    for (const folder of workspaceFolders) {
      if (uri.fsPath.startsWith(folder.uri.fsPath)) {
        const relativePath = uri.fsPath.substring(folder.uri.fsPath.length + 1);
        // Normalize path separators for display
        return relativePath.replace(/\\/g, '/');
      }
    }

    return uri.fsPath;
  }

  /**
   * Get language ID for code block
   */
  private getLanguageId(document: vscode.TextDocument): string {
    const langId = document.languageId;
    
    // Map some VS Code language IDs to markdown code block languages
    const langMap: Record<string, string> = {
      'javascriptreact': 'jsx',
      'typescriptreact': 'tsx',
      'plaintext': '',
    };

    return langMap[langId] || langId;
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return '';
      case vscode.DiagnosticSeverity.Warning:
        return '';
      case vscode.DiagnosticSeverity.Information:
        return '';
      case vscode.DiagnosticSeverity.Hint:
        return '';
      default:
        return '';
    }
  }

  /**
   * Get severity as text
   */
  private getSeverityText(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'Error';
      case vscode.DiagnosticSeverity.Warning:
        return 'Warning';
      case vscode.DiagnosticSeverity.Information:
        return 'Info';
      case vscode.DiagnosticSeverity.Hint:
        return 'Hint';
      default:
        return 'Unknown';
    }
  }
}
