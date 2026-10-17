import * as vscode from 'vscode';

/**
 * Error category for pattern detection (matches shared types)
 */
export type ErrorCategory =
  | 'nodejs'
  | 'typescript'
  | 'npm'
  | 'webpack'
  | 'vite'
  | 'expo'
  | 'python'
  | 'rust'
  | 'go'
  | 'eslint'
  | 'general';

/**
 * ErrorContext - matches the shared package format for error tracking
 * This allows consistent error handling across CLI, MCP, and VS Code extension
 */
export interface ErrorContext {
  /** Original error text (raw diagnostic message) */
  raw_text: string;
  
  /** Extracted error type (e.g., "TypeError", "TS2304", "eslint/no-unused-vars") */
  error_type?: string;
  
  /** Human-readable error message */
  message?: string;
  
  /** Error category for grouping */
  category?: ErrorCategory;
  
  /** Source file path */
  file_path?: string;
  
  /** Line number (1-based) */
  line_number?: number;
  
  /** Column number (1-based) */
  column?: number;
  
  /** Error code (e.g., "TS2304", "no-unused-vars") */
  code?: string;
  
  /** Code snippet around the error */
  code_snippet?: string;
  
  /** Auto-generated fix suggestion */
  suggestion?: string;
  
  /** When the error was captured */
  captured_at: string;
  
  /** Source of the error capture */
  capture_source: 'vscode';
}

/**
 * Diagnostic information extracted from VS Code
 */
export interface DiagnosticInfo {
  message: string;
  severity: vscode.DiagnosticSeverity;
  source: string;
  code: string | number | undefined;
  range: vscode.Range;
  relatedInformation?: vscode.DiagnosticRelatedInformation[];
}

/**
 * DiagnosticsCollector gathers errors and warnings from VS Code's diagnostics system
 * This includes TypeScript errors, ESLint warnings, and any other language server diagnostics
 */
export class DiagnosticsCollector {
  
  /**
   * Get all diagnostics for the current workspace
   */
  getAllDiagnostics(): Map<vscode.Uri, DiagnosticInfo[]> {
    const allDiagnostics = new Map<vscode.Uri, DiagnosticInfo[]>();
    
    vscode.languages.getDiagnostics().forEach(([uri, diagnostics]) => {
      const filtered = diagnostics
        .filter(d => d.severity === vscode.DiagnosticSeverity.Error || 
                     d.severity === vscode.DiagnosticSeverity.Warning)
        .map(d => this.toDiagnosticInfo(d));
      
      if (filtered.length > 0) {
        allDiagnostics.set(uri, filtered);
      }
    });

    return allDiagnostics;
  }

  /**
   * Get diagnostics for a specific file
   */
  getFileDiagnostics(document: vscode.TextDocument, includeWarnings: boolean = false): DiagnosticInfo[] {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    
    return diagnostics
      .filter(d => {
        if (d.severity === vscode.DiagnosticSeverity.Error) {
          return true;
        }
        if (includeWarnings && d.severity === vscode.DiagnosticSeverity.Warning) {
          return true;
        }
        return false;
      })
      .map(d => this.toDiagnosticInfo(d))
      .sort((a, b) => a.range.start.line - b.range.start.line);
  }

  /**
   * Get diagnostics at a specific cursor position
   */
  getDiagnosticsAtPosition(document: vscode.TextDocument, position: vscode.Position): DiagnosticInfo[] {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    
    return diagnostics
      .filter(d => d.range.contains(position))
      .map(d => this.toDiagnosticInfo(d))
      .sort((a, b) => {
        // Sort by severity (errors first)
        if (a.severity !== b.severity) {
          return a.severity - b.severity;
        }
        // Then by how close the range start is
        return a.range.start.character - b.range.start.character;
      });
  }

  /**
   * Get diagnostics on a specific line
   */
  getDiagnosticsOnLine(document: vscode.TextDocument, line: number): DiagnosticInfo[] {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    
    return diagnostics
      .filter(d => d.range.start.line === line || d.range.end.line === line)
      .map(d => this.toDiagnosticInfo(d))
      .sort((a, b) => {
        // Sort by severity (errors first)
        if (a.severity !== b.severity) {
          return a.severity - b.severity;
        }
        return a.range.start.character - b.range.start.character;
      });
  }

