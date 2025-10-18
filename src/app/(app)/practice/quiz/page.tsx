'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import * as webllm from '@mlc-ai/web-llm';
import { ModelType } from '@mlc-ai/web-llm';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  ThumbsDown,
  ThumbsUp,
  Sparkles,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  PracticeSession,
  QuizFeedback,
  QuizQuestion,
  Answer,
  VLSClient,
} from '@/lib/types';
import QuestionMultipleChoice from '@/components/quiz/QuestionMultipleChoice';
import QuestionTrueFalse from '@/components/quiz/QuestionTrueFalse';
import QuestionMatching from '@/components/quiz/QuestionMatching';
import QuestionCaseBased from '@/components/quiz/QuestionCaseBased';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import clientsData from '@/lib/vls-clients.json';

export interface Quiz {
  questions: QuizQuestion[];
}

interface QuizComponentProps {
  topic: string;
  limit: number;
  clientType: string;
  questionType: string;
}

const DB_NAME = 'VaseLearnModelCache';
const STORE_NAME = 'models';

async function saveModelToDB(modelId: string, buffer: ArrayBuffer): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(buffer, modelId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadModelFromDB(modelId: string): Promise<ArrayBuffer | null> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const getRequest = tx.objectStore(STORE_NAME).get(modelId);
    getRequest.onsuccess = () => resolve(getRequest.result ?? null);
    getRequest.onerror = () => reject(getRequest.error);
  });
}

function getPrompt(
  client: VLSClient,
  topic: string,
  numQuestions: number,
  questionType: string,
  previousQuestions: string[]
) {
  const questionTypeInstruction =
    questionType && questionType !== 'mixed'
      ? `The question "type" must be exactly "${questionType}". Do not use any other type.`
      : `The question "type" should be varied and selected from the following list: [${client.question_generation.style.join(
          ', '
        )}]. Do not use types not in this list.`;

  const historyInstruction =
    previousQuestions && previousQuestions.length > 0
      ? `You MUST NOT repeat any of the following questions that have been asked before:\n${previousQuestions
          .map((q) => `- ${q}`)
          .join('\n')}`
      : 'This is the first quiz on this topic.';

  return `
${client.instruction.system_prompt}
You are generating a quiz for the topic "${topic}".
Context: ${client.instruction.context}
The tone should be: ${client.instruction.tone}.

Generate a JSON object for a quiz with exactly ${numQuestions} questions.
${questionTypeInstruction}

Crucially, you must generate NEW questions that are different from the user's history.
${historyInstruction}

The JSON output must be an object with a "questions" key, which is an array of question objects.
Each question object must have a "type" property and other properties that match its type, according to these schemas:

1. "type": "multiple_choice"
   - "question": string
   - "options": string[] (array of 4 strings)
   - "answer": string (the correct option text)

2. "type": "true_false"
   - "question": string
   - "answer": boolean (true or false)

3. "type": "matching_pairs"
   - "question": string (e.g., "Match the concepts to their definitions.")
   - "pairs": Array of objects, where each object has a "prompt" and a "match". Generate 4 pairs.
   - "answer": array of correct matches

4. "type": "case_based"
   - "question": string (scenario or case study)
   - "prompt": string
   - "answer": string (detailed answer)

Output must be valid JSON only.
`;
}

