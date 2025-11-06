
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey, getModel } from '@/lib/aistudio';
import QuestionMultipleChoice from '@/components/quiz/QuestionMultipleChoice';
import QuestionTrueFalse from '@/components/quiz/QuestionTrueFalse';
import QuestionCaseBased from '@/components/quiz/QuestionCaseBased';
import { QuizQuestion, PracticeSession, Mistake } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp, doc } from 'firebase/firestore';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | boolean)[]>([]);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [explanations, setExplanations] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchSettingsAndGenerateQuestions = async () => {
      if (!user) {
        // user object might not be available immediately
        return;
      }
      setLoadingMessage('Retrieving settings...');
      const key = await getApiKey(user.uid);
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
  }, [user]);

  const generateQuestions = async (apiKey: string, modelId: string): Promise<QuizQuestion[]> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    const prompt = `
      Generate exactly ${limit} quiz questions about the topic "${topic}".
      The target audience is learners associated with a "${clientType}".
      The quiz should be of the type "${questionType}".

      Format your response as a valid JSON array of objects. Each object must have a "type" field that is one of "multiple_choice", "true_false", or "case_based", and a "question" field.
      - For "multiple_choice", include an "options" array and an "answer" field with the correct option.
      - For "true_false", include an "answer" field that is a boolean.
      - For "case_based", include a "prompt" field for the user to respond to and an "answer" field.

      Example structure:
      [
        {
          "type": "multiple_choice",
          "question": "What is the capital of France?",
          "options": ["London", "Berlin", "Paris", "Madrid"],
          "answer": "Paris"
        },
        {
          "type": "true_false",
          "question": "The earth is flat.",
          "answer": false
        },
        {
          "type": "case_based",
          "question": "A user is having trouble logging in. They have reset their password but still can't access their account.",
          "prompt": "What are the next steps to troubleshoot this issue?",
          "answer": "Check if the user's account is locked, verify the email address they are using, and check for any recent security alerts."
        }
      ]

      Important: Return ONLY the JSON array, no other text or explanation.
    `;

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

      const parsed = JSON.parse(jsonString) as QuizQuestion[];
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid question format');
      }

      const validated = parsed.filter(q => {
        if (!q.question || q.answer === undefined) return false;
        if (q.type === 'multiple_choice' && (!q.options || q.options.length === 0)) return false;
        if (q.type === 'case_based' && !q.prompt) return false;
        return true;
      });

      return validated.slice(0, limit);
    } catch (err) {
      console.warn('Failed to parse AI response:', err);
      setLoadingMessage('Failed to generate questions. Please try again later.');
      return [];
    }
  };

  const generateExplanations = async (): Promise<string[]> => {
    if (!apiKey || !modelId) return [];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    const prompt = `
      For the following quiz questions and their correct answers, provide a concise explanation for each answer.
      The target audience is learners associated with a "${clientType}".
      The topic is "${topic}".

      Questions and Answers:
      ${questions.map((q, i) => `${i + 1}. Question: ${q.question}\n   Answer: ${String(q.answer)}`).join('\n')}

      Format your response as a valid JSON array of strings, where each string is the explanation for the corresponding question.
      Example:
      [
        "Explanation for question 1...",
        "Explanation for question 2...",
        "Explanation for question 3..."
      ]

      Important: Return ONLY the JSON array, no other text or explanation.
    `;

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

      const parsed = JSON.parse(jsonString) as string[];
      if (!Array.isArray(parsed) || parsed.length !== questions.length) {
          throw new Error('Invalid explanation format or length mismatch');
      }
      return parsed;

    } catch (err) {
      console.warn('Failed to generate explanations:', err);
      return questions.map(() => 'Could not generate an explanation for this question.');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!user) {
      console.error("No user found, cannot submit quiz.");
      return;
    }

    setIsSubmitting(true);
    setLoadingMessage('Submitting your results...');

    // Recalculate the final score to ensure accuracy
    const finalScore = userAnswers.reduce((acc, answer, index) => {
      return String(answer) === String(questions[index].answer) ? acc + 1 : acc;
    }, 0);
    setScore(finalScore);

    const explanations = await generateExplanations();
    setExplanations(explanations);

    const practiceSessionData: Omit<PracticeSession, 'id' | 'userId'> = {
      topic,
      questions: questions.map((q, i) => ({
        question: q.question,
        userAnswer: String(userAnswers[i]),
        correctAnswer: String(q.answer),
        isCorrect: String(userAnswers[i]) === String(q.answer),
        type: q.type,
        explanation: explanations[i],
      })),
      score: finalScore,
      totalQuestions: questions.length,
      createdAt: Timestamp.now(),
    };

    const sessionDocRef = await addDoc(collection(firestore, 'users', user.uid, 'practiceSessions'), practiceSessionData);

    const mistakesCollection = collection(firestore, 'users', user.uid, 'mistakes');
    for (let i = 0; i < questions.length; i++) {
      const isCorrect = String(userAnswers[i]) === String(questions[i].answer);
      if (!isCorrect) {
        const mistakeData: Omit<Mistake, 'id' | 'userId'> = {
          question: questions[i].question,
          userAnswer: String(userAnswers[i]),
          correctAnswer: String(questions[i].answer),
          topic,
          createdAt: Timestamp.now(),
          practiceSessionId: sessionDocRef.id,
        };
        await addDoc(mistakesCollection, mistakeData);
      }
    }

    setIsComplete(true);
    setIsSubmitting(false);
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
          
          <div>
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
          </div>

          <button
            onClick={() => {
              if (currentQuestion < questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
              } else {
                handleSubmitQuiz();
              }
            }}
            disabled={userAnswers[currentQuestion] === undefined || isSubmitting}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : (currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz')}
          </button>
        </div>
      ) : (
        <div>
          {showSummary ? (
            <div>
              <h3 className="text-2xl font-bold mb-4">Quiz Summary</h3>
              {isSubmitting ? (
                <p>Loading explanations...</p>
              ) : (
                questions.map((q, index) => (
                  <div key={index} className="mb-4 p-4 border rounded-lg">
                    <p className="font-semibold">{q.question}</p>
                    <p>Your answer: {String(userAnswers[index])}</p>
                    <p>Correct answer: {String(q.answer)}</p>
                    <p>Status: {String(userAnswers[index]) === String(q.answer) ? 'Correct' : 'Incorrect'}</p>
                    {explanations[index] && (
                      <div className="mt-2 p-2 bg-gray-100 rounded">
                        <p className="text-sm font-semibold">Explanation:</p>
                        <p className="text-sm">{explanations[index]}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
              <Button onClick={() => setShowSummary(false)}>Back to Score</Button>
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
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => {
                    setCurrentQuestion(0);
                    setUserAnswers([]);
                    setScore(0);
                    setIsComplete(false);
                  }}
                >
                  Restart Quiz
                </Button>
                <Button onClick={() => setShowSummary(true)}>
                  Review Answers
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
