'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function PracticeContent() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [questionType, setQuestionType] = useState('multiple-choice');
    
    // The new UI from main is simpler and does not have a client type selector.
    // I'll hardcode a default value to ensure the quiz generation can still work.
    const clientType = 'it-specialist';

    const handleStartQuiz = () => {
        if (!topic) return; // Basic validation

        const params = new URLSearchParams({
          topic,
          questionType,
          clientType,
          limit: '5', // Default to 5 questions
        });
        router.push(`/practice/quiz?${params.toString()}`);
    };

    return (
        <div className="flex flex-col items-center gap-8 py-8">
            <div className="w-full max-w-2xl text-center">
                <h1 className="text-3xl font-bold">Practice Room</h1>
                <p className="text-muted-foreground mt-2">
                    Generate a quiz on any topic to test your knowledge.
                </p>
            </div>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Create a New Quiz</CardTitle>
                    <CardDescription>Enter a topic and select a question type to begin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
                        <Input
                            id="topic"
                            placeholder="e.g., The Renaissance"
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
                </CardContent>
                <CardFooter>
                    <Button onClick={handleStartQuiz} className="w-full" disabled={!topic}>
                        Start Quiz
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Loading practice page...</p>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}
