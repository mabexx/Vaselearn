
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import { Mistake } from '@/lib/types';
import FlippableFlashcard from '@/components/FlippableFlashcard';
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';

export default function FlashcardsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const sortedMistakes = useMemo(() => {
    if (!mistakes) return [];
    return [...mistakes].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [mistakes]);

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  const scrollPrev = useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = useCallback(() => {
    api?.scrollNext()
  }, [api])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Skeleton className="h-96 w-full max-w-2xl rounded-xl bg-gray-800" />
        <Skeleton className="h-8 w-24 mt-4 bg-gray-800" />
      </div>
    );
  }

  if (!sortedMistakes || sortedMistakes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-400 p-12 bg-gray-800 border border-gray-700 rounded-xl h-[70vh]">
        <ShieldAlert className="h-16 w-16 mb-4 text-gray-500" />
        <p className="font-semibold text-white">No flashcards found!</p>
        <p className="text-sm">When you get questions wrong in quizzes, they'll automatically turn into flashcards here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-[80vh] space-y-4">
        <h1 className="text-3xl font-bold text-center">Flashcard Review</h1>
        <p className="text-gray-400 text-center mb-4">
            Reviewing {sortedMistakes.length} mistakes from your vault.
        </p>
      <Carousel setApi={setApi} className="w-full max-w-2xl" orientation="horizontal">
        <CarouselContent className="-ml-4 h-96">
          {sortedMistakes.map((mistake) => (
            <CarouselItem key={mistake.id} className="pl-4">
              <div className="p-1 h-full">
                <FlippableFlashcard
                  question={mistake.question}
                  answer={mistake.correctAnswer}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex items-center justify-center w-full space-x-4 mt-4">
            <CarouselPrevious className="relative left-0 top-0 -translate-y-0 fill-white rounded-md border bg-card text-card-foreground shadow-sm hover:bg-card/80 p-2">
                <ArrowLeft className="h-6 w-6" />
            </CarouselPrevious>
            <div className="py-2 text-center text-sm text-muted-foreground">
                Card {current} of {count}
            </div>
            <CarouselNext className="relative right-0 top-0 -translate-y-0 fill-white rounded-md border bg-card text-card-foreground shadow-sm hover:bg-card/80 p-2">
                <ArrowRight className="h-6 w-6" />
            </CarouselNext>
        </div>
      </Carousel>
    </div>
  );
}