  /**
   * Get error count for the current file
   */
  getErrorCount(document: vscode.TextDocument | undefined): number {
    if (!document) {
      return 0;
    }
    
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    return diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
  }

  /**
   * Get total error count for entire workspace
   */
  getWorkspaceErrorCount(): { errors: number; warnings: number } {
    let errors = 0;
    let warnings = 0;

    vscode.languages.getDiagnostics().forEach(([, diagnostics]) => {
      diagnostics.forEach(d => {
        if (d.severity === vscode.DiagnosticSeverity.Error) {
          errors++;
        } else if (d.severity === vscode.DiagnosticSeverity.Warning) {
          warnings++;
        }
      });
    });

    return { errors, warnings };
  }

  /**
   * Convert VS Code Diagnostic to our DiagnosticInfo
   */
  private toDiagnosticInfo(diagnostic: vscode.Diagnostic): DiagnosticInfo {
    return {
      message: diagnostic.message,
      severity: diagnostic.severity,
      source: diagnostic.source || 'unknown',
      code: typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code,
      range: diagnostic.range,
      relatedInformation: diagnostic.relatedInformation,
    };
  }

  /**
   * Format diagnostic for display
   */
  formatDiagnostic(diagnostic: DiagnosticInfo, document: vscode.TextDocument): string {
    const fileName = this.getRelativeFileName(document.uri);
    const line = diagnostic.range.start.line + 1;
    const col = diagnostic.range.start.character + 1;
    const severityText = this.getSeverityText(diagnostic.severity);
    const codeText = diagnostic.code ? ` (${diagnostic.code})` : '';

    return `${fileName}:${line}:${col} - ${severityText}${codeText}: ${diagnostic.message}`;
  }

  /**
   * Get the code snippet for a diagnostic
   */
  getCodeSnippet(document: vscode.TextDocument, range: vscode.Range, contextLines: number = 2): string {
    const startLine = Math.max(0, range.start.line - contextLines);
    const endLine = Math.min(document.lineCount - 1, range.end.line + contextLines);
    
    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const lineText = document.lineAt(i).text;
      const lineNumber = (i + 1).toString().padStart(4, ' ');
      const marker = (i >= range.start.line && i <= range.end.line) ? '>' : ' ';
      lines.push(`${marker}${lineNumber} | ${lineText}`);
    }

