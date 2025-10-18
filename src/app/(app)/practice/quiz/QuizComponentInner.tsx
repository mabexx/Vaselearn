'use client';

import { useEffect, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

// Type for each quiz question
interface Question {
  id: number;
  question: string;
  options?: string[];
  answer: string;
}

export default function QuizComponentInner({
  topic,
  limit,
  clientType,
  questionType,
}: {
  topic: string;
  limit: number;
  clientType: string;
  questionType: string;
}) {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Preparing model...');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // 🔗 Use a hosted model (can be Hugging Face, S3, or your own endpoint)
  const modelUrl =
    'https://huggingface.co/mlc-ai/web-llm-models/resolve/main/Llama-3-8B-Instruct-q4f16_1-MLC/';

  // 🚀 Initialize model
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingMessage('Checking cache / downloading AI engine...');
        const engineInstance = await webllm.CreateMLCEngine(modelUrl, {
          initProgressCallback: (progress) => {
            setLoadingMessage(
              `Loading model... ${Math.floor(progress.progress * 100)}%`
            );
          },
        });
        setEngine(engineInstance);
        setLoadingMessage('AI Engine ready!');

        // Load initial quiz questions
        const generated = await generateQuestions(engineInstance);
        setQuestions(generated);
      } catch (err) {
        console.error('Engine initialization failed:', err);
        setLoadingMessage('Failed to initialize AI engine.');
      }
    };

    init();
  }, []);

  // 🧠 Generate questions dynamically using LLM
const generateQuestions = async (engineInstance: webllm.MLCEngine) => {
  setLoadingMessage('Generating quiz questions...');
  const prompt = `
  Create ${limit} ${questionType} quiz questions about ${topic}.
  Format each question as JSON with fields: id, question, options (if any), and answer.
  Keep it concise and factual.
  `;

  const reply = await engineInstance.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a helpful quiz generator AI.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  try {
    const content = reply?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response from model');
    const json = JSON.parse(content);
    return json as Question[];
  } catch (err) {
    console.warn('Failed to parse AI JSON, returning fallback questions.', err);
    return [
      { id: 1, question: 'What is AI?', options: ['A', 'B', 'C'], answer: 'A' },
    ];
  }
};

  // 🎯 Handle answer submission
  const handleSubmit = () => {
    const current = questions[currentQuestion];
    if (!current) return;

    if (userAnswer.trim().toLowerCase() === current.answer.toLowerCase()) {
      setScore((prev) => prev + 1);
    }

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion((prev) => prev + 1);
      setUserAnswer('');
    } else {
      setIsComplete(true);
    }
  };

  // 💬 Optional: Ask AI to explain a question
  const handleAskAI = async () => {
    if (!engine || !questions[currentQuestion]) return;
    const q = questions[currentQuestion].question;
    setLoadingMessage('AI is explaining...');
    const reply = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a tutor explaining quiz answers.' },
        { role: 'user', content: `Explain the correct answer to: ${q}` },
      ],
      temperature: 0.6,
    });
    setAiResponse(reply.choices?.[0]?.message?.content ?? '');
    setLoadingMessage('');
  };

  // 🕓 Loading screen
  if (!engine || questions.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen text-lg font-medium">
        {loadingMessage}
      </div>
    );
  }

  // 🎉 Quiz complete
  if (isComplete) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Quiz Complete 🎯</h1>
        <p className="text-lg mb-2">Your Score: {score} / {questions.length}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 mt-4 bg-blue-600 text-white rounded-xl"
        >
          Restart
        </button>
      </div>
    );
  }

  // 🧩 Active question view
  const current = questions[currentQuestion];
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">Quiz: {topic}</h1>
      <p className="text-sm text-gray-600">
        Question {currentQuestion + 1} of {questions.length}
      </p>

      <div className="bg-gray-100 p-4 rounded-xl shadow">
        <p className="text-lg font-medium mb-2">{current.question}</p>
        {current.options?.map((opt) => (
          <button
            key={opt}
            onClick={() => setUserAnswer(opt)}
            className={`block w-full text-left px-4 py-2 my-1 rounded-lg border ${
              userAnswer === opt ? 'bg-blue-200 border-blue-500' : 'bg-white'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          {currentQuestion + 1 === questions.length ? 'Finish' : 'Next'}
        </button>

        <button
          onClick={handleAskAI}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Ask AI
        </button>
      </div>

      {aiResponse && (
        <div className="bg-purple-100 p-3 rounded-lg">
          <p className="font-medium text-purple-800">💡 {aiResponse}</p>
        </div>
      )}
    </div>
  );
}
