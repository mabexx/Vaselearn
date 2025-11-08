'use client';

import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import QuizComponentInner from './QuizComponentInner';

function QuizContent() {
  const searchParams = useSearchParams();

  const topic = searchParams ? searchParams.get('topic') || 'default-topic' : 'default-topic';
  const limit = searchParams ? Number(searchParams.get('limit')) || 5 : 5;
  const clientType = searchParams ? searchParams.get('clientType') || 'default' : 'default';
  const questionType = searchParams ? searchParams.get('questionType') || 'mixed' : 'mixed';
  const modelId = searchParams ? searchParams.get('model') || 'gemini-2.5-flash' : 'gemini-2.5-flash';

  return (
    <QuizComponentInner
      topic={topic}
      limit={limit}
      clientType={clientType}
      questionType={questionType}
      modelId={modelId}
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
