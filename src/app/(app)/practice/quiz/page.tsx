'use client';

import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import QuizComponentInner from './QuizComponentInner';

function QuizContent() {
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

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading quiz...</div>}>
      <QuizContent />
    </Suspense>
  );
}
