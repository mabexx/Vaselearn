
'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Mistake } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function MistakeVaultPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const mistakesCollection = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const sortedMistakes = useMemo(() => {
    if (!mistakes) return [];
    return [...mistakes].sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
  }, [mistakes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mistake Vault</CardTitle>
        <CardDescription>
          Review questions you've previously answered incorrectly. Mistakes are automatically added here when you complete a quiz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !sortedMistakes || sortedMistakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
            <ShieldAlert className="h-16 w-16 mb-4" />
            <p className="font-semibold">No mistakes found!</p>
            <p className="text-sm">When you get questions wrong in quizzes, they'll appear here for you to review.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {sortedMistakes.map((mistake) => (
              <AccordionItem key={mistake.id} value={mistake.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <div className="text-left">
                      <p className="font-semibold">{mistake.question}</p>
                      <div className="text-sm text-muted-foreground mt-1">Topic: <Badge variant="outline">{mistake.topic}</Badge></div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      <p>Your answer: {mistake.userAnswer}</p>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      <p>Correct answer: {mistake.correctAnswer}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
