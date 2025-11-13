
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuizComponentInner from './QuizComponentInner';

function QuizPageContent() {
  const searchParams = useSearchParams();
  const retake = searchParams.get('retake');

  const topic = searchParams.get('topic') || (retake ? 'Retake Quiz' : '');
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
