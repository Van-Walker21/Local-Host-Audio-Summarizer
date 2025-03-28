// Simplified ML Service for MVP
const MOCK_TRANSCRIPTION = 'This is a mock transcription of the audio file.';
const MOCK_SUMMARY = 'A brief summary of the transcribed text.';

export async function transcribeAudio(audioPath: string): Promise<string> {
  // Simulated transcription with minimal processing
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_TRANSCRIPTION);
    }, 1000);
  });
}

export async function summarizeText(text: string): Promise<string> {
  // Simulated summarization
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_SUMMARY);
    }, 500);
  });
}
