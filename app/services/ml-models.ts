import path from 'path';
import logger from '~/utils/logger';
import { modelConfigManager, ModelConfig } from '~/config/ml-config';
import { ModelError } from '~/utils/error-handler';

// Abstract base class for ML models
abstract class BaseMLModel {
  protected modelConfig: ModelConfig | null = null;

  async initialize(modelType: 'transcription' | 'summarization'): Promise<void> {
    try {
      this.modelConfig = await modelConfigManager.ensureModelAvailable(modelType);
      
      if (!this.modelConfig) {
        throw new ModelError(`Failed to load ${modelType} model`);
      }

      logger.info('ML Model initialized', { 
        modelName: this.modelConfig.name,
        modelType 
      });
    } catch (error) {
      logger.error('Model initialization failed', { 
        errorMessage: error.message 
      });
      throw error;
    }
  }

  protected validateModelLoaded(): void {
    if (!this.modelConfig) {
      throw new ModelError('Model not initialized');
    }
  }
}

// Transcription Model Interface
interface TranscriptionModel {
  transcribe(audioPath: string): Promise<string>;
}

// Summarization Model Interface
interface SummarizationModel {
  summarize(text: string): Promise<string>;
}

// Whisper Transcription Model
class WhisperTranscriptionModel extends BaseMLModel implements TranscriptionModel {
  constructor() {
    super();
  }

  async transcribe(audioPath: string): Promise<string> {
    this.validateModelLoaded();

    try {
      logger.info('Starting Whisper transcription', { 
        audioPath, 
        modelPath: this.modelConfig!.localPath 
      });
      
      // TODO: Replace with actual Whisper.cpp binding
      const transcription = await this.mockTranscribe(audioPath);
      
      logger.info('Whisper transcription completed', { 
        transcriptionLength: transcription.length 
      });
      
      return transcription;
    } catch (error) {
      logger.error('Whisper transcription failed', { 
        errorMessage: error.message,
        audioPath 
      });
      throw new ModelError('Transcription failed', { 
        originalError: error.message 
      });
    }
  }

  private async mockTranscribe(audioPath: string): Promise<string> {
    // Simulated transcription 
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Transcribed text from audio file located at ${audioPath}. 
        Model used: ${this.modelConfig!.name}`);
      }, 2000);
    });
  }
}

// Local Summarization Model
class LocalSummarizationModel extends BaseMLModel implements SummarizationModel {
  constructor() {
    super();
  }

  async summarize(text: string): Promise<string> {
    this.validateModelLoaded();

    try {
      logger.info('Starting local summarization', { 
        inputLength: text.length, 
        modelPath: this.modelConfig!.localPath 
      });
      
      const summary = await this.mockSummarize(text);
      
      logger.info('Summarization completed', { 
        summaryLength: summary.length 
      });
      
      return summary;
    } catch (error) {
      logger.error('Summarization failed', { 
        errorMessage: error.message 
      });
      throw new ModelError('Summarization failed', { 
        originalError: error.message 
      });
    }
  }

  private async mockSummarize(text: string): Promise<string> {
    // Simulated summarization
    return new Promise((resolve) => {
      setTimeout(() => {
        const words = text.split(' ');
        const summary = words.slice(0, Math.min(20, words.length)).join(' ') + 
          ` (Summarized using ${this.modelConfig!.name})...`;
        resolve(summary);
      }, 1000);
    });
  }
}

// ML Model Manager
export class MLModelManager {
  private static instance: MLModelManager;
  
  private transcriptionModel: WhisperTranscriptionModel;
  private summarizationModel: LocalSummarizationModel;

  private constructor() {
    this.transcriptionModel = new WhisperTranscriptionModel();
    this.summarizationModel = new LocalSummarizationModel();
  }

  public static getInstance(): MLModelManager {
    if (!MLModelManager.instance) {
      MLModelManager.instance = new MLModelManager();
    }
    return MLModelManager.instance;
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    try {
      // Initialize transcription model if not already initialized
      await this.transcriptionModel.initialize('transcription');
      return this.transcriptionModel.transcribe(audioPath);
    } catch (error) {
      logger.error('Audio transcription failed', { 
        errorMessage: error.message,
        audioPath 
      });
      throw error;
    }
  }

  async summarizeText(text: string): Promise<string> {
    try {
      // Initialize summarization model if not already initialized
      await this.summarizationModel.initialize('summarization');
      return this.summarizationModel.summarize(text);
    } catch (error) {
      logger.error('Text summarization failed', { 
        errorMessage: error.message,
        inputLength: text.length 
      });
      throw error;
    }
  }

  async downloadModels(): Promise<void> {
    try {
      const configs = await modelConfigManager.getModelConfigs();
      
      for (const config of configs) {
        await modelConfigManager.ensureModelAvailable(config.type);
      }
      
      logger.info('All models downloaded and prepared');
    } catch (error) {
      logger.error('Model download process failed', { 
        errorMessage: error.message 
      });
      throw new ModelError('Failed to prepare ML models');
    }
  }

  // Expose method to clear model cache
  async clearModelCache(): Promise<void> {
    try {
      await modelCacheManager.clearCache();
      logger.info('Model cache cleared successfully');
    } catch (error) {
      logger.error('Failed to clear model cache', { 
        errorMessage: error.message 
      });
    }
  }
}

export const mlModelManager = MLModelManager.getInstance();
