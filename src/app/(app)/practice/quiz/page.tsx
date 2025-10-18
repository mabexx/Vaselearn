// src/app/(app)/practice/quiz/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import QuizComponentInner from './QuizComponentInner';

export default function QuizPage() {
  const searchParams = useSearchParams();

  const topic = searchParams.get('topic') || 'default-topic';
  const limit = Number(searchParams.get('limit')) || 5;
  const clientType = searchParams.get('clientType') || 'default';
  const questionType = searchParams.get('questionType') || 'mixed';

  return (
    <QuizComponentInner
      topic={topic}
      limit={limit}
      clientType={clientType}
      questionType={questionType}
    />
  );
}
