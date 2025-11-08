
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, BookCheck, BrainCircuit, Lightbulb, Repeat, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { PracticeSession, Mistake } from '@/lib/types';
import { isSameDay, subDays, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const ICONS = {
  "Cellular Respiration": <BookCheck className="h-8 w-8 text-blue-500" />,
  "Calculus II": <BrainCircuit className="h-8 w-8 text-green-500" />,
  "Organic Chemistry": <Lightbulb className="h-8 w-8 text-purple-500" />,
};

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

  const { quickStats, mistakeVaultSubjects } = useMemo(() => {
    const now = new Date();
    const defaultStats = {
        streak: 0,
        mistakesToReview: 0,
    };

    const stats = !practiceSessions ? defaultStats : (() => {
      const sortedSessions = [...practiceSessions].sort((a, b) => (a.createdAt as Timestamp).toMillis() - (b.createdAt as Timestamp).toMillis());
      const practiceDays = new Set<string>();
      sortedSessions.forEach(session => {
          const sessionDate = (session.createdAt as Timestamp).toDate();
          practiceDays.add(sessionDate.toISOString().split('T')[0]);
      });

      let currentStreak = 0;
      if (practiceDays.size > 0) {
          const uniqueDays = Array.from(practiceDays).map(d => new Date(d)).sort((a,b) => b.getTime() - a.getTime());
          const todayOrYesterday = isSameDay(uniqueDays[0], now) || isSameDay(uniqueDays[0], subDays(now, 1));
          if (todayOrYesterday) {
              currentStreak = 1;
              for(let i=0; i < uniqueDays.length - 1; i++) {
                  const diff = differenceInDays(uniqueDays[i], uniqueDays[i+1]);
                  if (diff === 1) {
                      currentStreak++;
                  } else if (diff > 1) {
                      break;
                  }
              }
          }
      }
      return {
        streak: currentStreak,
        mistakesToReview: mistakes?.length || 0,
      };
    })();

    const subjects = !mistakes ? [] : (() => {
      const subjectMap = new Map<string, { count: number, example: string }>();
      mistakes.forEach(mistake => {
        const subject = mistake.tags?.[0] || 'General';
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, { count: 0, example: mistake.question });
        }
        subjectMap.get(subject)!.count++;
      });
      return Array.from(subjectMap.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 3)
              .map(([subject, data]) => ({ subject, ...data }));
    })();

    return { quickStats: stats, mistakeVaultSubjects: subjects };
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
                <Skeleton className="h-48 w-full" />
                <div className="mt-8">
                    <Skeleton className="h-12 w-1/4 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-8">
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

        {/* Mistake Vault Section */}
        <div>
          <h2 className="text-3xl font-semibold mb-2">Mistake Vault</h2>
          <p className="text-muted-foreground mb-6">Review your previous incorrect answers to reinforce your learning.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mistakeVaultSubjects.map(({subject, example}, index) => (
              <Card key={index} className="flex flex-col text-center items-center p-6 hover:shadow-lg transition-shadow">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  {ICONS[subject as keyof typeof ICONS] || <BookCheck className="h-8 w-8 text-gray-500" />}
                </div>
                <CardTitle className="mb-2">{subject}</CardTitle>
                <CardDescription className="flex-grow">&quot;{example.substring(0, 50)}{example.length > 50 ? '...' : ''}&quot;</CardDescription>
              </Card>
            ))}
          </div>
           <div className="text-center mt-6">
               <Button asChild variant="outline">
                    <Link href="/mistake-vault">Go to Mistake Vault <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-8">
        {/* Quick Stats */}
        <Card>
            <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/10">
                    <div className="p-3 rounded-full bg-white">
                        <Repeat className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{quickStats.streak} Day{quickStats.streak !== 1 && 's'}</p>
                        <p className="text-sm text-muted-foreground">Current study streak</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                    <div className="p-3 rounded-full bg-white">
                        <Target className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{quickStats.mistakesToReview}</p>
                        <p className="text-sm text-muted-foreground">Mistakes to review</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Daily Goals */}
        <Card>
            <CardHeader>
                <CardTitle>Daily Goals</CardTitle>
                 <CardDescription>
                    {allGoalsCompleted ? "Great job! You've completed all your goals." : "Keep going, you're on the right track!"}
                 </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {dailyGoals.map((goal, index) => (
                    <div key={index}>
                         <div className="flex items-center gap-3 mb-2">
                            {goal.icon}
                            <p className="text-sm font-medium flex-1">{goal.text}</p>
                            <p className="text-sm text-muted-foreground">{goal.current}/{goal.target}</p>
                        </div>
                        <Progress value={(goal.current/goal.target)*100} />
                    </div>
                ))}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
