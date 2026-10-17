import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface TaskFlowConfig {
  supabase_url?: string;
  supabase_key?: string;
  default_priority?: 'none' | 'low' | 'medium' | 'high';
  list_limit?: number;
  [key: string]: any;
}

/**
 * Manages TaskFlow configuration stored in ~/.config/taskflow/config.json
 */
export class ConfigManager {
  private configDir: string;
  private configPath: string;

  constructor() {
    // Use XDG Base Directory specification
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    this.configDir = path.join(configHome, 'taskflow');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  /**
   * Ensure the config directory exists
   */
  async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create config directory: ${error.message}`);
    }
  }

  /**
   * Get the full configuration object
   */
  async getConfig(): Promise<TaskFlowConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      // If file doesn't exist, return empty config
      if (error.code === 'ENOENT') {
        return {};
      }
      throw new Error(`Failed to read config: ${error.message}`);
    }
  }

  /**
   * Set a configuration value
   */
  async setConfig(key: string, value: any): Promise<void> {
    await this.ensureConfigDir();
    const config = await this.getConfig();
    config[key] = value;

    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write config: ${error.message}`);
    }
  }

  /**
   * Get a single configuration value
   */
  async get(key: string): Promise<any> {
    const config = await this.getConfig();
    return config[key];
  }

  /**
   * Delete a configuration value
   */
  async delete(key: string): Promise<void> {
    await this.ensureConfigDir();
    const config = await this.getConfig();
    delete config[key];

    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write config: ${error.message}`);
    }
  }

  /**
   * Clear all configuration
   */
  async clear(): Promise<void> {
    try {
      await fs.unlink(this.configPath);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to clear config: ${error.message}`);
      }
    }
  }

  /**
   * Get the config file path (useful for debugging)
   */
  getConfigPath(): string {
    return this.configPath;
  }
}