    return lines.join('\n');
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
        return uri.fsPath.substring(folder.uri.fsPath.length + 1);
      }
    }

    return uri.fsPath;
  }

  /**
   * Get severity as text
   */
  private getSeverityText(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'unknown';
    }
  }

  /**
   * Convert VS Code DiagnosticInfo to shared ErrorContext format
   * This ensures compatibility with the shared error system across VibeTasks
   */
  toErrorContext(diagnostic: DiagnosticInfo, document: vscode.TextDocument): ErrorContext {
    const fileName = this.getRelativeFileName(document.uri);
    const line = diagnostic.range.start.line + 1;  // Convert to 1-based
    const col = diagnostic.range.start.character + 1;  // Convert to 1-based
    
    // Detect error category from source
    const category = this.detectCategory(diagnostic.source, diagnostic.code);
    
    // Build error type string
    const errorType = this.buildErrorType(diagnostic);
    
    // Get code snippet
    const codeSnippet = this.getCodeSnippet(document, diagnostic.range, 2);
    
    // Generate suggestion based on error type
    const suggestion = this.generateSuggestion(category, diagnostic.code, diagnostic.message);
    
    return {
      raw_text: this.formatDiagnostic(diagnostic, document),
      error_type: errorType,
      message: diagnostic.message,
      category,
      file_path: fileName,
      line_number: line,
      column: col,
      code: diagnostic.code?.toString(),
      code_snippet: codeSnippet,
      suggestion,
      captured_at: new Date().toISOString(),
      capture_source: 'vscode',
    };
  }

  /**
   * Convert raw error text (e.g., from selection) to ErrorContext
   */
  parseRawErrorText(errorText: string, document: vscode.TextDocument): ErrorContext {
    const fileName = this.getRelativeFileName(document.uri);
    
    // Try to detect error category from text patterns
    let category: ErrorCategory = 'general';
    let errorType: string | undefined;
    let message = errorText.split('\n')[0].substring(0, 200);
    let filePath: string | undefined;
    let lineNumber: number | undefined;
    let column: number | undefined;
    
    // TypeScript errors: TS2304, TS2339, etc.
    if (/TS\d{4,5}/.test(errorText) || /error TS\d+/i.test(errorText)) {
      category = 'typescript';
      const match = errorText.match(/TS(\d{4,5})/);
      errorType = match ? `TS${match[1]}` : 'TypeScript Error';
      const msgMatch = errorText.match(/TS\d+:\s*(.+?)(?:\n|$)/);
      if (msgMatch) message = msgMatch[1].trim();
      const fileMatch = errorText.match(/([^\s:(]+\.[tj]sx?):(\d+):(\d+)/);
      if (fileMatch) {
        filePath = fileMatch[1];
        lineNumber = parseInt(fileMatch[2]);
        column = parseInt(fileMatch[3]);
      }
    }
    // Node.js runtime errors
    else if (/TypeError:|ReferenceError:|SyntaxError:|RangeError:|Error:/.test(errorText)) {
      category = 'nodejs';
      const match = errorText.match(/(TypeError|ReferenceError|SyntaxError|RangeError|Error):/);
      errorType = match ? match[1] : 'Error';
      const msgMatch = errorText.match(/(TypeError|ReferenceError|SyntaxError|RangeError|Error):\s*(.+?)(?:\n|$)/);
      if (msgMatch) message = msgMatch[2].trim();
      const stackMatch = errorText.match(/at\s+.+\s+\((.+):(\d+):(\d+)\)/);
      if (stackMatch) {
        filePath = stackMatch[1];
        lineNumber = parseInt(stackMatch[2]);
        column = parseInt(stackMatch[3]);
      }
    }
    // npm errors
    else if (/npm ERR!|npm error|ERESOLVE|E404|ENOENT/i.test(errorText)) {
      category = 'npm';
      if (errorText.includes('ERESOLVE')) errorType = 'ERESOLVE';
      else if (errorText.includes('E404')) errorType = 'E404';
      else if (errorText.includes('ENOENT')) errorType = 'ENOENT';
      else errorType = 'npm Error';
      const msgMatch = errorText.match(/npm ERR!\s*(.+?)(?:\n|$)/);
      if (msgMatch) message = msgMatch[1].trim();
    }
    // ESLint errors
    else if (/eslint/i.test(errorText) || /\d+:\d+\s+error\s+.+\s+\S+\/\S+/.test(errorText)) {
      category = 'eslint';
      errorType = 'ESLint Error';
      const ruleMatch = errorText.match(/error\s+.+?\s+(\S+\/\S+|\S+)$/m);
      if (ruleMatch) errorType = `eslint/${ruleMatch[1]}`;
    }
    // Webpack/build errors
    else if (/Module not found|Failed to compile|webpack|Can't resolve/i.test(errorText)) {
      category = 'webpack';
      if (errorText.includes('Module not found')) errorType = 'Module Not Found';
      else if (errorText.includes('Failed to compile')) errorType = 'Compile Error';
      else errorType = 'Webpack Error';
    }
    // Python errors
    else if (/Traceback|NameError:|ValueError:|ImportError:|AttributeError:|KeyError:|IndexError:/.test(errorText)) {
      category = 'python';
      const match = errorText.match(/(NameError|ValueError|TypeError|ImportError|AttributeError|KeyError|IndexError):/);
      errorType = match ? match[1] : 'Python Error';
      const fileMatch = errorText.match(/File "(.+)", line (\d+)/);
      if (fileMatch) {
        filePath = fileMatch[1];
        lineNumber = parseInt(fileMatch[2]);
      }
    }
    
    return {
      raw_text: errorText,
      error_type: errorType,
      message,
      category,
      file_path: filePath || fileName,
      line_number: lineNumber,
      column,
      captured_at: new Date().toISOString(),
      capture_source: 'vscode',
    };
  }

  /**
   * Detect error category from diagnostic source
   */
  private detectCategory(source: string, code: string | number | undefined): ErrorCategory {
    const sourceLower = source?.toLowerCase() || '';
    
    if (sourceLower === 'ts' || sourceLower === 'typescript') {
      return 'typescript';
    }
    if (sourceLower === 'eslint') {
      return 'eslint';
    }
    if (sourceLower.includes('python') || sourceLower === 'pylance' || sourceLower === 'pyright') {
      return 'python';
    }
    if (sourceLower.includes('rust') || sourceLower === 'rust-analyzer') {
      return 'rust';
    }
    if (sourceLower === 'go' || sourceLower === 'gopls') {
      return 'go';
    }
    if (sourceLower.includes('vite')) {
      return 'vite';
    }
    if (sourceLower.includes('webpack')) {
      return 'webpack';
    }
    if (sourceLower.includes('expo') || sourceLower.includes('metro')) {
      return 'expo';
    }
    
    // Check if code looks like TypeScript
    if (typeof code === 'number' && code >= 1000 && code <= 99999) {
      return 'typescript';
    }
    
    return 'general';
  }

  /**
   * Build error type string from diagnostic
   */
  private buildErrorType(diagnostic: DiagnosticInfo): string {
    const source = diagnostic.source?.toLowerCase() || '';
    const code = diagnostic.code;
    
    if (source === 'ts' || source === 'typescript') {
      return code ? `TS${code}` : 'TypeScript Error';
    }
    if (source === 'eslint') {
      return code ? `eslint/${code}` : 'ESLint Error';
    }
    if (source && code) {
      return `${source}/${code}`;
    }
    if (source) {
      return `${source} error`;
    }
    if (code) {
      return `Error ${code}`;
    }
    return 'Error';
  }

  /**
   * Generate a fix suggestion based on error category and code
   */
  private generateSuggestion(
    category: ErrorCategory,
    code: string | number | undefined,
    message: string
  ): string | undefined {
    const codeStr = code?.toString() || '';
    
    // TypeScript suggestions
    if (category === 'typescript') {
      if (codeStr === '2304' || message.includes('Cannot find name')) {
        return 'Check if the variable/type is imported or defined in scope.';
      }
      if (codeStr === '2339' || message.includes('does not exist on type')) {
        return 'The property might be missing from the type definition. Check the type or add the property.';
      }
      if (codeStr === '2345' || message.includes('not assignable')) {
        return 'Type mismatch. Check if the value matches the expected type.';
      }
      if (codeStr === '2322' || message.includes('not assignable to type')) {
        return 'Assignment type mismatch. Ensure the assigned value matches the target type.';
      }
      if (codeStr === '7006' || message.includes('implicitly has')) {
        return 'Add explicit type annotations or enable noImplicitAny in tsconfig.';
      }
    }
    
    // ESLint suggestions
    if (category === 'eslint') {
      if (codeStr.includes('no-unused-vars')) {
        return 'Remove the unused variable or use it in your code.';
      }
      if (codeStr.includes('no-console')) {
        return 'Remove console statements or disable the rule for development.';
      }
      if (codeStr.includes('prefer-const')) {
        return 'Use const instead of let for variables that are never reassigned.';
      }
    }
    
    // npm suggestions
    if (category === 'npm') {
      if (codeStr === 'ERESOLVE') {
        return 'Try: npm install --legacy-peer-deps or check package version compatibility.';
      }
      if (codeStr === 'E404') {
        return 'Package not found. Check the package name spelling.';
      }
    }
    
    // Node.js suggestions
    if (category === 'nodejs') {
      if (message.includes('TypeError')) {
        return 'Check for undefined/null values or incorrect type usage.';
      }
      if (message.includes('ReferenceError')) {
        return 'Variable is not defined. Check spelling and scope.';
      }
    }
    
    return undefined;
  }
}
