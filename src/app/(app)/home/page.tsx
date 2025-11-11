
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Book, BrainCircuit, LayoutDashboard, Target, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { PracticeSession, Mistake } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import FlippableFlashcard from '@/components/FlippableFlashcard';
import { isSameDay } from 'date-fns';

const StatCard = ({ title, value, progress, color }: { title: string; value: string | number; progress: number, color: string }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-400">{title}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
    <Progress value={progress} className="h-2" indicatorClassName={color} />
  </div>
);

const ToolCard = ({ title, href, icon }: { title: string; href: string; icon: React.ReactNode }) => (
  <Link href={href} className="block bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-center transition-colors">
    <div className="flex justify-center items-center mb-2">
      {icon}
    </div>
    <span className="text-sm font-medium">{title}</span>
  </Link>
)

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
        completionRate: 0,
        averageScore: 0,
        studyStreak: 0,
    };

    if (!practiceSessions || practiceSessions.length === 0) {
      return { quickStats: defaultStats, recentMistakes: [] };
    }

    const totalSessions = practiceSessions.length;
    const totalScore = practiceSessions.reduce((acc, session) => acc + session.score, 0);
    const averageScore = Math.round(totalScore / totalSessions);
    const completionRate = averageScore;

    const sortedSessions = [...practiceSessions].sort((a, b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
    let streak = 0;
    if (sortedSessions.length > 0) {
        streak = 1;
        let lastDate = (sortedSessions[0].createdAt as Timestamp).toDate();
        for (let i = 1; i < sortedSessions.length; i++) {
            const currentDate = (sortedSessions[i].createdAt as Timestamp).toDate();
            const nextDay = new Date(lastDate);
            nextDay.setDate(nextDay.getDate() - 1);
            if (isSameDay(currentDate, nextDay)) {
                streak++;
                lastDate = currentDate;
            } else if (!isSameDay(currentDate, lastDate)) {
                break;
            }
        }
    }

    const sortedMistakes = !mistakes ? [] : [...mistakes].sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

    return {
      quickStats: {
        completionRate,
        averageScore,
        studyStreak: streak,
      },
      recentMistakes: sortedMistakes.slice(0, 3)
    };
  }, [practiceSessions, mistakes]);

  const isLoading = isUserLoading || isLoadingSessions || isLoadingMistakes;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      <div className="p-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 flex justify-between items-center">
          <div>
              <h2 className="text-2xl font-bold">Ready for a Challenge?</h2>
              <p className="mt-1 text-purple-200">Select a subject and difficulty to start a new quiz.</p>
          </div>
          <Button asChild size="lg" className="bg-white text-purple-700 hover:bg-gray-200 font-bold">
              <Link href="/practice">Start Quiz</Link>
          </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="bg-gray-900 border-gray-700 col-span-1">
              <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>A visual overview of your recent performance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatCard title="Completion Rate" value={`${quickStats.completionRate}%`} progress={quickStats.completionRate} color="bg-green-500" />
                <StatCard title="Average Score" value={`${quickStats.averageScore}%`} progress={quickStats.averageScore} color="bg-purple-500" />
                <StatCard title="Study Streak" value={`${quickStats.studyStreak} Days`} progress={(quickStats.studyStreak / 7) * 100} color="bg-yellow-500" />
              </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700 col-span-1 lg:col-span-2">
              <CardHeader>
                  <CardTitle>Flashcards</CardTitle>
                  <CardDescription>A quick review of your most recent mistakes. Click a card to flip it.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentMistakes.length > 0 ? recentMistakes.map((mistake) => (
                  <FlippableFlashcard
                    key={mistake.id}
                    question={mistake.question}
                    answer={mistake.correctAnswer}
                  />
                )) : (
                  <p className="text-gray-400 col-span-3 text-center py-10">No mistakes to review yet!</p>
                )}
              </CardContent>
              <div className="p-6 text-center">
                <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-700">
                    <Link href="/flashcards">Go to Flashcards</Link>
                </Button>
              </div>
          </Card>
      </div>
       <Card className="bg-gray-900 border-gray-700 col-span-1">
          <CardHeader>
              <CardTitle>Explore Your Toolkit</CardTitle>
              <CardDescription>Discover tools designed to boost your learning.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ToolCard title="Dashboard" href="/dashboard" icon={<LayoutDashboard className="h-6 w-6 text-blue-400" />} />
              <ToolCard title="Practice" href="/practice" icon={<BrainCircuit className="h-6 w-6 text-green-400" />} />
              <ToolCard title="Goals" href="/goals" icon={<Target className="h-6 w-6 text-red-400" />} />
          </CardContent>
      </Card>
    </div>
  );
}
