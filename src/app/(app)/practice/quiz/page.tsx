'use client';

import { useSearchParams } from 'next/navigation';
import QuizComponentInner from './QuizComponentInner';

export default function QuizPage() {
  const searchParams = useSearchParams();

  // Read URL query parameters
  const topic = searchParams.get('topic') || 'default-topic';
  const limit = Number(searchParams.get('limit')) || 5;
  const clientType = searchParams.get('clientType') || 'default';
  const questionType = searchParams.get('questionType') || 'mixed';

  // Render the inner component with props
  return (
    <QuizComponentInner
      topic={topic}
      limit={limit}
      clientType={clientType}
      questionType={questionType}
    />
  );
}
