'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { getApiKey } from '@/lib/aistudio';
import { useRouter } from 'next/navigation';
import QuizComponentInner from './QuizComponentInner';

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const topic = searchParams ? searchParams.get('topic') || 'default-topic' : 'default-topic';
  const limit = searchParams ? Number(searchParams.get('limit')) || 5 : 5;
  const clientType = searchParams ? searchParams.get('clientType') || 'default' : 'default';
  const questionType = searchParams ? searchParams.get('questionType') || 'mixed' : 'mixed';

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait for user to be loaded
    }
    if (!user) {
      router.push('/login'); // Redirect if not logged in
      return;
    }

    const fetchKey = async () => {
      const key = await getApiKey(user.uid);
      if (!key) {
        // If no key, redirect to connect, preserving the quiz params
        const params = new URLSearchParams(searchParams);
        router.push(`/practice/connect?${params.toString()}`);
      } else {
        setApiKey(key);
        setLoading(false);
      }
    };

    fetchKey();
  }, [user, isUserLoading, router, searchParams]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading quiz...</div>;
  }

  if (!apiKey) {
    // This state can be reached briefly before the redirect happens
    return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }

  return (
    <QuizComponentInner
      topic={topic}
      limit={limit}
      clientType={clientType}
      questionType={questionType}
      apiKey={apiKey}
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
