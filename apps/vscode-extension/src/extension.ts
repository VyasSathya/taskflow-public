import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { DiagnosticsCollector, DiagnosticInfo } from './diagnostics';
import { TaskCreator } from './tasks';
import { StatusBarManager } from './statusbar';

let authManager: AuthManager;
let diagnosticsCollector: DiagnosticsCollector;
let taskCreator: TaskCreator;
let statusBarManager: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('VibeTasks extension activating...');

  // Initialize managers
  authManager = new AuthManager(context);
  diagnosticsCollector = new DiagnosticsCollector();
  taskCreator = new TaskCreator(authManager);
  statusBarManager = new StatusBarManager(diagnosticsCollector);

  // Register commands
  const captureErrorCmd = vscode.commands.registerCommand(
    'vibetasks.captureError',
    () => captureCurrentError()
  );

  const captureAllErrorsCmd = vscode.commands.registerCommand(
    'vibetasks.captureAllErrors',
    () => captureAllErrors()
  );

  const captureSelectedErrorsCmd = vscode.commands.registerCommand(
    'vibetasks.captureSelectedErrors',
    () => captureSelectedErrors()
  );

  const loginCmd = vscode.commands.registerCommand(
    'vibetasks.login',
    () => login()
  );

  const logoutCmd = vscode.commands.registerCommand(
    'vibetasks.logout',
    () => logout()
  );

  const showStatusCmd = vscode.commands.registerCommand(
    'vibetasks.showStatus',
    () => showStatus()
  );

  // Subscribe to diagnostics changes for status bar updates
  const diagnosticsWatcher = vscode.languages.onDidChangeDiagnostics(() => {
    statusBarManager.update();
  });

  context.subscriptions.push(
    captureErrorCmd,
    captureAllErrorsCmd,
    captureSelectedErrorsCmd,
    loginCmd,
    logoutCmd,
    showStatusCmd,
    diagnosticsWatcher,
    statusBarManager
  );

  // Initial status bar update
  statusBarManager.update();

  console.log('VibeTasks extension activated!');
}

export function deactivate() {
  console.log('VibeTasks extension deactivated');
}

/**
 * Capture the error at the current cursor position
 * Cmd+Shift+E (macOS) or Ctrl+Shift+E (Windows/Linux)
 */
async function captureCurrentError(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  // Check authentication
  if (!await authManager.isAuthenticated()) {
    const choice = await vscode.window.showWarningMessage(
      'Not logged in to VibeTasks. Would you like to login?',
      'Login',
      'Cancel'
    );
    if (choice === 'Login') {
      await login();
    }
    return;
  }

  const document = editor.document;
  const position = editor.selection.active;

  // Get diagnostics at cursor position or on current line
  const diagnostics = diagnosticsCollector.getDiagnosticsAtPosition(document, position);

  if (diagnostics.length === 0) {
    // No diagnostics at cursor, try to get from current line
    const lineDiagnostics = diagnosticsCollector.getDiagnosticsOnLine(document, position.line);
    
    if (lineDiagnostics.length === 0) {
      // Check if there's selected text - capture as manual error
      const selection = editor.selection;
      if (!selection.isEmpty) {
        const selectedText = document.getText(selection);
        await captureManualError(selectedText, document, selection);
        return;
      }
      
      vscode.window.showInformationMessage('No errors found at cursor position');
      return;
    }

    // Use first diagnostic on the line
    await createTaskFromDiagnostic(lineDiagnostics[0], document);
  } else {
    // Use first diagnostic at cursor
    await createTaskFromDiagnostic(diagnostics[0], document);
  }
}

/**
 * Capture all errors in the current file
 */
async function captureAllErrors(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  if (!await authManager.isAuthenticated()) {
    const choice = await vscode.window.showWarningMessage(
      'Not logged in to VibeTasks. Would you like to login?',
      'Login',
      'Cancel'
    );
    if (choice === 'Login') {
      await login();
    }
    return;
  }

  const document = editor.document;
  const config = vscode.workspace.getConfiguration('vibetasks');
  const includeWarnings = config.get<boolean>('includeWarnings', false);

  const diagnostics = diagnosticsCollector.getFileDiagnostics(document, includeWarnings);

  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage('No errors found in this file');
    return;
  }

  // Confirm before creating multiple tasks
  const confirm = await vscode.window.showWarningMessage(
    `Create ${diagnostics.length} task(s) for all errors in this file?`,
    'Yes',
    'Select Errors',
    'Cancel'
  );

  if (confirm === 'Cancel' || !confirm) {
    return;
  }

  if (confirm === 'Select Errors') {
    await captureSelectedErrors();
    return;
  }

  // Create tasks for all errors
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Creating VibeTasks...',
      cancellable: false,
    },
    async (progress) => {
      let created = 0;
      for (const diagnostic of diagnostics) {
        try {
          await taskCreator.createTaskFromDiagnostic(diagnostic, document);
          created++;
          progress.report({
            increment: (100 / diagnostics.length),
            message: `${created}/${diagnostics.length}`,
          });
        } catch (error: any) {
          console.error('Failed to create task:', error);
        }
      }

      vscode.window.showInformationMessage(
        `Created ${created} task(s) in VibeTasks`
      );
    }
  );
}

/**
 * Show quick pick to select which errors to capture
 */
