import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import logger from '~/utils/logger';
import { modelCacheManager } from './model-cache';

export interface ModelConfig {
  name: string;
  type: 'transcription' | 'summarization';
  url: string;
  checksum: string;
  localPath: string;
  version: string;
  requiredDiskSpace: number; // in bytes
}

export class ModelConfigManager {
  private static instance: ModelConfigManager;
  private modelsDir: string;
  private modelConfigs: ModelConfig[];

  private constructor() {
    this.modelsDir = path.join(process.cwd(), 'models');
    this.modelConfigs = [];
  }

  public static getInstance(): ModelConfigManager {
    if (!ModelConfigManager.instance) {
      ModelConfigManager.instance = new ModelConfigManager();
    }
    return ModelConfigManager.instance;
  }

  async initializeModelDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
      await modelCacheManager.initializeCacheDirectory();
    } catch (error) {
      logger.error('Failed to create models directory', { 
        error: error.message,
        path: this.modelsDir 
      });
      throw new Error('Model directory initialization failed');
    }
  }

  private async checkDiskSpace(requiredSpace: number): Promise<boolean> {
    try {
      const { available } = await this.getDiskSpace();
      return available > requiredSpace;
    } catch {
      return false;
    }
  }

  private async getDiskSpace(): Promise<{ total: number, available: number }> {
    // Placeholder for disk space check
    // In a real implementation, use OS-specific disk space checking
    return {
      total: 1000 * 1024 * 1024 * 1024, // 1TB
      available: 500 * 1024 * 1024 * 1024 // 500GB
    };
  }

  async getModelConfigs(): Promise<ModelConfig[]> {
    if (this.modelConfigs.length > 0) {
      return this.modelConfigs;
    }

    await this.initializeModelDirectory();
    
    // Comprehensive model configurations
    this.modelConfigs = [
      {
        name: 'whisper-small',
        type: 'transcription',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
        checksum: '', // Add actual checksum
        localPath: path.join(this.modelsDir, 'whisper-small.bin'),
        version: '1.0.0',
        requiredDiskSpace: 500 * 1024 * 1024 // 500MB
      },
      {
        name: 'distilbart-summarization',
        type: 'summarization',
        url: 'https://huggingface.co/facebook/bart-large-cnn/resolve/main/pytorch_model.bin',
        checksum: '', // Add actual checksum
        localPath: path.join(this.modelsDir, 'summarization-model.bin'),
        version: '1.0.0',
        requiredDiskSpace: 1024 * 1024 * 1024 // 1GB
      }
    ];

    return this.modelConfigs;
  }

  async verifyModelChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      const calculatedChecksum = hashSum.digest('hex');

      return calculatedChecksum === expectedChecksum;
    } catch (error) {
      logger.error('Checksum verification failed', { 
        filePath, 
        error: error.message 
      });
      return false;
    }
  }

  async downloadModel(config: ModelConfig): Promise<string | null> {
    try {
      // Check available disk space
      const hasEnoughSpace = await this.checkDiskSpace(config.requiredDiskSpace);
      if (!hasEnoughSpace) {
        logger.error('Insufficient disk space for model download', { 
          modelName: config.name,
          requiredSpace: config.requiredDiskSpace 
        });
        return null;
      }

      // Check if model is already in cache
      const cachedModelPath = await modelCacheManager.getModelFromCache(config.name);
      if (cachedModelPath) {
        return cachedModelPath;
      }

      logger.info('Downloading model', { 
        modelName: config.name, 
        url: config.url 
      });

      // Secure download with timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5-minute timeout

      try {
        const response = await fetch(config.url, { 
          signal: controller.signal 
        });
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const modelData = await response.arrayBuffer();
        await fs.writeFile(config.localPath, Buffer.from(modelData));
        clearTimeout(timeoutId);

        // Cache the downloaded model
        return await modelCacheManager.cacheModel(
          config.name, 
          config.localPath, 
          config.version
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      logger.error('Model download failed', { 
        modelName: config.name, 
        error: error.message 
      });
      return null;
    }
  }

  async ensureModelAvailable(modelType: 'transcription' | 'summarization'): Promise<ModelConfig | null> {
    try {
      const configs = await this.getModelConfigs();
      const modelConfig = configs.find(config => config.type === modelType);

      if (!modelConfig) {
        logger.warn('No model configuration found', { type: modelType });
        return null;
      }

      // Check if model is in cache first
      const cachedModelPath = await modelCacheManager.getModelFromCache(modelConfig.name);
      if (cachedModelPath) {
        modelConfig.localPath = cachedModelPath;
        return modelConfig;
      }

      // Check if model file exists locally
      try {
        await fs.access(modelConfig.localPath);
        
        // Verify checksum if available
        if (modelConfig.checksum) {
          const checksumValid = await this.verifyModelChecksum(
            modelConfig.localPath, 
            modelConfig.checksum
          );
          
          if (!checksumValid) {
            logger.warn('Model checksum invalid, re-downloading', { 
              modelName: modelConfig.name 
            });
            return null;
          }
        }

        // Cache the existing model
        return await modelCacheManager.cacheModel(
          modelConfig.name, 
          modelConfig.localPath, 
          modelConfig.version
        ) ? modelConfig : null;
      } catch {
        // Model doesn't exist, attempt download
        const downloadedModelPath = await this.downloadModel(modelConfig);
        
        if (downloadedModelPath) {
          modelConfig.localPath = downloadedModelPath;
          return modelConfig;
        }
      }

      return null;
    } catch (error) {
      logger.error('Model availability check failed', { 
        type: modelType, 
        error: error.message 
      });
      return null;
    }
  }
}

export const modelConfigManager = ModelConfigManager.getInstance();
