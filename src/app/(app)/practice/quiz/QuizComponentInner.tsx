'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSettings } from '@/lib/aistudio';
import QuestionMultipleChoice from '@/components/quiz/QuestionMultipleChoice';
import QuestionTrueFalse from '@/components/quiz/QuestionTrueFalse';
import QuestionCaseBased from '@/components/quiz/QuestionCaseBased';
import { QuizQuestion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function QuizComponentInner({ 
  topic, 
  limit, 
  clientType, 
  questionType,
  modelId
}: { 
  topic: string; 
  limit: number; 
  clientType: string; 
  questionType: string;
  modelId: string;
}) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | boolean | undefined)[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSettingsAndGenerateQuestions = async () => {
      setLoadingMessage('Retrieving settings...');
      const { apiKey: key } = getSettings();

      if (!key) {
        const params = new URLSearchParams({
            topic,
            limit: String(limit),
            clientType,
            questionType,
            model: modelId,
        });
        router.push(`/practice/connect?${params.toString()}`);
        return;
      }
      
      setApiKey(key);
      setLoadingMessage('Generating quiz questions...');
      try {
        const generated = await generateQuestions(key, modelId);
        if (generated.length > 0) {
            setQuestions(generated);
            setUserAnswers(new Array(generated.length).fill(undefined));
        } else {
            setLoadingMessage('No questions were generated. The topic might be too specific or the AI service could be unavailable. Please try a different topic.');
        }
      } catch (error) {
          console.error('Error generating questions:', error);
          setLoadingMessage(error instanceof Error ? error.message : 'An unknown error occurred during quiz generation.');
      } finally {
        setLoading(false);
        if (questions.length === 0) setLoadingMessage('');
      }
    };

    fetchSettingsAndGenerateQuestions();
  }, [modelId, topic, limit, clientType, questionType, router, questions.length]);

  const generateQuestions = async (apiKey: string, modelId: string): Promise<QuizQuestion[]> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    const prompt = `
      Generate exactly ${limit} quiz questions about the topic "${topic}".
      The target audience is learners associated with a "${clientType}".
      The quiz should contain questions of the type "${questionType}".

      Format your response as a valid JSON array of objects. Each object must have a "type" field ("multiple_choice", "true_false", or "case_based"), a "question" field, and an "answer" field.
      - "multiple_choice" must include an "options" array.
      - "case_based" must include a "prompt" field.

      Return ONLY the JSON array.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let jsonString = text.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }
      
      const parsed = JSON.parse(jsonString) as QuizQuestion[];
      return parsed.slice(0, limit);
    } catch (err) {
      console.error('Failed to generate or parse AI response:', err);
      throw new Error('Failed to generate questions. The AI service may be experiencing issues. Please try again later.');
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsComplete(true);
    }
  };

  const calculateScore = () => {
    return userAnswers.reduce((score, userAnswer, index) => {
        if (userAnswer !== undefined && String(userAnswer) === String(questions[index].answer)) {
            return score + 1;
        }
        return score;
    }, 0);
  };

  if (loading || questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-lg font-medium p-4 text-center">
        <p>{loadingMessage}</p>
        {!loading && (
            <Button onClick={() => router.push('/practice')} className="mt-4">
                Back to Practice
            </Button>
        )}
      </div>
    );
  }

  const score = calculateScore();

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {!isComplete ? (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Quiz: {topic}</CardTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                    Question {currentQuestion + 1} of {questions.length}
                </div>
            </CardHeader>
            <CardContent>
                {questions[currentQuestion]?.type === 'multiple_choice' && (
                <QuestionMultipleChoice
                    question={questions[currentQuestion]}
                    onAnswer={(answer) => {
                        const newAnswers = [...userAnswers];
                        newAnswers[currentQuestion] = answer;
                        setUserAnswers(newAnswers);
                    }}
                    userAnswer={userAnswers[currentQuestion] as string}
                />
                )}
                {questions[currentQuestion]?.type === 'true_false' && (
                <QuestionTrueFalse
                    question={questions[currentQuestion]}
                    onAnswer={(answer) => {
                        const newAnswers = [...userAnswers];
                        newAnswers[currentQuestion] = answer;
                        setUserAnswers(newAnswers);
                    }}
                    userAnswer={userAnswers[currentQuestion] as boolean}
                />
                )}
                {questions[currentQuestion]?.type === 'case_based' && (
                <QuestionCaseBased
                    question={questions[currentQuestion]}
                    onAnswer={(answer) => {
                        const newAnswers = [...userAnswers];
                        newAnswers[currentQuestion] = answer;
                        setUserAnswers(newAnswers);
                    }}
                    userAnswer={userAnswers[currentQuestion] as string}
                />
                )}
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handleNext}
                    disabled={userAnswers[currentQuestion] === undefined}
                    className="w-full sm:w-auto"
                >
                    {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
            </CardFooter>
        </Card>
      ) : (
        <div>
          {showSummary ? (
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                {questions.map((q, index) => {
                    const isCorrect = String(userAnswers[index]) === String(q.answer);
                    return (
                        <Alert key={index} variant={isCorrect ? 'default' : 'destructive'}>
                            <AlertTitle>{q.question}</AlertTitle>
                            <AlertDescription>
                                <p>Your answer: {String(userAnswers[index])}</p>
                                <p>Correct answer: {String(q.answer)}</p>
                            </AlertDescription>
                        </Alert>
                    )
                })}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => setShowSummary(false)}>Back to Score</Button>
                </CardFooter>
            </Card>
          ) : (
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl">Quiz Complete!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-xl font-semibold">
                        Your score: {score} / {questions.length}
                    </p>
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                        ({Math.round((score / questions.length) * 100)}%)
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center space-x-4">
                    <Button
                        onClick={() => {
                            setCurrentQuestion(0);
                            setUserAnswers(new Array(questions.length).fill(undefined));
                            setIsComplete(false);
                            setShowSummary(false);
                        }}
                    >
                        Restart Quiz
                    </Button>
                    <Button onClick={() => setShowSummary(true)}>
                        Review Answers
                    </Button>
                </CardFooter>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
