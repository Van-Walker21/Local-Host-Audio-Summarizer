import { 
  ActionFunctionArgs, 
  json 
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { handleAudioTranscription } from '~/services/audio-processor';
import logger from '~/utils/logger';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audioFile');

    if (!audioFile || !(audioFile instanceof File) || audioFile.size === 0) {
      return json({ 
        error: 'No file uploaded', 
        status: 'error' 
      }, { status: 400 });
    }

    const result = await handleAudioTranscription(audioFile);

    return json(result);
  } catch (error) {
    logger.error('Transcription route error', { 
      errorMessage: error.message 
    });

    return json({ 
      error: 'Transcription failed', 
      status: 'error' 
    }, { status: 500 });
  }
}

export default function TranscribePage() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Transcription</h1>
      
      <Form method="post" encType="multipart/form-data" className="space-y-4">
        <input 
          type="file" 
          name="audioFile" 
          accept="audio/*" 
          required 
          className="block w-full text-sm text-gray-500 
            file:mr-4 file:py-2 file:px-4 
            file:rounded-full file:border-0 
            file:text-sm file:font-semibold 
            file:bg-blue-50 file:text-blue-700 
            hover:file:bg-blue-100"
        />
        
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Transcribe
        </button>
      </Form>

      {actionData?.error && (
        <div className="text-red-500 mt-4">
          {actionData.error}
        </div>
      )}

      {actionData?.transcription && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Transcription</h2>
          <p className="bg-gray-100 p-3 rounded mt-2">
            {actionData.transcription}
          </p>
        </div>
      )}

      {actionData?.summary && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Summary</h2>
          <p className="bg-gray-100 p-3 rounded mt-2">
            {actionData.summary}
          </p>
        </div>
      )}
    </div>
  );
}
