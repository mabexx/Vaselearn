
'use client';

import { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, writeBatch, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import * as webllm from "@mlc-ai/web-llm";

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
        
        setLoadingMessage("Initializing AI model... This may take a minute on first load.");

        const modelId = "Qwen3-VL-1B-GGUF";
        const modelUrl = "https://huggingface.co/Novaciano/Qwen3-VL-1B-Merged-Q4_K_M-GGUF/resolve/main/qwen3-vl-1b-merged-q4_k_m.gguf?download=true";

        const engine = await webllm.CreateMLCEngine(modelId, { 
          initProgressCallback: (progress) => {
              setLoadingMessage(`Initializing AI model... ${Math.floor(progress.progress * 100)}%`);
          },
          appConfig: {
            model_list: [
              {
                "model_url": modelUrl,
                "local_id": modelId,
                "model_type": "llm",
                "required_features": ["shader-f16"],
              }
            ]
          }
        });
        
        setLoadingMessage("Generating new questions...");

        const reply = await engine.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_gen_len: 2048,
            response_format: { type: "json_object" },
        });
        
        const jsonResponse = reply.choices[0].message.content;

        if (!jsonResponse) {
            throw new Error("The AI model did not return a response. Please try again.");
        }

        const quizData = JSON.parse(jsonResponse);
        setQuiz(quizData);

      } catch (err: any) {
        setError('Failed to generate the quiz. The AI model may be too busy or the browser may not be supported. Please try again later.');
        console.error(err);
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
    setFeedbackSent(prev => ({...prev, [feedbackKey]: rating}));
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
              return userAnswer === question.answer;
          case 'true_false':
              return userAnswer === question.answer;
          case 'matching_pairs':
              if (!Array.isArray(userAnswer) || !Array.isArray(question.answer)) return false;
              if (userAnswer.length !== question.answer.length) return false;
              
              const correctMatches = question.pairs.map(p => p.match);

              // We need to compare the user's sorted options with the prompts' correct matches
              // The prompts are fixed, so we can rely on their order.
              // `question.answer` holds the correct matches in the right order.
              return userAnswer.every((val, index) => val === question.answer[index]);

          case 'case_based': // Subjective, just record, don't score
              return true; // Always considered "correct" for scoring purposes to not penalize user
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
            if (isCorrect) {
                newScore++;
            }
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
        if (!user) {
            throw new Error("User not authenticated");
        }
        const practiceSessionData: Omit<PracticeSession, 'id'> = {
            topic: topic,
            score: newScore,
            totalQuestions: quiz.questions.length,
            questions: answeredQuestions,
            userId: user.uid,
            createdAt: serverTimestamp(),
        };
        
        const sessionsCollection = collection(firestore, 'users', user.uid, 'practiceSessions');
        const sessionDocRef = await addDoc(sessionsCollection, practiceSessionData);
        
        const mistakesToSave = answeredQuestions.filter(q => !q.isCorrect && q.type !== 'case_based');
        if (mistakesToSave.length > 0) {
            const batch = writeBatch(firestore);
            const mistakesCollectionRef = collection(firestore, 'users', user.uid, 'mistakes');
  
            mistakesToSave.forEach(mistake => {
                const mistakeDoc = doc(mistakesCollectionRef);
                batch.set(mistakeDoc, {
                    question: mistake.question,
                    userAnswer: mistake.userAnswer,
                    correctAnswer: mistake.correctAnswer,
                    topic: topic,
                    userId: user.uid,
                    createdAt: serverTimestamp(),
                    practiceSessionId: sessionDocRef.id
                });
            });
            await batch.commit();
        }
  
    } catch (err: any) {
        console.error("Error saving quiz results:", err);
        setError("There was an error saving your results: " + err.message);
    } finally {
        setSubmitted(true);
        setIsSaving(false);
    }
  };
  
  const handleExportPdf = () => {
    const input = resultsRef.current;
    if (!input) {
      console.error("Results element not found for PDF export.");
      return;
    }

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      let width = pdfWidth;
      let height = width / ratio;

      if (height > pdfHeight) {
        height = pdfHeight;
      }
      
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const safeTopic = topic.replace(/[^a-zA-Z0-9]/g, '_');


      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, height);
      pdf.save(`quiz-results-${safeTopic}_${timestamp}.pdf`);
    });
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return <QuestionMultipleChoice question={currentQuestion} onAnswer={(answer) => handleAnswerSelect(currentQuestionIndex, answer)} userAnswer={answers[currentQuestionIndex] as string | undefined} />;
      case 'true_false':
        return <QuestionTrueFalse question={currentQuestion} onAnswer={(answer) => handleAnswerSelect(currentQuestionIndex, answer)} userAnswer={answers[currentQuestionIndex] as boolean | undefined} />;
      case 'matching_pairs':
          return <QuestionMatching question={currentQuestion} onAnswer={(answer) => handleAnswerSelect(currentQuestionIndex, answer)} userAnswer={answers[currentQuestionIndex] as string[] | undefined}/>;
      case 'case_based':
          return <QuestionCaseBased question={currentQuestion} onAnswer={(answer) => handleAnswerSelect(currentQuestionIndex, answer)} userAnswer={answers[currentQuestionIndex] as string | undefined}/>;
      default:
        return <p>Unsupported question type.</p>;
    }
  };

  if (loading) return <QuizSkeleton topic={topic} message={loadingMessage}/>;
  if (error) return <Alert variant="destructive" className="max-w-2xl mx-auto"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!quiz || quiz.questions.length === 0) return <Card className="w-full max-w-2xl mx-auto"><CardHeader><CardTitle>Quiz on {topic}</CardTitle></CardHeader><CardContent><p>Could not generate a quiz for this topic. Please try another one.</p></CardContent></Card>;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  const renderResults = () => {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
        <div className="max-w-3xl mx-auto w-full">
            <div ref={resultsRef} className="bg-card rounded-xl border p-6">
                <CardHeader className="text-center p-0 mb-6">
                    <h2 className="text-sm font-semibold text-muted-foreground">Quiz Complete!</h2>
                    <p className="text-lg text-muted-foreground">You scored</p>
                    <div className="relative w-40 h-40 mx-auto my-4">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle className="text-muted/20" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50"/>
                            <circle
                                className="text-primary"
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 42 * (percentage / 100)} ${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                                strokeDashoffset={2 * Math.PI * 42 * 0.25}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="42"
                                cx="50"
                                cy="50"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold">{percentage}%</span>
                            <span className="text-muted-foreground">{score}/{quiz.questions.length}</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Great Effort!</CardTitle>
                </CardHeader>
                
                <CardContent className="p-0">
                    <h3 className="text-lg font-semibold mb-4 text-center">Review Your Answers</h3>
                    <Accordion type="multiple" className="w-full">
                        {quiz.questions.map((q, index) => {
                            const userAnswer = answers[index];
                            const isCorrect = q.type === 'case_based' || isAnswerCorrect(q, userAnswer);

                            return (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-4 w-full">
                                            {isCorrect ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                                            <p className="flex-1 text-left">{q.question}</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-semibold">
                                                  <ThumbsDown className="h-4 w-4" /> Your Answer
                                                </div>
                                                <div className={cn("p-3 rounded-md text-sm border break-words", !isCorrect && q.type !== 'case_based' ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" : "bg-muted")}>
                                                    {userAnswer !== undefined ? <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(userAnswer, null, 2)}</pre> : <p>No answer</p>}
                                                </div>
                                            </div>
                                            {!isCorrect && q.type !== 'case_based' && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                                       <ThumbsUp className="h-4 w-4" /> Correct Answer
                                                    </div>
                                                    <div className="p-3 rounded-md text-sm bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 break-words">
                                                        <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(q.answer, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )}
                                             {q.type === 'case_based' && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                                        <FileText className="h-4 w-4" /> Suggested Answer
                                                    </div>
                                                     <div className="p-3 rounded-md text-sm bg-muted">
                                                        <p className="whitespace-pre-wrap font-sans">{String(q.answer)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                                            <span className="text-xs text-muted-foreground">Was this question helpful?</span>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback(q.question, 'good')} disabled={!!feedbackSent[`${q.question}-good`]}>
                                                <ThumbsUp className={cn("h-4 w-4", feedbackSent[`${q.question}-good`] && "text-green-500")} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback(q.question, 'bad')} disabled={!!feedbackSent[`${q.question}-bad`]}>
                                                <ThumbsDown className={cn("h-4 w-4", feedbackSent[`${q.question}-bad`] && "text-red-500")} />
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </div>
            
            <CardFooter className="mt-6 flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline">
                  <Link href="/practice"><RefreshCw className="mr-2 h-4 w-4" />Try another</Link>
                </Button>
                <Button onClick={handleExportPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button asChild>
                    <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />View Dashboard</Link>
                </Button>
            </CardFooter>
        </div>
    );
  };


  if (submitted) return renderResults();

  return (
    <Card className="w-full max-w-2xl mx-auto">
       <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" />Quiz on {topic}</CardTitle>
              <CardDescription>Question {currentQuestionIndex + 1} of {quiz.questions.length}</CardDescription>
            </div>
            <Badge variant="outline">{currentQuestion.type.replace(/_/g, ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="min-h-[300px]">
        {renderQuestion()}
      </CardContent>
      <CardFooter className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>Previous</Button>
         <div className="flex-1 mx-4">
            <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} />
        </div>
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Submit'}</Button>
        ) : (
          <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>Next</Button>
        )}
      </CardFooter>
    </Card>
  );
}

const QuizSkeleton = ({ topic, message }: { topic: string; message: string }) => (
  <Card className="w-full max-w-2xl mx-auto">
    <CardHeader>
      <Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/4" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-6 w-full" />
      <div className="space-y-2 pt-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-8 w-3/4" /></div>
      <div className="text-center text-muted-foreground pt-4">
        <p>Generating a quiz on "{topic}"...</p>
        <p className="text-sm">{message}</p>
        </div>
    </CardContent>
    <CardFooter className="flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></CardFooter>
  </Card>
);

function QuizPageContent() {
    const searchParams = useSearchParams();
    const topic = searchParams.get('topic') || 'General Knowledge';
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const clientType = searchParams.get('clientType') || 'VET_VTC';
    const questionType = searchParams.get('questionType') || 'mixed';
    return <QuizComponent topic={topic} limit={limit} clientType={clientType} questionType={questionType} />;
  }

export default function QuizPage() {
    return (
        <Suspense fallback={<QuizSkeleton topic="Loading..." message="Please wait..."/>}>
            <QuizPageContent />
        </Suspense>
    )
}
