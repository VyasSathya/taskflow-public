/**
 * Project Detection Utilities
 * Auto-detect project from git repo, directory, or package.json
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { basename, resolve } from 'path';

export interface ProjectInfo {
  name: string;
  source: 'git' | 'package.json' | 'directory' | 'manual';
  path: string;
  color?: string; // For UI
}

/**
 * Main project detection function
 * Tries multiple strategies in order of reliability
 */
export async function detectProject(cwd: string = process.cwd()): Promise<ProjectInfo> {
  // Strategy 1: Git remote URL (most reliable for developers)
  const gitProject = detectFromGit(cwd);
  if (gitProject) return gitProject;

  // Strategy 2: package.json name field
  const packageProject = detectFromPackageJson(cwd);
  if (packageProject) return packageProject;

  // Strategy 3: Directory name (fallback)
  return detectFromDirectory(cwd);
}

/**
 * Detect project from git remote URL
 * Examples:
 *   git@github.com:user/taskflow.git → "taskflow"
 *   https://github.com/user/paytrack-app.git → "paytrack-app"
 */
export function detectFromGit(cwd: string): ProjectInfo | null {
  try {
    // Get git remote URL
    const remoteUrl = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
    }).trim();

    if (!remoteUrl) return null;

    // Extract project name from URL
    // Handles both SSH and HTTPS formats
    let projectName: string | null = null;

    // Pattern 1: github.com:user/project.git or github.com/user/project.git
    const githubMatch = remoteUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (githubMatch) {
      projectName = githubMatch[2]; // Extract "project" part
    }

    if (!projectName) return null;

    return {
      name: projectName,
      source: 'git',
      path: cwd,
      color: generateProjectColor(projectName),
    };
  } catch (error) {
    // Not a git repo or no remote
    return null;
  }
}

/**
 * Detect project from package.json
 * Useful for monorepos or when git isn't available
 */
export function detectFromPackageJson(cwd: string): ProjectInfo | null {
  try {
    const packageJsonPath = resolve(cwd, 'package.json');
    if (!existsSync(packageJsonPath)) return null;

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.name) return null;

    // Handle scoped packages: @scope/package → "package"
    const name = packageJson.name.startsWith('@')
      ? packageJson.name.split('/')[1] || packageJson.name
      : packageJson.name;

    return {
      name,
      source: 'package.json',
      path: cwd,
      color: generateProjectColor(name),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Detect project from directory name (last resort)
 */
export function detectFromDirectory(cwd: string): ProjectInfo {
  const dirName = basename(cwd);

  return {
    name: dirName,
    source: 'directory',
    path: cwd,
    color: generateProjectColor(dirName),
  };
}

/**
 * Check if current directory is inside a monorepo workspace
 * Returns workspace root project if detected
 */
export function detectMonorepoWorkspace(cwd: string): ProjectInfo | null {
  try {
    // Check for common monorepo patterns

    // 1. Turborepo / pnpm workspace
    let current = cwd;
    while (current !== '/') {
      const pnpmWorkspace = resolve(current, 'pnpm-workspace.yaml');
      const turboJson = resolve(current, 'turbo.json');

      if (existsSync(pnpmWorkspace) || existsSync(turboJson)) {
        // Found workspace root - use its name
        const rootProject = detectFromGit(current) || detectFromPackageJson(current);
        if (rootProject) {
          return {
            ...rootProject,
            name: `${rootProject.name}`, // Mark as workspace root
            path: current,
          };
        }
      }

      // Go up one directory
      const parent = resolve(current, '..');
      if (parent === current) break; // Reached root
      current = parent;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Generate consistent color for project name
 * Same project always gets same color
 */
export function generateProjectColor(projectName: string): string {
  const colors = [
    '#8b5cf6', // Purple
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#84cc16', // Lime
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Store project mapping for current directory
 * Persists user's manual overrides
 */
export interface ProjectMapping {
  [path: string]: string; // path → project name
}

export class ProjectMappingStore {
  private mappings: ProjectMapping = {};
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.load();
  }

  /**
   * Get project for a given path
   * Returns stored mapping or auto-detects
   */
  async getProject(cwd: string): Promise<ProjectInfo> {
    // Check if manually overridden
    if (this.mappings[cwd]) {
      return {
        name: this.mappings[cwd],
        source: 'manual',
        path: cwd,
        color: generateProjectColor(this.mappings[cwd]),
      };
    }

    // Auto-detect
    return detectProject(cwd);
  }

  /**
   * Set manual project override for a path
   */
  setProject(cwd: string, projectName: string): void {
    this.mappings[cwd] = projectName;
    this.save();
  }

  /**
   * Remove manual override (revert to auto-detection)
   */
  removeProject(cwd: string): void {
    delete this.mappings[cwd];
    this.save();
  }

  /**
   * Get all known projects (unique names)
   */
  getAllProjects(): string[] {
    return [...new Set(Object.values(this.mappings))];
  }

  private load(): void {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf8');
        this.mappings = JSON.parse(data);
      }
    } catch (error) {
      // Ignore errors, start with empty mappings
    }
  }

  private save(): void {
    try {
      const data = JSON.stringify(this.mappings, null, 2);
      require('fs').writeFileSync(this.configPath, data, 'utf8');
    } catch (error) {
      console.error('Failed to save project mappings:', error);
    }
  }
}
