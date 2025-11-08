
'use client';

import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ThumbsDown, ThumbsUp, CalendarIcon, TagIcon, FilterIcon } from 'lucide-react';
import { Mistake } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SortOption = 'createdAt' | 'subject';

export default function MistakeVaultPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');

  const mistakesCollection = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const sortedMistakes = useMemo(() => {
    if (!mistakes) return [];
    const sorted = [...mistakes];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'subject':
          const tagA = a.tags?.[0] || '';
          const tagB = b.tags?.[0] || '';
          return tagA.localeCompare(tagB);
        case 'createdAt':
        default:
          return (b.createdAt.seconds - a.createdAt.seconds);
      }
    });
    return sorted;
  }, [mistakes, sortBy]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Mistake Vault</CardTitle>
          <CardDescription>
            Review questions you've previously answered incorrectly.
          </CardDescription>
        </div>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-10 h-10 p-0">
            <FilterIcon className="h-4 w-4 mx-auto" />
            <span className="sr-only">Sort mistakes</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Sort by Date</span>
              </div>
            </SelectItem>
            <SelectItem value="subject">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                <span>Sort by Subject</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
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
                    <div className="text-left w-full">
                      <p className="font-semibold">{mistake.question}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">Topic: {mistake.topic}</Badge>
                        <Badge variant="secondary">Difficulty: {mistake.difficulty}</Badge>
                        {mistake.tags && mistake.tags.map(tag => <Badge key={tag} variant="default">{tag}</Badge>)}
                      </div>
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
