'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, writeBatch, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import * as webllm from '@mlc-ai/web-llm';
import { ModelType } from '@mlc-ai/web-llm';
import clientsData from '@/lib/vls-clients.json';
import { QuizQuestion, Answer, PracticeSession, QuizFeedback, VLSClient } from '@/lib/types';

const DB_NAME = "mlc_models_db";
const STORE_NAME = "models";

// --- IndexedDB helpers
async function saveModelToDB(modelId: string, buffer: ArrayBuffer): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return new Promise((resolve, reject) => {
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

// --- Prompt generation
function getPrompt(client: VLSClient, topic: string, numQuestions: number, questionType: string, previousQuestions: string[]) {
  const questionTypeInstruction = questionType && questionType !== 'mixed'
    ? `The question "type" must be exactly "${questionType}". Do not use any other type.`
    : `The question "type" should be varied and selected from the following list: [${client.question_generation.style.join(', ')}]. Do not use types not in this list.`;

  const historyInstruction = previousQuestions.length
    ? `You MUST NOT repeat the following questions:\n${previousQuestions.map(q => `- ${q}`).join('\n')}`
    : "This is the first quiz on this topic.";

  return `
    ${client.instruction.system_prompt}
    You are generating a quiz for the topic "${topic}".
    Context: ${client.instruction.context}
    Tone: ${client.instruction.tone}.

    Generate a JSON object for a quiz with exactly ${numQuestions} questions.
    ${questionTypeInstruction}
    ${historyInstruction}

    Output must be a valid JSON object with a "questions" array. Question schemas:

    1. "multiple_choice": { "question": string, "options": string[4], "answer": string }
    2. "true_false": { "question": string, "answer": boolean }
    3. "matching_pairs": { "question": string, "pairs": [{prompt: string, match: string} x4], "answer": string[] }
    4. "case_based": { "question": string, "prompt": string, "answer": string }

    Output must be JSON only.
  `;
}

// --- Component
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

  const [quiz, setQuiz] = useState<{ questions: QuizQuestion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AI Engine...");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [score, setScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'good' | 'bad'>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  // --- Fetch quiz
  useEffect(() => {
    if (!user || !firestore) return;

    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        setLoadingMessage("Fetching learning history...");
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const q = query(sessionsCollection, where("topic", "==", topic));
        const querySnapshot = await getDocs(q);

        const previousQuestions: string[] = [];
        querySnapshot.forEach(doc => {
          const session = doc.data() as PracticeSession;
          session.questions.forEach(q => previousQuestions.push(q.question));
        });

        const client = clientsData.clients.find(c => c.client_type === clientType);
        if (!client) throw new Error("Invalid client profile.");

        const prompt = getPrompt(client, topic, limit, questionType, previousQuestions);

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

        const modelFile = new File([modelBuffer], "model.gguf", { type: "application/octet-stream" });

        setLoadingMessage("Initializing AI engine...");
        const engine = await webllm.CreateMLCEngine(modelId, {
          model_list: [{ local_id: modelId, model_type: ModelType.LLM, required_features: ["shader-f16"], file: modelFile }],
          initProgressCallback: progress => setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`),
        });

        setLoadingMessage("Generating quiz...");
        const reply = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_gen_len: 2048,
          response_format: { type: "json_object" },
        });

        const jsonResponse = reply.choices?.[0]?.message?.content;
        if (!jsonResponse) throw new Error("AI model did not return a response.");

        setQuiz(JSON.parse(jsonResponse));
      } catch (err: any) {
        console.error(err);
        setError("Failed to generate quiz. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [topic, limit, clientType, questionType, user, firestore]);

  const handleAnswerSelect = (questionIndex: number, answer: Answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleFeedback = async (questionText: string, rating: 'good' | 'bad') => {
    if (!user || !firestore || feedbackSent[`${questionText}-${rating}`]) return;
    setFeedbackSent(prev => ({ ...prev, [`${questionText}-${rating}`]: rating }));

    const feedbackCollection = collection(firestore, 'feedback');
    const feedbackData: Omit<QuizFeedback, 'id'> = { userId: user.uid, question: questionText, rating, topic, createdAt: serverTimestamp() };
    await addDocumentNonBlocking(feedbackCollection, feedbackData);
  };

  const isAnswerCorrect = (question: QuizQuestion, userAnswer: Answer): boolean => {
    if (userAnswer === undefined || userAnswer === null) return false;
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false': return userAnswer === question.answer;
      case 'matching_pairs':
        if (!Array.isArray(userAnswer) || !Array.isArray(question.answer)) return false;
        if (userAnswer.length !== question.answer.length) return false;
        return userAnswer.every((val, idx) => val === question.answer[idx]);
      case 'case_based': return true;
      default: return false;
    }
  };

 const handleSubmit = async () => {
    if (!quiz || !user || !firestore) return;

    let calculatedScore = 0;
    quiz.questions.forEach((q, idx) => {
      if (isAnswerCorrect(q, answers[idx])) calculatedScore += 1;
    });
    setScore(calculatedScore);

    setIsSaving(true);
    try {
      const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
      const sessionData: Omit<PracticeSession, 'id'> = {
        topic,
        questions: quiz.questions.map((q, idx) => ({
          ...q,
          userAnswer: answers[idx] ?? null,
        })),
        score: calculatedScore,
        createdAt: serverTimestamp(),
      };
      await addDoc(sessionsCollection, sessionData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // --- Render
  if (loading) return <div>{loadingMessage}</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!quiz) return <div>No quiz available.</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{topic} Quiz</h2>
      {quiz.questions.map((q, idx) => (
        <div key={idx} className="mb-6 p-4 border rounded">
          <p className="font-semibold">{idx + 1}. {q.question}</p>

          {/* Multiple choice */}
          {q.type === 'multiple_choice' && q.options?.map((opt, i) => (
            <button
              key={i}
              className={`block mt-2 p-2 border rounded ${answers[idx] === opt ? 'bg-blue-200' : ''}`}
              onClick={() => handleAnswerSelect(idx, opt)}
            >
              {opt}
            </button>
          ))}

          {/* True/False */}
          {q.type === 'true_false' && [true, false].map(val => (
            <button
              key={String(val)}
              className={`block mt-2 p-2 border rounded ${answers[idx] === val ? 'bg-blue-200' : ''}`}
              onClick={() => handleAnswerSelect(idx, val)}
            >
              {String(val)}
            </button>
          ))}

          {/* Matching pairs */}
          {q.type === 'matching_pairs' && q.pairs?.map((pair, i) => (
            <div key={i} className="mt-2">
              <span>{pair.prompt}</span> - <input
                type="text"
                value={Array.isArray(answers[idx]) ? (answers[idx] as string[])[i] ?? '' : ''}
                onChange={e => {
                  const newArr = Array.isArray(answers[idx]) ? [...(answers[idx] as string[])] : [];
                  newArr[i] = e.target.value;
                  handleAnswerSelect(idx, newArr);
                }}
                className="border p-1 rounded ml-2"
              />
            </div>
          ))}

          {/* Case-based */}
          {q.type === 'case_based' && (
            <textarea
              className="w-full mt-2 p-2 border rounded"
              value={answers[idx] || ''}
              onChange={e => handleAnswerSelect(idx, e.target.value)}
            />
          )}

          {/* Feedback */}
          <div className="mt-2 flex gap-2">
            <button onClick={() => handleFeedback(q.question, 'good')} disabled={feedbackSent[`${q.question}-good`]} className="bg-green-200 p-1 rounded">👍</button>
            <button onClick={() => handleFeedback(q.question, 'bad')} disabled={feedbackSent[`${q.question}-bad`]} className="bg-red-200 p-1 rounded">👎</button>
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={isSaving}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isSaving ? 'Saving...' : 'Submit Quiz'}
      </button>

      {/* Results */}
      {score > 0 && (
        <div ref={resultsRef} className="mt-6 p-4 border rounded bg-gray-100">
          <h3 className="font-bold text-lg">Your Score: {score} / {quiz.questions.length}</h3>
        </div>
      )}
    </div>
  );
}
