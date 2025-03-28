import { 
  modelConfigManager 
} from '~/config/ml-config';
import { 
  mlModelManager 
} from '~/services/ml-models';
import logger from '~/utils/logger';
import { 
  ApplicationError, 
  ModelError 
} from '~/utils/error-handler';

export async function loader() {
  try {
    const modelConfigs = await modelConfigManager.getModelConfigs();
    
    return {
      models: modelConfigs.map(config => ({
        name: config.name,
        type: config.type,
        version: config.version,
        status: config.localPath ? 'downloaded' : 'not-downloaded'
      })),
      systemInfo: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };
  } catch (error) {
    logger.error('Failed to retrieve model configurations', { 
      errorMessage: error.message 
    });
    throw new ApplicationError('Failed to load system information');
  }
}

export async function action({ request }) {
  const action = await request.json();

  try {
    switch (action.type) {
      case 'download-models':
        await mlModelManager.downloadModels();
        return { 
          status: 'success', 
          message: 'Models downloaded successfully' 
        };

      case 'clear-model-cache':
        await mlModelManager.clearModelCache();
        return { 
          status: 'success', 
          message: 'Model cache cleared successfully' 
        };

      case 'check-model-availability':
        const modelType = action.modelType;
        const modelConfig = await modelConfigManager.ensureModelAvailable(modelType);
        
        return { 
          status: modelConfig ? 'available' : 'unavailable',
          modelName: modelConfig?.name 
        };

      default:
        throw new ApplicationError('Invalid admin action');
    }
  } catch (error) {
    logger.error('Admin action failed', { 
      actionType: action.type,
      errorMessage: error.message 
    });

    if (error instanceof ModelError) {
      throw error;
    }

    throw new ApplicationError('Admin action failed', 500, {
      originalError: error.message
    });
  }
}
