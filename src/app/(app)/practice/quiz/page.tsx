'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch
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
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ThumbsDown, ThumbsUp, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import clientsData from '@/lib/vls-clients.json';

import {
  PracticeSession,
  QuizFeedback,
  QuizQuestion,
  Answer,
  VLSClient
} from '@/lib/types';

import QuestionMultipleChoice from '@/components/quiz/QuestionMultipleChoice';
import QuestionTrueFalse from '@/components/quiz/QuestionTrueFalse';
import QuestionMatching from '@/components/quiz/QuestionMatching';
import QuestionCaseBased from '@/components/quiz/QuestionCaseBased';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface Quiz {
  questions: QuizQuestion[];
}

interface QuizComponentProps {
  topic: string;
  limit: number;
  clientType: string;
  questionType: string;
}

// ----------------- Prompt generator -----------------
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
Each question object must have a "type" property and other properties that match its type:

1. "type": "multiple_choice"
   - "question": string
   - "options": string[]
   - "answer": string

2. "type": "true_false"
   - "question": string
   - "answer": boolean

3. "type": "matching_pairs"
   - "question": string
   - "pairs": Array<{prompt: string, match: string}>
   - "answer": Array<string>

4. "type": "case_based"
   - "question": string
   - "prompt": string
   - "answer": string

Do not include text outside a single valid JSON object.
`;
}

// ----------------- Quiz Component -----------------
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
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'good' | 'bad'>>({});

  const resultsRef = useRef<HTMLDivElement>(null);

  // ----------------- Fetch quiz -----------------
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!user || !firestore) return;
      setLoading(true);
      setError(null);

      try {
        setLoadingMessage('Fetching learning history...');
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const q = query(sessionsCollection, where('topic', '==', topic));
        const querySnapshot = await getDocs(q);
        const previousQuestions: string[] = [];
        querySnapshot.forEach(doc => {
          const session = doc.data() as PracticeSession;
          session.questions.forEach(q => previousQuestions.push(q.question));
        });

        const clients: VLSClient[] = clientsData.clients;
        const client = clients.find(c => c.client_type === clientType);
        if (!client) throw new Error('Invalid client profile.');

        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

        // ----------------- Load AI model -----------------
        setLoadingMessage('Downloading model...');
        const modelId = 'Qwen3-VL-1B-GGUF';
        const modelUrl =
          'https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true';

        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error('Failed to download model');
        const modelBuffer = await response.arrayBuffer();
        const modelFile = new File([modelBuffer], 'qwen3-vl-1b-merged-q4_k_m.gguf', {
          type: 'application/octet-stream'
        });

        setLoadingMessage('Initializing AI engine...');
        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [
            {
              local_id: modelId,
              model_type: ModelType.LLM,
              required_features: ['shader-f16'],
              file: modelFile
            }
          ],
          initProgressCallback: progress => {
            setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`);
          }
        });

        setLoadingMessage('Generating questions...');
        const reply = await engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: 'json_object' }
        });

        const jsonResponse = reply.choices[0].message.content;
        if (!jsonResponse) throw new Error('AI did not return a response.');

        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);
      } catch (err: any) {
        setError(err.message || 'Failed to generate quiz.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [topic, limit, clientType, questionType, user, firestore]);

  // ----------------- Answer selection -----------------
  const handleAnswerSelect = (questionIndex: number, answer: Answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  // ----------------- Feedback -----------------
  const handleFeedback = async (questionText: string, rating: 'good' | 'bad') => {
    if (!user || !firestore) return;
    const feedbackKey = `${questionText}-${rating}`;
    if (feedbackSent[feedbackKey]) return;
    setFeedbackSent(prev => ({ ...prev, [feedbackKey]: rating }));

    const feedbackCollection = collection(firestore, 'feedback');
    const feedbackData: Omit<QuizFeedback, 'id'> = {
      userId: user.uid,
      question: questionText,
      rating,
      topic,
      createdAt: serverTimestamp()
    };
    await addDocumentNonBlocking(feedbackCollection, feedbackData);
  };

  // ----------------- Render question -----------------
  const renderQuestion = (question: QuizQuestion, index: number) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <QuestionMultipleChoice
            key={index}
            question={question}
            selected={answers[index]}
            onSelect={ans => handleAnswerSelect(index, ans)}
          />
        );
      case 'true_false':
        return (
          <QuestionTrueFalse
            key={index}
            question={question}
            selected={answers[index]}
            onSelect={ans => handleAnswerSelect(index, ans)}
          />
        );
      case 'matching_pairs':
        return (
          <QuestionMatching
            key={index}
            question={question}
            selected={answers[index]}
            onSelect={ans => handleAnswerSelect(index, ans)}
          />
        );
      case 'case_based':
        return (
          <QuestionCaseBased
            key={index}
            question={question}
            selected={answers[index]}
            onSelect={ans => handleAnswerSelect(index, ans)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-40 w-full" />
          <p>{loadingMessage}</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : quiz ? (
        <div>
          <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} />
          {quiz.questions.map((q, idx) => renderQuestion(q, idx))}
          <div className="mt-4 space-x-2">
            <Button
              onClick={() => setCurrentQuestionIndex(idx => Math.max(idx - 1, 0))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setCurrentQuestionIndex(idx => Math.min(idx + 1, quiz.questions.length - 1))
              }
              disabled={currentQuestionIndex === quiz.questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p>No quiz loaded.</p>
      )}
    </div>
  );
}

export default QuizComponent;
