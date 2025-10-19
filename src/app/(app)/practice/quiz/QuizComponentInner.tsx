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

  const MODEL_ID = 'gemma-3-1b-it';

  // Custom app config with Gemma model
  const customAppConfig: webllm.AppConfig = {
    model_list: [
      {
        model_id: MODEL_ID,
        model: 'https://huggingface.co/mlc-ai/gemma-3-1b-it-q4bf16_0-MLC',
        model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/gemma-3-1b-it/gemma-3-1b-it-q4bf16_0-ctx4k_cs1k-webgpu.wasm',
        vram_required_MB: 2048,
        low_resource_required: false,
        overrides: {
          context_window_size: 4096,
        }
      }
    ]
  };

  const initEngine = async () => {
    try {
      setLoadingMessage('Initializing Gemma 3 1B model with custom config...');

      const engineInstance = await webllm.CreateMLCEngine(MODEL_ID, {
        appConfig: customAppConfig,
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
      
      // Fallback questions
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
      
      // Remove markdown code blocks
      const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        // Try to find JSON array in the text
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonString = arrayMatch[0];
        }
      }

      const parsed = JSON.parse(jsonString) as Question[];
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid question format');
      }

      // Validate each question
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

  // Loading state
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

  // Quiz rendering
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Quiz: {topic}</h2>
      <p className="mb-4">Loaded {questions.length} questions</p>
      
      {!isComplete ? (
        <div className="space-y-4">
          <div className="mb-2 text-sm text-gray-600">
            Question {currentQuestion + 1} of {questions.length}
          </div>
          
          <h3 className="text-xl font-semibold mb-4">
            {questions[currentQuestion]?.question}
          </h3>

          {questionType === 'multiple-choice' && questions[currentQuestion]?.options ? (
            <div className="space-y-2">
              {questions[currentQuestion].options!.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserAnswer(option)}
                  className={`w-full p-3 text-left border rounded-lg transition-colors ${
                    userAnswer === option 
                      ? 'bg-blue-100 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full p-3 border rounded-lg"
            />
          )}

          <button
            onClick={() => {
              if (userAnswer === questions[currentQuestion].answer) {
                setScore(score + 1);
              }
              
              if (currentQuestion < questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setUserAnswer('');
              } else {
                setIsComplete(true);
              }
            }}
            disabled={!userAnswer}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Quiz Complete!</h3>
          <p className="text-xl">
            Your score: {score} / {questions.length}
          </p>
          <p className="text-lg">
            {Math.round((score / questions.length) * 100)}%
          </p>
          <button
            onClick={() => {
              setCurrentQuestion(0);
              setUserAnswer('');
              setScore(0);
              setIsComplete(false);
            }}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Restart Quiz
          </button>
        </div>
      )}
    </div>
  );
}
