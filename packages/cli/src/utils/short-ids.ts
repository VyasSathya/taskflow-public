/**
 * Short ID Manager
 * Maps short numeric IDs (1-99) to full UUIDs for easy task reference
 * Persists mappings to a local file so they survive across CLI calls
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

interface ShortIdMapping {
  shortId: number;
  fullId: string;
  createdAt: string;
}

interface ShortIdStore {
  mappings: ShortIdMapping[];
  lastUpdated: string;
}

export class ShortIdManager {
  private storePath: string;
  private maxIds = 99;

  constructor() {
    // Store in ~/.vibetasks/short-ids.json
    this.storePath = join(homedir(), '.vibetasks', 'short-ids.json');
  }

  /**
   * Save mappings from a list of task IDs
   * Short IDs are assigned 1, 2, 3... based on array order
   */
  async saveMappings(taskIds: string[]): Promise<void> {
    const mappings: ShortIdMapping[] = taskIds
      .slice(0, this.maxIds)
      .map((fullId, index) => ({
        shortId: index + 1,
        fullId,
        createdAt: new Date().toISOString(),
      }));

    const store: ShortIdStore = {
      mappings,
      lastUpdated: new Date().toISOString(),
    };

    // Ensure directory exists
    const dir = join(homedir(), '.vibetasks');
    await mkdir(dir, { recursive: true });

    await writeFile(this.storePath, JSON.stringify(store, null, 2));
  }

  /**
   * Get the full UUID for a short ID
   */
  async getFullId(shortId: number): Promise<string | null> {
    try {
      const content = await readFile(this.storePath, 'utf-8');
      const store: ShortIdStore = JSON.parse(content);

      const mapping = store.mappings.find((m) => m.shortId === shortId);
      return mapping?.fullId || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the short ID for a full UUID (if it exists in current mappings)
   */
  async getShortId(fullId: string): Promise<number | null> {
    try {
      const content = await readFile(this.storePath, 'utf-8');
      const store: ShortIdStore = JSON.parse(content);

      const mapping = store.mappings.find((m) => m.fullId === fullId);
      return mapping?.shortId || null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve an ID that could be either short (1-99) or full UUID
   */
  async resolveId(idOrShortId: string): Promise<string> {
    // Check if it's a short numeric ID
    const shortId = parseInt(idOrShortId, 10);
    if (!isNaN(shortId) && shortId >= 1 && shortId <= this.maxIds) {
      const fullId = await this.getFullId(shortId);
      if (fullId) {
        return fullId;
      }
      // If no mapping found, throw error
      throw new Error(
        `Short ID #${shortId} not found. Run 'vibetasks list --short-ids' first to generate mappings.`
      );
    }

    // It's already a full ID (or partial UUID)
    return idOrShortId;
  }
}
