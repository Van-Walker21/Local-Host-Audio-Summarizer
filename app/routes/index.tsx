import { useState } from 'react';
import { Form, useNavigation, useActionData } from '@remix-run/react';
import logger from '~/utils/logger';

export default function AudioTranscriptionPage() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const isSubmitting = navigation.state === 'submitting';

  // Update state when action data changes
  if (actionData && 'transcription' in actionData) {
    setTranscription(actionData.transcription);
    setSummary(actionData.summary);
    logger.info('Transcription results received', { 
      transcriptionLength: actionData.transcription.length 
    });
  }

  if (actionData && 'error' in actionData) {
    setError(actionData.error);
    logger.warn('Transcription error', { errorMessage: actionData.error });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic client-side validation
      const allowedTypes = ['audio/wav', 'audio/aac', 'audio/mp3'];
      const maxSize = 100 * 1024 * 1024; // 100MB

      if (!allowedTypes.includes(file.type)) {
        setError('Unsupported audio file type');
        e.target.value = ''; // Clear the input
        return;
      }

      if (file.size > maxSize) {
        setError('File is too large. Maximum size is 100MB');
        e.target.value = ''; // Clear the input
        return;
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Local Audio Transcription & Summarization</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          {error}
        </div>
      )}
      
      <Form 
        method="post" 
        encType="multipart/form-data" 
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
      >
        <div className="mb-4">
          <label 
            className="block text-gray-700 text-sm font-bold mb-2" 
            htmlFor="audioFile"
          >
            Upload Audio File (.wav, .aac, .mp3)
          </label>
          <input 
            type="file" 
            name="audioFile" 
            accept=".wav,.aac,.mp3" 
            required 
            onChange={handleFileChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {isSubmitting ? 'Processing...' : 'Transcribe & Summarize'}
        </button>
      </Form>

      {transcription && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Transcription</h2>
          <div className="bg-gray-100 p-4 rounded-md">
            <p>{transcription}</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Summary</h2>
          <div className="bg-gray-100 p-4 rounded-md">
            <p>{summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export async function action({ request }) {
  // Placeholder for type consistency
  return null;
}
