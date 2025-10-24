
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Dumbbell, Layers, ShieldAlert, ArrowRight, Repeat, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { PracticeSession, Mistake } from '@/lib/types';
import { isSameDay, subDays, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';


const featureCards = [
  {
    icon: Dumbbell,
    title: 'Adaptive Quizzes',
    description: 'Generate quizzes on any topic. Our AI adapts to your knowledge level.',
    href: '/practice',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    icon: Layers,
    title: 'Interactive Flashcards',
    description: 'Review your mistakes with our smart flashcard system to solidify concepts.',
    href: '/flashcards',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    icon: BookOpen,
    title: 'Smart Notes',
    description: 'A powerful, rich-text editor to capture your thoughts and study materials.',
    href: '/notes',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
  {
    icon: ShieldAlert,
    title: 'Mistake Vault',
    description: 'Every incorrect answer is saved for you to review and learn from.',
    href: '/mistake-vault',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
  }
]

export default function HomePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const practiceSessionsCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'practiceSessions') : null
  , [firestore, user]);

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: practiceSessions, isLoading: isLoadingSessions } = useCollection<PracticeSession>(practiceSessionsCollection);
  const { data: mistakes, isLoading: isLoadingMistakes } = useCollection<Mistake>(mistakesCollection);

  const quickStats = useMemo(() => {
    const now = new Date();
    const defaultStats = {
        streak: 0,
        mistakesToReview: 0,
    };

    if (!practiceSessions) {
      return defaultStats;
    }

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

  }, [practiceSessions, mistakes]);

  const isLoading = isLoadingSessions || isLoadingMistakes;

  return (
    <div className="flex w-full flex-col gap-8">
       {/* Hero Section */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 p-8 rounded-xl bg-card border flex flex-col justify-center">
                <h1 className="text-4xl md:text-5xl font-bold">
                Welcome back!
                </h1>
                <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg">
                    <Link href="/dashboard">View Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/practice">Start a New Quiz <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                </div>
            </div>
            <Card className="flex flex-col justify-center">
                <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Your immediate progress at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-10 w-3/4" />
                      <Skeleton className="h-10 w-1/2" />
                    </>
                  ) : (
                    <>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                            <Repeat className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{quickStats.streak} Day{quickStats.streak !== 1 && 's'}</p>
                            <p className="text-sm text-muted-foreground">Current study streak</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                            <Target className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{quickStats.mistakesToReview}</p>
                            <p className="text-sm text-muted-foreground">Mistakes to review</p>
                        </div>
                    </div>
                    </>
                  )}
                </CardContent>
            </Card>
       </div>
      
       {/* Features Grid */}
      <div className="mt-4">
        <h2 className="text-3xl font-semibold mb-6">Explore Your Toolkit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {featureCards.map((feature, index) => (
            <Card key={index} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${feature.bgColor} dark:bg-zinc-800`}>
                             <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                        </div>
                        <CardTitle>{feature.title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
                <CardContent>
                   <Button asChild variant="secondary" className="w-full">
                        <Link href={feature.href}>Go to {feature.title} <ArrowRight className="ml-auto h-4 w-4" /></Link>
                    </Button>
                </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
