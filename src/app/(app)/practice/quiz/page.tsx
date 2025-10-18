'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, writeBatch, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import * as webllm from '@mlc-ai/web-llm';
import { ModelType } from '@mlc-ai/web-llm';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ThumbsDown, ThumbsUp, Sparkles, CheckCircle, XCircle, Download, FileText, LayoutDashboard, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { PracticeSession, Mistake, QuizFeedback, QuizQuestion, Answer, VLSClient } from '@/lib/types';
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

function getPrompt(client: VLSClient, topic: string, numQuestions: number, questionType: string, previousQuestions: string[]) {
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
         - "pairs": Array of objects, where each object has a "prompt" and a "match". {"prompt": "Term 1", "match": "Definition 1"}. Generate 4 pairs.
         - The "answer" for this type should be an array of the "match" strings, in the correct order corresponding to the "prompt" strings.
      
      4. "type": "case_based"
          - "question": string (A scenario or case study)
          - "prompt": string (The specific question to answer about the case, e.g., "What is the best course of action?")
          - "answer": string (A detailed, expert-written answer to the evaluation purposes)
      
      Do not include any text, backticks, or formatting outside of the single, valid JSON object. The entire output must be only the JSON.
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

        // --- Load model
        setLoadingMessage('Downloading AI model...');
        const modelId = 'Qwen3-VL-1B-GGUF';
        const modelUrl =
          'https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true';

        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error('Failed to download model');
        const modelBuffer = await response.arrayBuffer();
        const modelFile = new File([modelBuffer], 'qwen3-vl-1b-merged-q4_k_m.gguf', { type: 'application/octet-stream' });

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
        if (!jsonResponse) throw new Error('The AI model did not return a response.');
        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);
      } catch (err: any) {
        console.error(err);
        setError(
          'Failed to generate the quiz. The AI model may be too busy or the browser may not be supported. Please try again later.'
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
        return userAnswer.every((val, index) => val === question.answer[index]);
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

      let isCorrectForScoring = false;
      if (question.type === 'case_based') {
        newScore++;
        isCorrectForScoring = true;
      } else {
        const isCorrect = isAnswerCorrect(question, userAnswer);
        if (isCorrect) newScore++;
        isCorrectForScoring = isCorrect;
      }

      answeredQuestions.push({
        question: question.question,
        userAnswer: userAnswer !== undefined ? JSON.stringify(userAnswer) : 'No Answer',
        correctAnswer: JSON.stringify(question.answer),
        isCorrect: isCorrectForScoring,
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

      const mistakesToSave = answeredQuestions.filter((q) => !q.isCorrect && q.type !== 'case_based');
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
        await batch    1. "type": "multiple_choice"
       - "question": string
       - "options": string[] (array of 4 strings)
       - "answer": string (the correct option text)
    
    2. "type": "true_false"
       - "question": string
       - "answer": boolean (true or false)

    3. "type": "matching_pairs"
       - "question": string (e.g., "Match the concepts to their definitions.")
       - "pairs": Array of objects, where each object has a "prompt" and a "match". {"prompt": "Term 1", "match": "Definition 1"}. Generate 4 pairs.
       - The "answer" for this type should be an array of the "match" strings, in the correct order corresponding to the "prompt" strings.
    
    4. "type": "case_based"
        - "question": string (A scenario or case study)
        - "prompt": string (The specific question to answer about the case, e.g., "What is the best course of action?")
        - "answer": string (A detailed, expert-written answer to the evaluation purposes)
    
    Do not include any text, backticks, or formatting outside of the single, valid JSON object. The entire output must be only the JSON.
  `;
}

function QuizComponent({ topic, limit, clientType, questionType }: QuizComponentProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AI Engine...");
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
        setLoadingMessage("Fetching your learning history...");
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const q = query(sessionsCollection, where("topic", "==", topic));
        const querySnapshot = await getDocs(q);
        const previousQuestions: string[] = [];
        querySnapshot.forEach((doc) => {
          const session = doc.data() as PracticeSession;
          session.questions.forEach(q => previousQuestions.push(q.question));
        });

        const clients: VLSClient[] = clientsData.clients;
        const client = clients.find(c => c.client_type === clientType);
        if (!client) {
          throw new Error("Invalid client profile specified.");
        }

        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

        const modelId = "Qwen3-VL-1B-GGUF";
        const modelUrl = "https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true";

        setLoadingMessage("Downloading model...");
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error("Failed to download model");
        const modelBuffer = await response.arrayBuffer();
        const modelFile = new File([modelBuffer], "qwen3-vl-1b-merged-q4_k_m.gguf", {
          type: "application/octet-stream",
        });

        setLoadingMessage("Initializing AI model...");
        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [
            {
              local_id: modelId,
              model_type: ModelType.LLM,
              required_features: ["shader-f16"],
              file: modelFile,
            },
          ],
          initProgressCallback: (progress) => {
            setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`);
          },
        });

        setLoadingMessage("Generating new questions...");
        const reply = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: "json_object" },
        });

        const jsonResponse = reply.choices[0].message.content;
        if (!jsonResponse) throw new Error("AI model did not return a response");

        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);

      } catch (err: any) {
        console.error(err);
        setError('Failed to generate the quiz. Please try again later.');
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
    setFeedbackSent(prev => ({ ...prev, [feedbackKey]: rating }));
    const feedbackCollection = collection(firestore, 'feedback');
    const feedbackData: Omit<QuizFeedback, 'id'> = {
      userId: user.uid,
      question: questionText,
      rating: rating,
      topic: topic,
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
      let isCorrectForScoring = false;

      if (question.type === 'case_based') {
        newScore++;
        isCorrectForScoring = true;
      } else {
        const isCorrect = isAnswerCorrect(question, userAnswer);
        if (isCorrect) newScore++;
        isCorrectForScoring = isCorrect;
      }

      answeredQuestions.push({
        question: question.question,
        userAnswer: userAnswer !== undefined ? JSON.stringify(userAnswer) : 'No Answer',
        correctAnswer: JSON.stringify(question.answer),
        isCorrect: isCorrectForScoring,
        type: question.type,
      });
    }    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
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
    const tx = db.transaction(STORE_NAME, "readonly");
    const getRequest = tx.objectStore(STORE_NAME).get(modelId);
    getRequest.onsuccess = () => resolve(getRequest.result ?? null);
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export interface Quiz {
  questions: QuizQuestion[];
}

interface QuizComponentProps {
  topic: string;
  limit: number;
  clientType: string;
  questionType: string;
}

// --- Prompt generation
function getPrompt(client: VLSClient, topic: string, numQuestions: number, questionType: string, previousQuestions: string[]) {
  const questionTypeInstruction = (questionType && questionType !== 'mixed')
      ? `The question "type" must be exactly "${questionType}". Do not use any other type.`
      : `The question "type" should be varied and selected from the following list: [${client.question_generation.style.join(', ')}]. Do not use types not in this list.`;

  const historyInstruction = (previousQuestions && previousQuestions.length > 0)
      ? `You MUST NOT repeat any of the following questions that have been asked before:\n${previousQuestions.map(q => `- ${q}`).join('\n')}`
      : "This is the first quiz on this topic.";

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
       - "question": string
       - "pairs": Array of objects, where each object has a "prompt" and a "match". Generate 4 pairs.
       - "answer": array of matches in the correct order

    4. "type": "case_based"
       - "question": string
       - "prompt": string
       - "answer": string
    
    Do not include any text outside of a single valid JSON object. Output must be only JSON.
  `;
}

// --- Quiz Component
function QuizComponent({ topic, limit, clientType, questionType }: QuizComponentProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AI Engine...");
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
        setLoadingMessage("Fetching your learning history...");
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const q = query(sessionsCollection, where("topic", "==", topic));
        const querySnapshot = await getDocs(q);
        const previousQuestions: string[] = [];
        querySnapshot.forEach((doc) => {
            const session = doc.data() as PracticeSession;
            session.questions.forEach(q => previousQuestions.push(q.question));
        });

        const clients: VLSClient[] = clientsData.clients;
        const client = clients.find(c => c.client_type === clientType);
        if (!client) throw new Error("Invalid client profile specified.");

        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

        // --- WebLLM Model setup
        const modelId = "Qwen3-VL-1B-GGUF";
        const modelUrl = "https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true";

        setLoadingMessage("Checking cached model...");

        let modelBuffer = await loadModelFromDB(modelId);

        if (!modelBuffer) {
          setLoadingMessage("Downloading model...");
          const response = await fetch(modelUrl);
          if (!response.ok) throw new Error("Failed to download model");
          modelBuffer = await response.arrayBuffer();
          await saveModelToDB(modelId, modelBuffer);
          setLoadingMessage("Model cached locally.");
        } else {
          setLoadingMessage("Using cached model...");
        }

        const modelFile = new File([modelBuffer], "qwen3-vl-1b-merged-q4_k_m.gguf", { type: "application/octet-stream" });

        setLoadingMessage("Initializing AI engine...");

        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [
            {
              local_id: modelId,
              model_type: ModelType.LLM,
              required_features: ["shader-f16"],
              file: modelFile,
            },
          ],
          initProgressCallback: (progress) => {
            setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`);
          },
        });

        setLoadingMessage("Generating new questions...");

        const reply = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: "json_object" },
        });

        const jsonResponse = reply.choices?.[0]?.message?.content;
        if (!jsonResponse) throw new Error("The AI model did not return a response.");

        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);

      } catch (err: any) {
        setError('Failed to generate the quiz. The AI model may be busy or your browser may not be supported.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [topic, limit, clientType, questionType, user, firestore]);

  // --- Answer selection and feedback
  const handleAnswerSelect = (questionIndex: number, answer: Answer) => {
    setAnswers((prev)        setLoadingMessage("Initializing AI engine...");

        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [
            {
              local_id: modelId,
              model_type: ModelType.LLM,
              required_features: ["shader-f16"],
              file: modelFile,
            },
          ],
          initProgressCallback: (progress) => {
            setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`);
          },
        });

        setLoadingMessage("Generating quiz...");

        const prompt = `
          Generate a short quiz in JSON format with 3 true_false questions.
          Each object should have: question, correct_answer, and explanation.
        `;

        const reply = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: "json_object" },
        });

        const jsonResponse = reply.choices?.[0]?.message?.content;
        if (!jsonResponse) throw new Error("No response from AI.");

        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);
        setLoadingMessage("");
      } catch (err: any) {
        console.error("Model load failed:", err);
        setError("Model load failed. Please try again later.");
        setLoadingMessage("");
      }
    };

    loadModelAndGenerate();
  }, []);

  if (loadingMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-medium">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading quiz...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Generated Quiz</h1>
      {quiz.questions ? (
        <ul className="space-y-4">
          {quiz.questions.map((q: any, index: number) => (
            <li key={index} className="border p-4 rounded-lg shadow">
              <p className="font-semibold">{q.question}</p>
              <p className="text-sm text-gray-600">Answer: {q.correct_answer}</p>
              <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No quiz data available.</p>
      )}
    </div>
  );
      }  Sparkles,
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
  QuizQuestion,
  Answer,
  VLSClient,
} from '@/lib/types';

import clientsData from '@/lib/vls-clients.json';

// Quiz interface
export interface Quiz {
  questions: QuizQuestion[];
}

interface QuizComponentProps {
  topic: string;
  limit: number;
  clientType: string;
  questionType: string;
}

// 🔹 Generate LLM Prompt
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
   - "pairs": Array of objects, where each object has a "prompt" and a "match". {"prompt": "Term 1", "match": "Definition 1"}. Generate 4 pairs.
   - The "answer" for this type should be an array of the "match" strings, in the correct order corresponding to the "prompt" strings.

4. "type": "case_based"
   - "question": string (A scenario or case study)
   - "prompt": string (The specific question to answer about the case, e.g., "What is the best course of action?")
   - "answer": string (A detailed, expert-written answer to the evaluation purposes)

Do not include any text, backticks, or formatting outside of the single, valid JSON object.
The entire output must be only the JSON.
`;
}

// 🔹 Main Quiz Component
export default function QuizComponent({
  topic,
  limit,
  clientType,
  questionType,
}: QuizComponentProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing AI Engine...');
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'good' | 'bad'>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!user || !firestore) return;

      setLoading(true);
      setError(null);

      try {
        // 1️⃣ Fetch learning history
        setLoadingMessage('Fetching your learning history...');
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const q = query(sessionsCollection, where('topic', '==', topic));
        const querySnapshot = await getDocs(q);

        const previousQuestions: string[] = [];
        querySnapshot.forEach((doc) => {
          const session = doc.data() as PracticeSession;
          session.questions.forEach((q) => previousQuestions.push(q.question));
        });

        // 2️⃣ Get client data
        const clients: VLSClient[] = clientsData.clients;
        const client = clients.find((c) => c.client_type === clientType);
        if (!client) throw new Error('Invalid client profile specified.');

        // 3️⃣ Build prompt
        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

        // 4️⃣ Initialize AI model
        const modelId = 'Qwen3-VL-1B-GGUF';
        const modelUrl =
          'https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true';

        setLoadingMessage('Downloading model...');
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error('Failed to download model');
        const modelBuffer = await response.arrayBuffer();

        const modelFile = new File([modelBuffer], 'qwen3-vl-1b-merged-q4_k_m.gguf', {
          type: 'application/octet-stream',
        });

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

        // 5️⃣ Generate quiz
        setLoadingMessage('Generating new questions...');
        const reply = await engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: 'json_object' },
        });

        const jsonResponse = reply.choices[0].message.content;
        if (!jsonResponse) throw new Error('The AI model did not return a response.');

        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);
      } catch (err: any) {
        console.error(err);
        setError(
          'Failed to generate the quiz. The AI model may be too busy or the browser may not be supported. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [user, firestore, topic, limit, clientType, questionType]);

  // ✅ Return JSX
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-medium">{loadingMessage}</p>
        <Skeleton className="w-2/3 h-8 mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Quiz: {topic}</h2>
      {quiz && (
        <Card>
          <CardContent>
            {quiz.questions.map((q, i) => (
              <div key={i} className="mb-6">
                <p className="font-semibold">{q.question}</p>
                {/* TODO: Render appropriate question components here */}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
  }
