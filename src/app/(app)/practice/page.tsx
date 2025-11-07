
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from '@/firebase';
import { getApiKey } from '@/lib/aistudio';

export default function PracticePage() {
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [difficulty, setDifficulty] = useState('neutral');
  const [model, setModel] = useState('gemma-27b');
  const [questionsAmount, setQuestionsAmount] = useState('10');
  const [questionsAmountError, setQuestionsAmountError] = useState('');
  const router = useRouter();
  const { user } = useUser();

  const handleStartQuiz = async () => {
    if (!user) {
      // Handle user not logged in
      return;
    }

    const amount = parseInt(questionsAmount, 10);
    if (isNaN(amount) || amount < 2 || amount > 30) {
      setQuestionsAmountError('only 2 upto 30 is allowed for performance issues');
      return;
    }
    setQuestionsAmountError('');

    const apiKey = await getApiKey(user.uid);

    const params = new URLSearchParams({
      topic,
      questionType,
      difficulty,
      model,
      limit: questionsAmount,
    });

    if (apiKey) {
      router.push(`/practice/quiz?${params.toString()}`);
    } else {
      router.push(`/practice/connect?${params.toString()}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create a New Quiz</CardTitle>
          <CardDescription>Customize your quiz by selecting a topic, question type, and other options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., The Mitochondrion"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="questionType">Question Type</Label>
            <Select value={questionType} onValueChange={setQuestionType}>
              <SelectTrigger id="questionType">
                <SelectValue placeholder="Select a question type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="true-false">True/False</SelectItem>
                <SelectItem value="case-based">Case-Based (Short Answer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select a difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="very-easy">Very Easy</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="very-hard">Very Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemma-27b">Gemma 27B (Recommended)</SelectItem>
                <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash lite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="questionsAmount">Questions Amount</Label>
            <Input
              id="questionsAmount"
              type="number"
              value={questionsAmount}
              onChange={(e) => {
                setQuestionsAmount(e.target.value);
                if (questionsAmountError) {
                  setQuestionsAmountError('');
                }
              }}
              className={questionsAmountError ? 'border-red-500' : ''}
            />
            {questionsAmountError && <p className="text-sm text-red-500">{questionsAmountError}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartQuiz} disabled={!topic}>
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
