import { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Audio Transcription" }];
};

export default function Index() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-primary-600 mb-6">
        Audio Transcription MVP
      </h1>
      <p className="text-gray-700">
        Welcome to your local AI-powered audio transcription application.
      </p>
    </div>
  );
}
