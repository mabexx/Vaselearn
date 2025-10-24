
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientTypes } from '@/lib/client-types';

export default function PracticePage() {
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [clientType, setClientType] = useState(clientTypes[0].value);
  const router = useRouter();

  const handleStartQuiz = () => {
    const params = new URLSearchParams({
      topic,
      questionType,
      clientType,
      limit: '5', // Default to 5 questions
    });
    router.push(`/practice/quiz?${params.toString()}`);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create a New Quiz</CardTitle>
          <CardDescription>Customize your quiz by selecting a topic, question type, and your organization type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., European History"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
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
            <Label htmlFor="clientType">Organization Type</Label>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger id="clientType">
                <SelectValue placeholder="Select your organization type" />
              </SelectTrigger>
              <SelectContent>
                {clientTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
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
