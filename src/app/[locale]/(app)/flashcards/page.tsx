
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Layers, ArrowRight } from 'lucide-react';
import Flashcard from '@/components/flashcard';
import { Mistake } from '@/lib/types';
import Link from 'next/link';

export default function FlashcardsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const mistakesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'mistakes') : null),
    [firestore, user]
  );

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const shuffledMistakes = useMemo(() => {
    if (!mistakes) return [];
    return [...mistakes].sort(() => Math.random() - 0.5);
  }, [mistakes]);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
         <div className="space-y-2 mb-8">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-64 w-full" />
         <div className="flex items-center justify-center gap-4 mt-8">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (!shuffledMistakes || shuffledMistakes.length === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center text-center p-12">
          <Layers className="h-16 w-16 mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">No Flashcards to Review</h2>
          <p className="mt-2 text-muted-foreground">
            Your flashcards are automatically created from mistakes you make in quizzes. Take a quiz to get started!
          </p>
          <Button asChild className="mt-6">
            <Link href="/practice">Take a Quiz <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Flashcard Review</h1>
            <p className="text-muted-foreground">Reviewing {shuffledMistakes.length} mistake{shuffledMistakes.length > 1 && 's'} from your vault.</p>
        </div>
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {shuffledMistakes.map((mistake) => (
            <CarouselItem key={mistake.id}>
              <Flashcard question={mistake.question} answer={mistake.correctAnswer} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
      <div className="py-4 text-center text-sm text-muted-foreground">
        Card {current} of {count}
      </div>
    </div>
  );
}
