'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
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
import {
  ThumbsDown,
  ThumbsUp,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
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

function QuizComponent({ topic, limit, clientType, questionType }: QuizComponentProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // ----------------- State -----------------
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

        // TODO: Load AI model and generate quiz
        console.log('Prompt ready:', prompt);
      } catch (err: any) {
        setError(err.message || 'Failed to generate quiz.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [topic, limit, clientType, questionType, user, firestore]);

  return (
    <div className="p-4">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div>
          {/* Quiz rendering will go here */}
          <p>Quiz loaded! Questions will appear here.</p>
        </div>
      )}
    </div>
  );
}

export default QuizComponent;
