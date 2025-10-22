'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey, getModel } from '@/lib/aistudio';

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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSettingsAndGenerateQuestions = async () => {
      setLoadingMessage('Retrieving settings...');
      const key = getApiKey();
      const model = getModel();

      if (!key || !model) {
        router.push('/practice/connect');
        return;
      }
      
      setApiKey(key);
      setModelId(model);
      setLoadingMessage('Generating quiz questions...');
      const generated = await generateQuestions(key, model);
      setQuestions(generated);
      setLoading(false);
      setLoadingMessage('');
    };

    fetchSettingsAndGenerateQuestions();
  }, []);

  const generateQuestions = async (apiKey: string, modelId: string): Promise<Question[]> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

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
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

      let jsonString = text;

      const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
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
      setLoadingMessage('Failed to generate questions. Please try again later.');
      return [];
    }
  };

  if (loading || questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-lg font-medium p-4">
        <p className="text-center max-w-md">{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Quiz: {topic}</h2>
      
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
