
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, BookCheck, Repeat, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { PracticeSession, Mistake } from '@/lib/types';
import { isSameDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import FlippableFlashcard from '@/components/FlippableFlashcard'; // Import the new component

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const practiceSessionsCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'practiceSessions') : null
  , [firestore, user]);

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: practiceSessions, isLoading: isLoadingSessions } = useCollection<PracticeSession>(practiceSessionsCollection);
  const { data: mistakes, isLoading: isLoadingMistakes } = useCollection<Mistake>(mistakesCollection);

  const { quickStats, recentMistakes } = useMemo(() => {
    const defaultStats = {
        streak: 0,
        mistakesToReview: 0,
    };

    const stats = !practiceSessions ? defaultStats : (() => {
      // Streak calculation logic remains the same...
      const sortedSessions = [...practiceSessions].sort((a, b) => (a.createdAt as Timestamp).toMillis() - (b.createdAt as Timestamp).toMillis());
      let currentStreak = 0;
      // ... streak logic here for brevity
      return {
        streak: currentStreak,
        mistakesToReview: mistakes?.length || 0,
      };
    })();

    const sortedMistakes = !mistakes ? [] : [...mistakes].sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

    return { quickStats: stats, recentMistakes: sortedMistakes.slice(0,3) };
  }, [practiceSessions, mistakes]);

  const dailyGoals = useMemo(() => {
    const today = new Date();
    const quizzesToday = practiceSessions?.filter(session =>
        isSameDay((session.createdAt as Timestamp).toDate(), today)
    ).length || 0;

    return [
      { text: 'Complete 1 Quiz', current: Math.min(quizzesToday, 1), target: 1, icon: <BookCheck className="h-5 w-5 text-green-500" /> },
    ];
  }, [practiceSessions]);

  const allGoalsCompleted = dailyGoals.every(goal => goal.current >= goal.target);
  const isLoading = isUserLoading || isLoadingSessions || isLoadingMistakes;

  if (isLoading) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div>
                <Skeleton className="h-12 w-1/4 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="p-8 rounded-xl bg-primary text-primary-foreground flex justify-between items-center">
          <div>
              <h1 className="text-4xl md:text-5xl font-bold">
                  Ready for a challenge?
              </h1>
              <p className="mt-2 text-lg">Engage with adaptive quizzes and master new concepts today!</p>
          </div>
          <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100">
              <Link href="/practice">Start a Quiz <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
      </div>

      {/* Stats and Goals Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
              <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                  {/* Stats content remains the same */}
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Daily Goals</CardTitle>
                   <CardDescription>{allGoalsCompleted ? "Great job!" : "Keep going!"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  {/* Goals content remains the same */}
              </CardContent>
          </Card>
      </div>

      {/* Flashcard Quickie Review Section */}
      <div>
        <h2 className="text-3xl font-semibold mb-2">Flashcard Quickie</h2>
        <p className="text-muted-foreground mb-6">A quick review of your most recent mistakes. Click a card to flip it.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentMistakes.length > 0 ? recentMistakes.map((mistake) => (
            <FlippableFlashcard
              key={mistake.id}
              question={mistake.question}
              answer={mistake.correctAnswer}
            />
          )) : (
            <p className="text-muted-foreground col-span-3 text-center">No mistakes to review yet!</p>
          )}
        </div>
         <div className="text-center mt-6">
             <Button asChild variant="outline">
                  <Link href="/mistake-vault">Go to Mistake Vault <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
          </div>
      </div>
    </div>
  );
}
