
'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import { Mistake } from '@/lib/types';
import FlippableFlashcard from '@/components/FlippableFlashcard';

export default function FlashcardsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  // Newest mistakes first
  const sortedMistakes = useMemo(() => {
    if (!mistakes) return [];
    return [...mistakes].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [mistakes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Flashcards</h1>
        <p className="text-gray-400">
          Review your mistakes. Click a card to flip it and see the correct answer.
        </p>
      </div>

      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl bg-gray-800" />
            ))}
          </div>
        ) : !sortedMistakes || sortedMistakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-gray-400 p-12 bg-gray-800 border border-gray-700 rounded-xl">
            <ShieldAlert className="h-16 w-16 mb-4 text-gray-500" />
            <p className="font-semibold text-white">No flashcards found!</p>
            <p className="text-sm">When you get questions wrong in quizzes, they'll automatically turn into flashcards here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedMistakes.map((mistake) => (
              <FlippableFlashcard
                key={mistake.id}
                question={mistake.question}
                answer={mistake.correctAnswer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
