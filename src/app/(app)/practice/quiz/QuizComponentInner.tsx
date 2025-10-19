'use client';

import { useEffect, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

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
  questionType 
}: { 
  topic: string; 
  limit: number; 
  clientType: string; 
  questionType: string; 
}) {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Preparing AI engine...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // ✅ Just the model ID
  const MODEL_ID = 'gemma-3-1b-it';

  const initEngine = async () => {
    try {
      setLoadingMessage('Initializing Gemma 3 1B model...');

      const engineInstance = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (progress) => {
          setDownloadProgress(progress.progress);
          
          if (progress.text) {
            setLoadingMessage(progress.text);
          } else {
            setLoadingMessage(
              `Loading model... ${Math.floor(progress.progress * 100)}%`
            );
          }
        },
      });

      setEngine(engineInstance);
      setLoadingMessage('Model ready! Generating questions...');

      const generated = await generateQuestions(engineInstance);
      setQuestions(generated);
      setLoadingMessage('');
    } catch (err) {
      console.error('Engine initialization failed:', err);
      setLoadingMessage(`❌ Failed to load model: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      setQuestions(
        Array.from({ length: limit }, (_, i) => ({
          id: i + 1,
          question: `Sample ${questionType} question ${i + 1} about ${topic}?`,
          options: questionType === 'multiple-choice' 
            ? ['Option A', 'Option B', 'Option C', 'Option D'] 
            : undefined,
          answer: 'Option A',
        }))
      );
    }
  };

  useEffect(() => {
    initEngine();
    
    return () => {
      if (engine) {
        engine.unload();
      }
    };
  }, []);

  const generateQuestions = async (engineInstance: webllm.MLCEngine): Promise<Question[]> => {
    const formatInstructions = questionType === 'multiple-choice'
      ? 'Each question must have 4 options and specify which option is correct.'
      : 'Each question should have a short text answer.';

    const prompt = `Generate exactly ${limit} ${questionType} quiz questions about "${topic}". 
${formatInstructions}

Format your response as a valid JSON array with this exact structure:
[
  {
    "id": 1,
    "question": "Question text here?",
    ${questionType === 'multiple-choice' ? '"options": ["Option A", "Option B", "Option C", "Option D"],' : ''}
    "answer": "${questionType === 'multiple-choice' ? 'Option A' : 'Short answer text'}"
  }
]

Important: Return ONLY the JSON array, no other text or explanation.`;

    try {
      const reply = await engineInstance.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: 'You are a quiz generator. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = reply?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Empty response from model');

      let jsonString = content;
      
      const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonString = arrayMatch[0];
        }
      }

      const parsed = JSON.parse(jsonString) as Question[];
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid question format');
      }

      const validated = parsed.filter(q => 
        q.question && q.answer && 
        (questionType !== 'multiple-choice' || (q.options && q.options.length > 0))
      );

      return validated.slice(0, limit);
    } catch (err) {
      console.warn('Failed to parse AI response:', err);
      
      return Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        question: `Sample question ${i + 1} about ${topic}?`,
        options: questionType === 'multiple-choice' 
          ? ['Option A', 'Option B', 'Option C', 'Option D'] 
          : undefined,
        answer: questionType === 'multiple-choice' ? 'Option A' : 'Sample answer',
      }));
    }
  };

  if (!engine || questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-lg font-medium p-4">
        <p className="text-center">{loadingMessage}</p>
        <div className="w-64 h-4 mt-3 bg-gray-300 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${Math.floor(downloadProgress * 100)}%` }} 
          />
        </div>
        {downloadProgress > 0 && (
          <p className="text-sm mt-1 text-gray-600">
            {Math.floor(downloadProgress * 100)}%
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Quiz: {topic}</h2>
      <p className="mb-4">Loaded {questions.length} questions</p>
      {/* Add your quiz UI here */}
    </div>
  );
}
