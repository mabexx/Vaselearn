
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
      };
      const mistakesRef = collection(firestore, `users/${user.uid}/mistakes`);
      // Firestore 'in' queries are limited to 10 items. For a more robust
      // solution, we might need to batch these requests. For now, we'll
      // assume the user won't select more than 10.
      const q = query(mistakesRef, where(documentId(), 'in', mistakeIds));
      const querySnapshot = await getDocs(q);
      const fetchedMistakes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mistake));
      setMistakes(fetchedMistakes);
      setLoading(false);
    };

    fetchMistakes();
  }, [user, firestore, mistakeIds]);

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
