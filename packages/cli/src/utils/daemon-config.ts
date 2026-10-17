import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Daemon configuration interface
 */
export interface DaemonConfig {
  enabled: boolean;
  keyboard_shortcut: string;
  auto_start: boolean;
  notification_duration: number; // milliseconds
  auto_create_task: boolean;
  capture_clipboard: boolean;
  capture_screen: boolean;
  error_patterns: string[];
}

/**
 * Default daemon configuration
 */
export const DEFAULT_DAEMON_CONFIG: DaemonConfig = {
  enabled: true,
  keyboard_shortcut: 'Ctrl+Alt+E',
  auto_start: false,
  notification_duration: 5000,
  auto_create_task: false,
  capture_clipboard: true,
  capture_screen: false, // Screen capture requires additional setup
  error_patterns: [
    'Error:',
    'Exception:',
    'TypeError:',
    'ReferenceError:',
    'SyntaxError:',
    'FATAL:',
    'FAILED:',
    'error\\[',
    'panic:',
    'Traceback',
    'at Object\\.',
    'at Module\\.',
    'at async',
    'npm ERR!',
    'yarn error',
    'pnpm ERR!',
  ],
};

/**
 * Manages VibeTasks daemon configuration
 * Stored in ~/.config/taskflow/daemon.json
 */
export class DaemonConfigManager {
  private configDir: string;
  private configPath: string;
  private pidFilePath: string;

  constructor() {
    // Use XDG Base Directory specification on Linux/Mac, APPDATA on Windows
    const configHome = process.env.XDG_CONFIG_HOME ||
      (process.platform === 'win32'
        ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
        : path.join(os.homedir(), '.config'));
    this.configDir = path.join(configHome, 'taskflow');
    this.configPath = path.join(this.configDir, 'daemon.json');
    this.pidFilePath = path.join(this.configDir, 'daemon.pid');
  }

  /**
   * Ensure the config directory exists
   */
  async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create config directory: ${error.message}`);
      }
    }
  }

  /**
   * Get daemon configuration
   */
  async getConfig(): Promise<DaemonConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(data);
      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_DAEMON_CONFIG, ...config };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { ...DEFAULT_DAEMON_CONFIG };
      }
      throw new Error(`Failed to read daemon config: ${error.message}`);
    }
  }

  /**
   * Save daemon configuration
   */
  async saveConfig(config: Partial<DaemonConfig>): Promise<void> {
    await this.ensureConfigDir();
    const currentConfig = await this.getConfig();
    const newConfig = { ...currentConfig, ...config };

    try {
      await fs.writeFile(this.configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write daemon config: ${error.message}`);
    }
  }

  /**
   * Get PID file path
   */
  getPidFilePath(): string {
    return this.pidFilePath;
  }

  /**
   * Get config directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Save daemon PID
   */
  async savePid(pid: number): Promise<void> {
    await this.ensureConfigDir();
    await fs.writeFile(this.pidFilePath, pid.toString(), 'utf-8');
  }

  /**
   * Get daemon PID
   */
  async getPid(): Promise<number | null> {
    try {
      const data = await fs.readFile(this.pidFilePath, 'utf-8');
      return parseInt(data.trim(), 10);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Remove PID file
   */
  async removePid(): Promise<void> {
    try {
      await fs.unlink(this.pidFilePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if daemon is running
   */
  async isDaemonRunning(): Promise<boolean> {
    const pid = await this.getPid();
    if (!pid) return false;

    try {
      // Check if process exists (signal 0 doesn't kill, just checks)
      process.kill(pid, 0);
      return true;
    } catch (error: any) {
      // Process doesn't exist
      await this.removePid();
      return false;
    }
  }

  /**
   * Parse keyboard shortcut string to key combination
   */
  parseShortcut(shortcut: string): { ctrl: boolean; alt: boolean; shift: boolean; key: string } {
    const parts = shortcut.toLowerCase().split('+').map(p => p.trim());
    return {
      ctrl: parts.includes('ctrl') || parts.includes('control'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      key: parts.find(p => !['ctrl', 'control', 'alt', 'shift'].includes(p)) || '',
    };
  }
}

export const daemonConfigManager = new DaemonConfigManager();