function QuizComponent({ topic, limit, clientType, questionType }: QuizComponentProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing AI Engine...');
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'good' | 'bad'>>({});

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!user || !firestore) return;
      setLoading(true);
      setError(null);

      try {
        setLoadingMessage('Fetching your learning history...');
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const q = query(sessionsCollection, where('topic', '==', topic));
        const querySnapshot = await getDocs(q);
        const previousQuestions: string[] = [];
        querySnapshot.forEach((doc) => {
          const session = doc.data() as PracticeSession;
          session.questions.forEach((q) => previousQuestions.push(q.question));
        });

        const clients: VLSClient[] = clientsData.clients;
        const client = clients.find((c) => c.client_type === clientType);
        if (!client) throw new Error('Invalid client profile specified.');

        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

        const modelId = 'Qwen3-VL-1B-GGUF';
        const modelUrl =
          'https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true';

        setLoadingMessage('Checking cached model...');
        let modelBuffer = await loadModelFromDB(modelId);

        if (!modelBuffer) {
          setLoadingMessage('Downloading AI model...');
          const response = await fetch(modelUrl);
          if (!response.ok) throw new Error('Failed to download model');
          modelBuffer = await response.arrayBuffer();
          await saveModelToDB(modelId, modelBuffer);
        }

        const modelFile = new File([modelBuffer], 'qwen3-vl-1b-merged-q4_k_m.gguf', {
          type: 'application/octet-stream',
        });

        setLoadingMessage('Initializing AI engine...');
        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [
            {
              local_id: modelId,
              model_type: ModelType.LLM,
              required_features: ['shader-f16'],
              file: modelFile,
            },
          ],
          initProgressCallback: (progress) => {
            setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`);
          },
        });

        setLoadingMessage('Generating new questions...');
        const reply = await engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: 'json_object' },
        });

        const jsonResponse = reply.choices[0].message.content;
        if (!jsonResponse) throw new Error('No response from AI model.');
        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);
      } catch (err: any) {
        console.error(err);
        setError(
          'Failed to generate the quiz. AI may be busy or your browser may not be supported.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [topic, limit, clientType, questionType, user, firestore]);

  const handleAnswerSelect = (questionIndex: number, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleFeedback = async (questionText: string, rating: 'good' | 'bad') => {
    if (!user || !firestore) return;
    const feedbackKey = `${questionText}-${rating}`;
    if (feedbackSent[feedbackKey]) return;
    setFeedbackSent((prev) => ({ ...prev, [feedbackKey]: rating }));

    const feedbackCollection = collection(firestore, 'feedback');
    const feedbackData: Omit<QuizFeedback, 'id'> = {
      userId: user.uid,
      question: questionText,
      rating,
      topic,
      createdAt: serverTimestamp(),
    };
    await addDocumentNonBlocking(feedbackCollection, feedbackData);
  };

  const isAnswerCorrect = (question: QuizQuestion, userAnswer: Answer): boolean => {
    if (userAnswer === undefined || userAnswer === null) return false;

    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return userAnswer === question.answer;
      case 'matching_pairs':
        if (!Array.isArray(userAnswer) || !Array.isArray(question.answer)) return false;
        if (userAnswer.length !== question.answer.length) return false;
        return userAnswer.every((val, idx) => val === question.answer[idx]);
      case 'case_based':
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!quiz || !user || !firestore) return;
    setIsSaving(true);
    let newScore = 0;
    const answeredQuestions = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const userAnswer = answers[i];
      const isCorrect =
        question.type === 'case_based' ? true : isAnswerCorrect(question, userAnswer);
      if (isCorrect) newScore++;
      answeredQuestions.push({
        question: question.question,
        userAnswer: userAnswer !== undefined ? JSON.stringify(userAnswer) : 'No Answer',
        correctAnswer: JSON.stringify(question.answer),
        isCorrect,
        type: question.type,
      });
    }

    setScore(newScore);

    try {
      const practiceSessionData: Omit<PracticeSession, 'id'> = {
        topic,
        score: newScore,
        totalQuestions: quiz.questions.length,
        questions: answeredQuestions,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };
      const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
      const sessionDocRef = await addDoc(sessionsCollection, practiceSessionData);

      const mistakesToSave = answeredQuestions.filter(
        (q) => !q.isCorrect && q.type !== 'case_based'
      );
      if (mistakesToSave.length > 0) {
        const batch = writeBatch(firestore);
        const mistakesCollectionRef = collection(firestore, 'users', user.uid, 'mistakes');

        mistakesToSave.forEach((mistake) => {
          const mistakeDoc = doc(mistakesCollectionRef);
          batch.set(mistakeDoc, {
            question: mistake.question,
            userAnswer: mistake.userAnswer,
            correctAnswer: mistake.correctAnswer,
            topic,
            userId: user.uid,
            createdAt: serverTimestamp(),
            practiceSessionId: sessionDocRef.id,
          });
        });
        await batch.commit();
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error saving session:', err);
      setError('Failed to save your quiz results.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Sparkles className="w-12 h-12 animate-pulse mb-4" />
        <p className="text-lg font-medium">{loadingMessage}</p>
        <Skeleton className="w-2/3 h-8 mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p>Loading quiz...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz: {topic}</CardTitle>
          <CardDescription>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <>
              <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} />
              {quiz.questions.map((q, i) => (
                <div key={i} className={cn('mt-6', i !== currentQuestionIndex && 'hidden')}>
                  {q.type === 'multiple_choice' && (
                    <QuestionMultipleChoice
                      question={q}
                      onAnswerSelect={(answer) => handleAnswerSelect(i, answer)}
                      selectedAnswer={answers[i]}
                    />
                  )}
                  {q.type === 'true_false' && (
                    <QuestionTrueFalse
                      question={q}
                      onAnswerSelect={(answer) => handleAnswerSelect(i, answer)}
                      selectedAnswer={answers[i]}
                    />
                  )}
                  {q.type === 'matching_pairs' && (
                    <QuestionMatching
                      question={q}
                      onAnswerSelect={(answer) => handleAnswerSelect(i, answer)}
                      selectedAnswer={answers[i]}
                    />
                  )}
                  {q.type === 'case_based' && (
                    <QuestionCaseBased
                      question={q}
                      onAnswerSelect={(answer) => handleAnswerSelect(i, answer)}
                      selectedAnswer={answers[i]}
                    />
                  )}
                </div>
              ))}
            </>
          ) : (
            <div ref={resultsRef} className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Quiz Complete!</AlertTitle>
                <AlertDescription>
                  You scored {score} out of {quiz.questions.length}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {!submitted ? (
            <>
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setCurrentQuestionIndex(
                      Math.min(quiz.questions.length - 1, currentQuestionIndex + 1)
                    )
                  }
                >
                  Next
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => router.push('/practice')}>Back to Dashboard</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function QuizPage() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') || 'General Knowledge';
  const limit = parseInt(searchParams.get('limit') || '5');
  const clientType = searchParams.get('clientType') || 'default';
  const questionType = searchParams.get('questionType') || 'mixed';

  return (
    <Suspense fallback={<Skeleton className="w-full h-96" />}>
      <QuizComponent
        topic={topic}
        limit={limit}
        clientType={clientType}
        questionType={questionType}
      />
    </Suspense>
  );
}