async function captureSelectedErrors(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  if (!await authManager.isAuthenticated()) {
    const choice = await vscode.window.showWarningMessage(
      'Not logged in to VibeTasks. Would you like to login?',
      'Login',
      'Cancel'
    );
    if (choice === 'Login') {
      await login();
    }
    return;
  }

  const document = editor.document;
  const config = vscode.workspace.getConfiguration('vibetasks');
  const includeWarnings = config.get<boolean>('includeWarnings', false);

  const diagnostics = diagnosticsCollector.getFileDiagnostics(document, includeWarnings);

  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage('No errors found in this file');
    return;
  }

  // Create quick pick items
  const items: (vscode.QuickPickItem & { diagnostic: DiagnosticInfo })[] = diagnostics.map((d) => ({
    label: getSeverityIcon(d.severity) + ' ' + truncate(d.message, 60),
    description: `Line ${d.range.start.line + 1}`,
    detail: `[${d.source}] ${d.code ? `(${d.code})` : ''}`,
    picked: d.severity === vscode.DiagnosticSeverity.Error,
    diagnostic: d,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Select errors to capture as tasks',
    title: 'VibeTasks: Select Errors',
  });

  if (!selected || selected.length === 0) {
    return;
  }

  // Create tasks for selected errors
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Creating VibeTasks...',
      cancellable: false,
    },
    async (progress) => {
      let created = 0;
      for (const item of selected) {
        try {
          await taskCreator.createTaskFromDiagnostic(item.diagnostic, document);
          created++;
          progress.report({
            increment: (100 / selected.length),
            message: `${created}/${selected.length}`,
          });
        } catch (error: any) {
          console.error('Failed to create task:', error);
        }
      }

      vscode.window.showInformationMessage(
        `Created ${created} task(s) in VibeTasks`
      );
    }
  );
}

/**
 * Create task from diagnostic
 */
async function createTaskFromDiagnostic(
  diagnostic: DiagnosticInfo,
  document: vscode.TextDocument
): Promise<void> {
  try {
    const task = await taskCreator.createTaskFromDiagnostic(diagnostic, document);
    vscode.window.showInformationMessage(
      `Task created: ${truncate(task.title, 50)}`,
      'View Tasks'
    ).then((action) => {
      if (action === 'View Tasks') {
        vscode.env.openExternal(vscode.Uri.parse('https://vibetasks.com'));
      }
    });
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to create task: ${error.message}`);
  }
}

/**
 * Capture manually selected text as an error
 * Passes the selection to extract file path and line number context
 */
async function captureManualError(
  errorText: string,
  document: vscode.TextDocument,
  selection?: vscode.Selection
): Promise<void> {
  try {
    const task = await taskCreator.createTaskFromText(errorText, document, selection);
    vscode.window.showInformationMessage(
      `Task created: ${truncate(task.title, 50)}`,
      'View Tasks'
    ).then((action) => {
      if (action === 'View Tasks') {
        vscode.env.openExternal(vscode.Uri.parse('https://vibetasks.com'));
      }
    });
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to create task: ${error.message}`);
  }
}

/**
 * Login to VibeTasks
 */
async function login(): Promise<void> {
  const email = await vscode.window.showInputBox({
    prompt: 'Enter your VibeTasks email',
    placeHolder: 'email@example.com',
    validateInput: (value) => {
      if (!value.includes('@')) {
        return 'Please enter a valid email';
      }
      return null;
    },
  });

  if (!email) {
    return;
  }

  const password = await vscode.window.showInputBox({
    prompt: 'Enter your VibeTasks password',
    password: true,
  });

  if (!password) {
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Logging in to VibeTasks...',
      },
      async () => {
        await authManager.login(email, password);
      }
    );

    vscode.window.showInformationMessage('Successfully logged in to VibeTasks!');
    statusBarManager.update();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Login failed: ${error.message}`);
  }
}

/**
 * Logout from VibeTasks
 */
async function logout(): Promise<void> {
  try {
    await authManager.logout();
    vscode.window.showInformationMessage('Logged out from VibeTasks');
    statusBarManager.update();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Logout failed: ${error.message}`);
  }
}

/**
 * Show current status
 */
async function showStatus(): Promise<void> {
  const isAuth = await authManager.isAuthenticated();
  const user = isAuth ? await authManager.getCurrentUser() : null;
  
  const editor = vscode.window.activeTextEditor;
  let errorCount = 0;
  if (editor) {
    const diagnostics = diagnosticsCollector.getFileDiagnostics(editor.document, false);
    errorCount = diagnostics.length;
  }

  const message = isAuth
    ? `VibeTasks: Logged in as ${user?.email || 'unknown'}\nErrors in current file: ${errorCount}`
    : 'VibeTasks: Not logged in';

  vscode.window.showInformationMessage(message, isAuth ? 'Logout' : 'Login').then((action) => {
    if (action === 'Login') {
      login();
    } else if (action === 'Logout') {
      logout();
    }
  });
}

// Helper functions
function getSeverityIcon(severity: vscode.DiagnosticSeverity): string {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return '$(error)';
    case vscode.DiagnosticSeverity.Warning:
      return '$(warning)';
    case vscode.DiagnosticSeverity.Information:
      return '$(info)';
    case vscode.DiagnosticSeverity.Hint:
      return '$(lightbulb)';
    default:
      return '$(circle)';
  }
}

function truncate(str: string, length: number): string {
  if (str.length <= length) {
    return str;
  }
  return str.substring(0, length - 3) + '...';
}
