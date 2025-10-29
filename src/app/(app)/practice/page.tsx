
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subjects } from '@/lib/subjects';
import { difficulties } from '@/lib/difficulties';

export default function PracticePage() {
  const [customQuestion, setCustomQuestion] = useState('');
  const [subject, setSubject] = useState(subjects[0].value);
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [difficulty, setDifficulty] = useState(difficulties[2].value);
  const [numQuestions, setNumQuestions] = useState(5);
  const [model, setModel] = useState('gemma-27b');
  const router = useRouter();

  const handleStartQuiz = () => {
    const params = new URLSearchParams({
      topic: customQuestion || subject,
      questionType,
      difficulty,
      limit: numQuestions.toString(),
      model,
    });
    router.push(`/practice/quiz?${params.toString()}`);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create a New Quiz</CardTitle>
          <CardDescription>Customize your quiz for your students.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customQuestion">Custom Question (optional)</Label>
            <Input
              id="customQuestion"
              placeholder="Enter a specific topic, e.g., 'The Battle of Hastings'"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              list="subject-suggestions"
            />
            <datalist id="subject-suggestions">
              {subjects.map((s) => (
                <option key={s.value} value={s.label} />
              ))}
            </datalist>
          </div>

          <hr />

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
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
                {difficulties.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numQuestions">Number of Questions</Label>
            <Input
              id="numQuestions"
              type="number"
              min="2"
              max="30"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemma-27b">Gemma 27B</SelectItem>
                <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartQuiz} disabled={!customQuestion && !subject}>
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
