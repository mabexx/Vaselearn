
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QuizComponentInner from './QuizComponentInner';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { Mistake } from '@/lib/types';

function ExactRetakeQuizLoader() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const mistakeIds = searchParams.get('ids')?.split(',') || [];
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMistakes = async () => {
      if (!user || mistakeIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const mistakesRef = collection(firestore, `users/${user.uid}/mistakes`);
        const fetchedMistakes: Mistake[] = [];

        // Firestore 'in' queries are limited to 30 items. Chunk the requests.
        for (let i = 0; i < mistakeIds.length; i += 30) {
          const chunk = mistakeIds.slice(i, i + 30);
          if (chunk.length > 0) {
            const q = query(mistakesRef, where(documentId(), 'in', chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
              fetchedMistakes.push({ id: doc.id, ...doc.data() } as Mistake);
            });
          }
        }

        // Re-order based on the original mistakeIds array and transform data
        const orderedAndTransformedMistakes = mistakeIds
          .map(id => {
            const mistake = fetchedMistakes.find(m => m.id === id);
            if (!mistake) return null;
            // Add the 'type' field if it's missing, which was the root cause of the UI bug.
            // The 'answer' field is not needed here; QuizComponentInner handles it.
            return {
              ...mistake,
              type: mistake.type || 'multiple_choice', // Fallback for older data
            };
          })
          .filter((m): m is Mistake => m !== null);

        setMistakes(orderedAndTransformedMistakes);
      } catch (error) {
        console.error("Failed to fetch mistakes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMistakes();
  }, [user, firestore, mistakeIds.join(',')]); // Depend on joined string to prevent re-renders

  if (loading) {
    return <div>Loading retake quiz...</div>;
  }

  return <QuizComponentInner retakeMistakes={mistakes} />;
}

function QuizPageContent() {
  const searchParams = useSearchParams();
  const retakeType = searchParams.get('retake');

  if (retakeType === 'exact') {
    return <ExactRetakeQuizLoader />;
  }

  const topic = searchParams.get('topic') || (retakeType === 'similar' ? 'Similar Questions Practice' : '');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const clientType = searchParams.get('clientType') || 'Student';
  const questionType = searchParams.get('questionType') || 'multiple-choice';
  const difficulty = searchParams.get('difficulty') || 'neutral';
  const modelId = searchParams.get('model') || 'gemini-2.5-flash-lite';

  return (
    <QuizComponentInner
      topic={topic}
      limit={limit}
      clientType={clientType}
      questionType={questionType}
      difficulty={difficulty}
      modelId={modelId}
      context={searchParams.get('context') || ''}
    />
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div>Loading quiz...</div>}>
      <QuizPageContent />
    </Suspense>
  );
}
