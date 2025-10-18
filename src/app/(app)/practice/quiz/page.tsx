'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import * as webllm from '@mlc-ai/web-llm';
import { ModelType } from '@mlc-ai/web-llm';
import clientsData from '@/lib/vls-clients.json';
import { QuizQuestion, Answer, VLSClient, PracticeSession, QuizFeedback } from '@/lib/types';

const DB_NAME = 'webllm_models';
const STORE_NAME = 'models';

// --- IndexedDB helpers
async function saveModelToDB(modelId: string, buffer: ArrayBuffer) {
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

// --- Prompt generator
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
      : `The question "type" should be varied and selected from: [${client.question_generation.style.join(
          ', '
        )}]`;

  const historyInstruction =
    previousQuestions.length > 0
      ? `Do NOT repeat any of the following questions:\n${previousQuestions.map((q) => `- ${q}`).join('\n')}`
      : 'This is the first quiz on this topic.';

  return `
    ${client.instruction.system_prompt}
    Generate a JSON quiz for topic "${topic}" with ${numQuestions} questions.
    ${questionTypeInstruction}
    ${historyInstruction}
    Output JSON must have "questions": [{type:..., question:..., answer:...}].
  `;
}

interface Quiz {
  questions: QuizQuestion[];
}

interface QuizComponentProps {
  topic: string;
  limit: number;
  clientType: string;
  questionType: string;
}

export default function QuizComponent({ topic, limit, clientType, questionType }: QuizComponentProps) {
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
        // --- Fetch previous questions
        setLoadingMessage('Fetching your learning history...');
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const qSnap = await getDocs(query(sessionsCollection, where('topic', '==', topic)));
        const previousQuestions: string[] = [];
        qSnap.forEach((doc) => {
          const session = doc.data() as PracticeSession;
          session.questions.forEach((q) => previousQuestions.push(q.question));
        });

        // --- Get client config
        const clients: VLSClient[] = clientsData.clients;
        const client = clients.find((c) => c.client_type === clientType);
        if (!client) throw new Error('Invalid client profile.');

        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

        // --- Model setup
        const modelId = 'Qwen3-VL-1B-GGUF';
        const modelUrl =
          'https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true';

        setLoadingMessage('Checking cached model...');
        let modelBuffer = await loadModelFromDB(modelId);

        if (!modelBuffer) {
          setLoadingMessage('Downloading model...');
          const response = await fetch(modelUrl);
          if (!response.ok) throw new Error('Failed to download model.');
          modelBuffer = await response.arrayBuffer();
          await saveModelToDB(modelId, modelBuffer);
          setLoadingMessage('Model cached locally.');
        } else {
          setLoadingMessage('Using cached model...');
        }

        const modelFile = new File([modelBuffer], 'qwen3-vl-1b-merged-q4_k_m.gguf', { type: 'application/octet-stream' });

        setLoadingMessage('Initializing AI engine...');
        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [{ local_id: modelId, model_type: ModelType.LLM, required_features: ['shader-f16'], file: modelFile }],
          initProgressCallback: (progress) => setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`),
        });

        setLoadingMessage('Generating new questions...');
        const reply = await engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: 'json_object' },
        });

        const jsonResponse = reply.choices?.[0]?.message?.content;
        if (!jsonResponse) throw new Error('AI did not return a response.');
        setQuiz(JSON.parse(jsonResponse));
      } catch (err: any) {
        console.error(err);
        setError('Failed to generate quiz. Try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [topic, limit, clientType, questionType, user, firestore]);

  const handleAnswerSelect = (index: number, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [index]: answer }));
  };

  const handleFeedback = async (questionText: string, rating: 'good' | 'bad') => {
    if (!user || !firestore) return;
    const key = `${questionText}-${rating}`;
    if (feedbackSent[key]) return;
    setFeedbackSent((prev) => ({ ...prev, [key]: rating }));

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

  const isAnswerCorrect = (question: QuizQuestion, userAnswer: Answer) => {
    if (userAnswer == null) return false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') return userAnswer === question.answer;
    if (question.type === 'matching_pairs') {
      if (!Array.isArray(userAnswer) || !Array.isArray(question.answer)) return false;
      return userAnswer.length === question.answer.length && userAnswer.every((v, i) => v === question.answer[i]);
    }
if (question.type === 'case_based') return true; // Case-based may need manual evaluation
    if (question.type === 'decision_tree') return true; // Decision tree might be scenario-based
    return false;
  };

  const handleSubmit = async () => {
    if (!quiz || !user || !firestore) return;
    setSubmitted(true);

    // Calculate score
    let totalScore = 0;
    quiz.questions.forEach((q, i) => {
      if (isAnswerCorrect(q, answers[i])) totalScore++;
    });
    setScore(totalScore);

    // Save session to Firestore
    setIsSaving(true);
    try {
      const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
      const sessionData: Omit<PracticeSession, 'id'> = {
        topic,
        questions: quiz.questions.map((q, i) => ({
          question: q.question,
          type: q.type,
          userAnswer: answers[i] ?? null,
          correctAnswer: q.answer,
        })),
        score: totalScore,
        createdAt: serverTimestamp(),
      };
      await addDoc(sessionsCollection, sessionData);
    } catch (err) {
      console.error('Failed to save session', err);
    } finally {
      setIsSaving(false);
    }

    // Scroll to results
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <div>{loadingMessage}</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!quiz) return <div>No quiz available.</div>;

  return (
    <div className="quiz-component space-y-6">
      {quiz.questions.map((q, idx) => (
        <div key={idx} className="question-card p-4 border rounded">
          <p className="font-semibold">{idx + 1}. {q.question}</p>
          {(q.type === 'multiple_choice' || q.type === 'true_false') && q.options?.map((opt, i) => (
            <button
              key={i}
              className={`block w-full my-1 p-2 border rounded ${answers[idx] === opt ? 'bg-blue-200' : ''}`}
              onClick={() => handleAnswerSelect(idx, opt)}
              disabled={submitted}
            >
              {opt}
            </button>
          ))}
          {q.type === 'matching_pairs' && (
            <p>Matching pairs type question – select or drag answers as implemented.</p>
          )}
          {submitted && (
            <p className={`mt-2 font-medium ${isAnswerCorrect(q, answers[idx]) ? 'text-green-600' : 'text-red-600'}`}>
              Correct answer: {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
            </p>
          )}
          {submitted && (
            <div className="feedback mt-2">
              <span>Was this question good? </span>
              <button onClick={() => handleFeedback(q.question, 'good')} disabled={feedbackSent[`${q.question}-good`]}>👍</button>
              <button onClick={() => handleFeedback(q.question, 'bad')} disabled={feedbackSent[`${q.question}-bad`]}>👎</button>
            </div>
          )}
        </div>
      ))}

      {!submitted && (
        <button
          className="submit-btn px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleSubmit}
        >
          Submit Quiz
        </button>
      )}

      {submitted && (
        <div ref={resultsRef} className="results p-4 border rounded mt-4 bg-gray-100">
          <h3 className="font-bold text-lg">Results</h3>
          <p>
            Score: {score} / {quiz.questions.length} (
            {((score / quiz.questions.length) * 100).toFixed(1)}%)
          </p>
          {isSaving && <p>Saving session...</p>}
        </div>
      )}
    </div>
  );
}
