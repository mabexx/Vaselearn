
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subjects } from '@/lib/subjects';

export default function PracticePage() {
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('neutral');
  const [model, setModel] = useState('gemma-27b');
  const router = useRouter();

  const handleStartQuiz = () => {
    const params = new URLSearchParams({
      topic,
      questionType,
      difficulty,
      model,
      limit: '5', // Default to 5 questions
    });
    router.push(`/practice/quiz?${params.toString()}`);
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
            <Label htmlFor="subject">Subjects (optional)</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select a subject</SelectItem>
                {subjects.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
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
