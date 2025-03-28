import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import logger from '~/utils/logger';

interface ModelCacheEntry {
  path: string;
  lastUsed: number;
  size: number;
  version: string;
}

export class ModelCacheManager {
  private static instance: ModelCacheManager;
  private cacheDir: string;
  private maxCacheSize: number; // 10GB
  private maxModelAge: number; // 30 days

  private cacheIndex: Map<string, ModelCacheEntry>;

  private constructor() {
    this.cacheDir = path.join(process.cwd(), 'model-cache');
    this.maxCacheSize = 10 * 1024 * 1024 * 1024; // 10GB
    this.maxModelAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.cacheIndex = new Map();
  }

  public static getInstance(): ModelCacheManager {
    if (!ModelCacheManager.instance) {
      ModelCacheManager.instance = new ModelCacheManager();
    }
    return ModelCacheManager.instance;
  }

  async initializeCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadCacheIndex();
    } catch (error) {
      logger.error('Failed to initialize model cache', { 
        error: error.message,
        path: this.cacheDir 
      });
      throw new Error('Model cache initialization failed');
    }
  }

  private async loadCacheIndex(): Promise<void> {
    const indexPath = path.join(this.cacheDir, 'cache-index.json');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      this.cacheIndex = new Map(JSON.parse(indexContent));
    } catch {
      // If index doesn't exist, create an empty one
      this.cacheIndex = new Map();
    }
  }

  private async saveCacheIndex(): Promise<void> {
    const indexPath = path.join(this.cacheDir, 'cache-index.json');
    try {
      await fs.writeFile(
        indexPath, 
        JSON.stringify(Array.from(this.cacheIndex.entries())), 
        'utf-8'
      );
    } catch (error) {
      logger.error('Failed to save cache index', { 
        error: error.message 
      });
    }
  }

  async cacheModel(modelName: string, modelPath: string, version: string): Promise<string> {
    try {
      // Generate a unique cache filename
      const stats = await fs.stat(modelPath);
      const hash = crypto.createHash('sha256')
        .update(`${modelName}-${version}`)
        .digest('hex');
      
      const cachedModelPath = path.join(
        this.cacheDir, 
        `${hash}-${path.basename(modelPath)}`
      );

      // Copy model to cache
      await fs.copyFile(modelPath, cachedModelPath);

      // Create cache entry
      const cacheEntry: ModelCacheEntry = {
        path: cachedModelPath,
        lastUsed: Date.now(),
        size: stats.size,
        version
      };

      // Update cache index
      this.cacheIndex.set(modelName, cacheEntry);
      await this.saveCacheIndex();

      // Manage cache size
      await this.manageCacheSize();

      return cachedModelPath;
    } catch (error) {
      logger.error('Model caching failed', { 
        modelName, 
        error: error.message 
      });
      throw new Error('Model caching failed');
    }
  }

  async getModelFromCache(modelName: string): Promise<string | null> {
    const cacheEntry = this.cacheIndex.get(modelName);
    
    if (!cacheEntry) return null;

    // Check if model exists and is not too old
    try {
      const stats = await fs.stat(cacheEntry.path);
      const isRecent = (Date.now() - cacheEntry.lastUsed) < this.maxModelAge;

      if (stats.isFile() && isRecent) {
        // Update last used timestamp
        cacheEntry.lastUsed = Date.now();
        await this.saveCacheIndex();
        return cacheEntry.path;
      }
    } catch {
      // Remove invalid cache entry
      this.cacheIndex.delete(modelName);
      await this.saveCacheIndex();
    }

    return null;
  }

  private async manageCacheSize(): Promise<void> {
    // Sort cache entries by last used (oldest first)
    const sortedEntries = Array.from(this.cacheIndex.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    let currentCacheSize = sortedEntries.reduce(
      (total, entry) => total + entry[1].size, 
      0
    );

    // Remove old entries if cache exceeds max size
    while (currentCacheSize > this.maxCacheSize && sortedEntries.length > 0) {
      const [modelName, oldestEntry] = sortedEntries.shift()!;
      
      try {
        await fs.unlink(oldestEntry.path);
        this.cacheIndex.delete(modelName);
        currentCacheSize -= oldestEntry.size;
      } catch (error) {
        logger.warn('Failed to remove old cache entry', { 
          modelPath: oldestEntry.path,
          error: error.message 
        });
      }
    }

    await this.saveCacheIndex();
  }

  async clearCache(): Promise<void> {
    try {
      // Remove all cached model files
      for (const entry of this.cacheIndex.values()) {
        try {
          await fs.unlink(entry.path);
        } catch {}
      }

      // Clear the index
      this.cacheIndex.clear();
      await this.saveCacheIndex();

      logger.info('Model cache cleared completely');
    } catch (error) {
      logger.error('Failed to clear model cache', { 
        error: error.message 
      });
    }
  }
}

export const modelCacheManager = ModelCacheManager.getInstance();
