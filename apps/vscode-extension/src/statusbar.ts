import * as vscode from 'vscode';
import { DiagnosticsCollector } from './diagnostics';

/**
 * StatusBarManager handles the VibeTasks status bar item
 * Shows error count and provides quick access to capture commands
 */
export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private diagnosticsCollector: DiagnosticsCollector;

  constructor(diagnosticsCollector: DiagnosticsCollector) {
    this.diagnosticsCollector = diagnosticsCollector;

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.command = 'vibetasks.captureSelectedErrors';
    this.statusBarItem.tooltip = 'Click to capture errors as VibeTasks';

    // Check if status bar should be shown
    const config = vscode.workspace.getConfiguration('vibetasks');
    if (config.get<boolean>('showStatusBar', true)) {
      this.statusBarItem.show();
    }

    // Watch for config changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vibetasks.showStatusBar')) {
        const showStatusBar = vscode.workspace
          .getConfiguration('vibetasks')
          .get<boolean>('showStatusBar', true);
        
        if (showStatusBar) {
          this.statusBarItem.show();
        } else {
          this.statusBarItem.hide();
        }
      }
    });

    // Watch for active editor changes
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.update();
    });
  }

  /**
   * Update the status bar item
   */
  update(): void {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      this.statusBarItem.text = '$(check) VibeTasks';
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    const errorCount = this.diagnosticsCollector.getErrorCount(editor.document);
    const { errors: workspaceErrors, warnings: workspaceWarnings } = 
      this.diagnosticsCollector.getWorkspaceErrorCount();

    if (errorCount > 0) {
      this.statusBarItem.text = `$(error) ${errorCount} error${errorCount === 1 ? '' : 's'}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.tooltip = `${errorCount} error${errorCount === 1 ? '' : 's'} in this file\n${workspaceErrors} total in workspace\nClick to capture`;
    } else if (workspaceErrors > 0) {
      this.statusBarItem.text = `$(warning) ${workspaceErrors} workspace error${workspaceErrors === 1 ? '' : 's'}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = `No errors in this file\n${workspaceErrors} error${workspaceErrors === 1 ? '' : 's'} in workspace\nClick to view`;
    } else {
      this.statusBarItem.text = '$(check) VibeTasks';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'No errors found\nCmd+Shift+E to capture at cursor';
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
