
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PracticePage() {
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [difficulty, setDifficulty] = useState('neutral');
  const [questionsAmount, setQuestionsAmount] = useState('10');
  const [questionsAmountError, setQuestionsAmountError] = useState('');
  const router = useRouter();

  const handleStartQuiz = () => {
    const amount = parseInt(questionsAmount, 10);
    if (isNaN(amount) || amount < 2 || amount > 30) {
      setQuestionsAmountError('Only values between 2 and 30 are allowed.');
      return;
    }
    setQuestionsAmountError('');

    const params = new URLSearchParams({
      topic,
      questionType,
      difficulty,
      model: 'gemini-2.5-flash-lite',
      limit: questionsAmount,
    });
    router.push(`/practice/quiz?${params.toString()}`);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-xl p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Create a New Quiz</h1>
          <p className="text-gray-400 mt-2">Customize your quiz by selecting a topic, question type, and other options.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., The Mitochondrion"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              className="bg-gray-700 border-gray-600 placeholder-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="questionType">Question Type</Label>
            <Select value={questionType} onValueChange={setQuestionType}>
              <SelectTrigger id="questionType" className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select a question type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="true-false">True/False</SelectItem>
                <SelectItem value="case-based">Case-Based (Short Answer)</SelectItem>
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
                if (questionsAmountError) setQuestionsAmountError('');
              }}
              className={`bg-gray-700 border-gray-600 ${questionsAmountError ? 'border-red-500' : ''}`}
            />
             {questionsAmountError && <p className="text-sm text-red-500 mt-1">{questionsAmountError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty" className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select a difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                <SelectItem value="very-easy">Very Easy</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="very-hard">Very Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleStartQuiz} disabled={!topic} className="w-full btn-gradient font-bold text-lg py-6">
          Start Quiz
        </Button>
      </div>
    </div>
  );
}
