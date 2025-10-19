'use client';

import { useEffect, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

interface Question {
  id: number;
  question: string;
  options?: string[];
  answer: string;
}

export default function QuizComponentInner({ topic, limit, clientType, questionType }: { topic: string; limit: number; clientType: string; questionType: string; }) {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Preparing AI engine...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const modelUrl = 'https://huggingface.co/mlc-ai/gemma-3-1b-it-q4bf16_0-MLC/resolve/main/gemma-3-1b-it-q4bf16_0.gguf';

  // ✅ Fetch model manually with progress
  const downloadModel = async () => {
    setLoadingMessage('Downloading Gemma 3 1B IT model...');
    const response = await fetch(modelUrl);
    if (!response.body) throw new Error('ReadableStream not supported');

    const contentLength = +response.headers.get('Content-Length')!;
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
        setDownloadProgress(receivedLength / contentLength);
        setLoadingMessage(`Downloading model... ${Math.floor((receivedLength / contentLength) * 100)}%`);
      }
    }

    // Combine chunks
    const blob = new Blob(chunks);
    return blob;
  };

  const initEngine = async () => {
    try {
      const modelBlob = await downloadModel(); // Fetch first
      setLoadingMessage('Initializing engine...');

      // You can either pass blob directly or convert to object URL
      const objectUrl = URL.createObjectURL(modelBlob);

      const engineInstance = await webllm.CreateMLCEngine(objectUrl, {
        initProgressCallback: (progress) => {
          setLoadingMessage(`Initializing AI engine... ${Math.floor(progress.progress * 100)}%`);
        },
      });

      setEngine(engineInstance);
      setLoadingMessage('Model ready! Generating questions...');
      setDownloadProgress(1);

      const generated = await generateQuestions(engineInstance);
      setQuestions(generated);
    } catch (err) {
      console.error('Engine initialization failed:', err);
      setLoadingMessage('❌ Failed to initialize AI engine. Using fallback questions.');
      setQuestions([
        { id: 1, question: 'What is AI?', options: ['A', 'B', 'C'], answer: 'A' },
      ]);
    }
  };

  useEffect(() => {
    initEngine();
  }, []);

  const generateQuestions = async (engineInstance: webllm.MLCEngine) => {
    const prompt = `Create ${limit} ${questionType} quiz questions about ${topic}. Format as JSON array: [{ id, question, options, answer }]. Keep short and clear.`;

    try {
      const reply = await engineInstance.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful quiz generator AI.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      const content = reply?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Empty response from model');
      return JSON.parse(content) as Question[];
    } catch (err) {
      console.warn('Failed to parse AI JSON, returning fallback.', err);
      return [
        { id: 1, question: 'What is AI?', options: ['A', 'B', 'C'], answer: 'A' },
      ];
    }
  };

  if (!engine || questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-lg font-medium">
        <p>{loadingMessage}</p>
        <div className="w-64 h-4 mt-3 bg-gray-300 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.floor(downloadProgress * 100)}%` }} />
        </div>
        {downloadProgress > 0 && downloadProgress < 1 && <p className="text-sm mt-1">{Math.floor(downloadProgress * 100)}%</p>}
      </div>
    );
  }

  return <div>…Your quiz rendering here (same as before)…</div>;
}
