import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Mistake } from '@/lib/types';

export function useMistakes() {
  const { user } = useUser();
  const firestore = useFirestore();

  const mistakesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'mistakes') : null),
    [firestore, user]
  );

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const sortedMistakes = useMemo(() => {
    if (!mistakes) return [];
    return [...mistakes].sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
  }, [mistakes]);

  const shuffledMistakes = useMemo(() => {
    if (!mistakes) return [];
    return [...mistakes].sort(() => Math.random() - 0.5);
  }, [mistakes]);

  return {
    mistakes: sortedMistakes,
    shuffledMistakes,
    isLoading,
    totalMistakes: sortedMistakes.length,
  };
}
