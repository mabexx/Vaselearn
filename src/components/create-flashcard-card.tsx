
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CreateFlashcardCardProps {
  collectionId: string;
}

export default function CreateFlashcardCard({ collectionId }: CreateFlashcardCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateFlashcard = async () => {
    if (!question || !answer) {
      setError('Please fill in both question and answer.');
      return;
    }
    if (!user || !collectionId) {
      setError('Cannot create flashcard. User or collection not specified.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await addDoc(collection(firestore, 'users', user.uid, 'customFlashcards'), {
        question,
        answer,
        collectionId,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
      setQuestion('');
      setAnswer('');
    } catch (err) {
      setError('Failed to create flashcard. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Create a New Flashcard</h2>
        <div className="w-full space-y-2">
          <Label htmlFor="question">Question</Label>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question here..."
            className="min-h-[100px]"
          />
        </div>
        <div className="w-full space-y-2">
          <Label htmlFor="answer">Answer</Label>
          <Textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter the answer here..."
            className="min-h-[100px]"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button onClick={handleCreateFlashcard} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Flashcard'}
        </Button>
      </CardContent>
    </Card>
  );
}
