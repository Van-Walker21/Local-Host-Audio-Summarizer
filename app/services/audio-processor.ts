import fs from 'fs/promises';
import path from 'path';
import logger from '~/utils/logger';
import { transcribeAudio, summarizeText } from './ml-service';

export async function processAudioFile(audioFile: File) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(uploadsDir, `${Date.now()}_${sanitizedFileName}`);
    
    logger.info('Processing audio file', { 
      originalFileName: audioFile.name, 
      processedFileName: path.basename(filePath) 
    });

    await fs.writeFile(filePath, Buffer.from(await audioFile.arrayBuffer()));
    return filePath;
  } catch (error) {
    logger.error('Failed to process audio file', { error: error.message });
    throw new Error('File processing failed');
  }
}

export async function cleanupTempFiles(files: string[]) {
  for (const file of files) {
    try {
      await fs.unlink(file);
      logger.info('Temporary file deleted', { filePath: file });
    } catch (error) {
      logger.warn('Failed to delete temporary file', { 
        filePath: file, 
        error: error.message 
      });
    }
  }
}

export async function handleAudioTranscription(audioFile: File) {
  const tempFiles: string[] = [];

  try {
    // Process and save the audio file
    const originalPath = await processAudioFile(audioFile);
    tempFiles.push(originalPath);

    // Transcribe audio
    const transcription = await transcribeAudio(originalPath);

    // Generate summary
    const summary = await summarizeText(transcription);

    // Clean up temporary files
    await cleanupTempFiles(tempFiles);

    return { 
      transcription, 
      summary,
      processingTime: Date.now() 
    };
  } catch (error) {
    // Clean up any temporary files that might have been created
    await cleanupTempFiles(tempFiles);

    logger.error('Audio processing failed', { 
      errorMessage: error.message 
    });

    throw error;
  }
}
