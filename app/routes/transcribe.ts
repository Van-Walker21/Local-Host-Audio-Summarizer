import { 
  processAudioFile, 
  convertAudioToWav, 
  transcribeAudio, 
  summarizeText, 
  validateAudioFile,
  cleanupTempFiles
} from '~/services/audio-processor';
import { mlModelManager } from '~/services/ml-models';
import logger from '~/utils/logger';
import { 
  ApplicationError, 
  ModelError, 
  AudioProcessingError 
} from '~/utils/error-handler';

export async function loader() {
  try {
    // Preload models during initial load
    await mlModelManager.downloadModels();
    return { 
      modelStatus: 'ready',
      availableModels: [
        { type: 'transcription', name: 'Whisper Small' },
        { type: 'summarization', name: 'DistilBART' }
      ]
    };
  } catch (error) {
    logger.error('Model preloading failed', { errorMessage: error.message });
    
    // Wrap error in ApplicationError for consistent error handling
    throw new ModelError('Failed to load ML models', {
      originalError: error.message
    });
  }
}

export async function action({ request }) {
  const tempFiles: string[] = [];

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audioFile');

    if (!audioFile || audioFile.size === 0) {
      throw new AudioProcessingError('No file uploaded');
    }

    // Process and save the audio file
    const originalPath = await processAudioFile(audioFile);
    tempFiles.push(originalPath);

    // Validate audio file
    const isValidFile = await validateAudioFile(originalPath);
    if (!isValidFile) {
      throw new AudioProcessingError('Invalid audio file');
    }

    // Convert to WAV format
    const wavPath = await convertAudioToWav(originalPath);
    tempFiles.push(wavPath);

    // Transcribe audio
    const transcription = await transcribeAudio(wavPath);

    // Generate summary
    const summary = await summarizeText(transcription);

    // Clean up temporary files
    await cleanupTempFiles(tempFiles);

    logger.info('Transcription and summarization completed successfully');

    return { 
      transcription, 
      summary,
      processingTime: Date.now() 
    };

  } catch (error) {
    // Clean up any temporary files that might have been created
    await cleanupTempFiles(tempFiles);

    // Log the full error for debugging
    logger.error('Transcription process failed', { 
      errorMessage: error.message,
      errorStack: error.stack 
    });

    // Wrap and rethrow errors with appropriate status codes
    if (error instanceof AudioProcessingError || error instanceof ModelError) {
      throw error;
    }

    // Catch-all for unexpected errors
    throw new ApplicationError('Internal server error', 500, {
      originalError: error.message
    });
  }
}
