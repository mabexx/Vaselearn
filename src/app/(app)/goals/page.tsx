
'use client';

import { useMemo, useState } from 'react';
import { collection, Timestamp, serverTimestamp, doc } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ShieldAlert, Target, TrendingUp, CalendarCheck, Repeat, Check, Plus, Bot, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PracticeSession, Mistake, CustomGoal } from '@/lib/types';
import Link from 'next/link';
import { isSameDay, startOfWeek, endOfWeek, differenceInDays, subDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';


interface SubjectStats {
  topic: string;
  averageScore: number;
  sessions: number;
}

const WeekdayPill = ({ day, active, isToday }: { day: string; active: boolean; isToday: boolean }) => (
    <div className="flex flex-col items-center gap-2">
        <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border-2",
            active ? "bg-green-500 border-green-600 text-white" : "bg-muted",
            isToday && "border-primary"
        )}>
            {active ? <Check className="h-6 w-6" /> : null}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{day}</span>
    </div>
);

export default function GoalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [newGoalText, setNewGoalText] = useState('');

  const practiceSessionsCollection = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'practiceSessions') : null
  , [firestore, user]);

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);
  
  const customGoalsCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'customGoals') : null
  , [firestore, user]);

  const { data: practiceSessions, isLoading: isLoadingSessions } = useCollection<PracticeSession>(practiceSessionsCollection);
  const { data: mistakes, isLoading: isLoadingMistakes } = useCollection<Mistake>(mistakesCollection);
  const { data: customGoals, isLoading: isLoadingCustomGoals } = useCollection<CustomGoal>(customGoalsCollection);
  
  const sortedCustomGoals = useMemo(() => {
    if (!customGoals) return [];
    return [...customGoals].sort((a, b) => (a.createdAt as any) - (b.createdAt as any));
  }, [customGoals]);

  const handleAddCustomGoal = async () => {
    if (!user || !customGoalsCollection || !newGoalText.trim()) return;
    
    const goalData: Omit<CustomGoal, 'id'> = {
      userId: user.uid,
      text: newGoalText.trim(),
      isCompleted: false,
      createdAt: serverTimestamp() as Timestamp,
    };
    
    await addDocumentNonBlocking(customGoalsCollection, goalData);
    setNewGoalText('');
  };

  const handleToggleCustomGoal = (goal: CustomGoal) => {
    if (!user || !firestore) return;
    const goalRef = doc(firestore, 'users', user.uid, 'customGoals', goal.id);
    setDocumentNonBlocking(goalRef, { isCompleted: !goal.isCompleted }, { merge: true });
  }

  const handleDeleteCustomGoal = (goalId: string) => {
    if (!user || !firestore) return;
    const goalRef = doc(firestore, 'users', user.uid, 'customGoals', goalId);
    deleteDocumentNonBlocking(goalRef);
  };

  const goalStats = useMemo(() => {
    const now = new Date();
    const defaultStats = {
        worstSubject: null,
        bestSubject: null,
        subjectsMastered: 0,
        masteryGoal: 3,
        weeklySessions: 0,
        weeklySessionGoal: 5,
        streak: 0,
        streakGoal: "Never miss 2 days in a row",
        weekActivity: Array(7).fill(false),
    };

    if (!practiceSessions || practiceSessions.length === 0) {
      return defaultStats;
    }

    const statsBySubject: { [key: string]: { totalScore: number; totalQuestions: number; sessionCount: number } } = {};
    
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
    let weeklySessions = 0;

    const sortedSessions = [...practiceSessions].sort((a, b) => (a.createdAt as Timestamp).toMillis() - (b.createdAt as Timestamp).toMillis());
    const practiceDays = new Set<string>();

    sortedSessions.forEach(session => {
      if (!statsBySubject[session.topic]) {
        statsBySubject[session.topic] = { totalScore: 0, totalQuestions: 0, sessionCount: 0 };
      }
      statsBySubject[session.topic].totalScore += session.score;
      statsBySubject[session.topic].totalQuestions += session.totalQuestions;
      statsBySubject[session.topic].sessionCount++;

      const sessionDate = (session.createdAt as Timestamp).toDate();
      if (sessionDate >= startOfThisWeek && sessionDate <= endOfThisWeek) {
        weeklySessions++;
      }
      practiceDays.add(sessionDate.toISOString().split('T')[0]);
    });

    // Calculate Streak
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
    
    // Calculate week activity for visual
    const weekActivity = Array(7).fill(false).map((_, i) => {
        const dayToCheck = subDays(now, 6 - i);
        return practiceDays.has(dayToCheck.toISOString().split('T')[0]);
    });


    const subjectStats: SubjectStats[] = Object.entries(statsBySubject).map(([topic, stats]) => ({
      topic,
      averageScore: Math.round((stats.totalScore / stats.totalQuestions) * 100),
      sessions: stats.sessionCount,
    }));

    const sortedByScore = [...subjectStats].sort((a, b) => a.averageScore - b.averageScore);
    
    const worstSubject = sortedByScore[0];
    const bestSubject = sortedByScore[sortedByScore.length - 1];
    const subjectsMastered = subjectStats.filter(s => s.averageScore > 85).length;
    
    return {
      worstSubject,
      bestSubject,
      subjectsMastered,
      masteryGoal: 3,
      weeklySessions,
      weeklySessionGoal: 5,
      streak: currentStreak,
      streakGoal: "Never miss 2 days in a row",
      weekActivity,
    };

  }, [practiceSessions]);

  const weekDays = Array(7).fill(0).map((_, i) => format(subDays(new Date(), 6 - i), 'E'));

  const isLoading = isLoadingSessions || isLoadingMistakes || isLoadingCustomGoals;

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2 xl:col-span-1" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-500">Focus Area</span>
                </CardDescription>
                <CardTitle className="text-2xl">
                  {goalStats.worstSubject ? `Improve in ${goalStats.worstSubject.topic}` : 'Take a Quiz'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goalStats.worstSubject ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your current average is {goalStats.worstSubject.averageScore}%.
                      Let&apos;s get it up to 85%!
                    </p>
                    <Progress value={goalStats.worstSubject.averageScore} className="mb-4 h-3" />
                     <Button asChild className="w-full">
                        <Link href={`/practice?topic=${encodeURIComponent(goalStats.worstSubject.topic)}`}>Practice Now</Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <p>Complete a session to get your first goal.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-amber-500">Review</span>
                </CardDescription>
                <CardTitle className="text-2xl">
                  Clear Your Mistake Vault
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground mb-2">
                   You have <span className="font-bold">{mistakes?.length || 0}</span> question{mistakes?.length !== 1 && 's'} to review.
                   Solidify your knowledge by tackling them.
                </p>
                <Progress value={mistakes ? (1 - (mistakes.length / Math.max(1, (mistakes.length || 0) + 5))) * 100 : 0} className="mb-4 h-3" />
                <Button asChild className="w-full" disabled={!mistakes || mistakes.length === 0}>
                    <Link href="/mistake-vault">Go to Vault</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-500">Mastery</span>
                </CardDescription>
                <CardTitle className="text-2xl">
                  Master New Subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground mb-2">
                   Achieve an average score of over 85% in {goalStats.masteryGoal} different subjects.
                   You are currently mastering {goalStats.subjectsMastered}.
                </p>
                <Progress value={(goalStats.subjectsMastered / goalStats.masteryGoal) * 100} className="mb-4 h-3" />
                 <Button asChild className="w-full">
                    <Link href="/practice">Find a New Topic</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold text-blue-500">Weekly Target</span>
                </CardDescription>
                <CardTitle className="text-2xl">
                  Practice Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground mb-2">
                   Complete {goalStats.weeklySessionGoal} practice sessions this week. You&apos;ve done {goalStats.weeklySessions} so far.
                </p>
                <Progress value={(goalStats.weeklySessions / goalStats.weeklySessionGoal) * 100} className="mb-4 h-3" />
                 <Button asChild className="w-full">
                    <Link href="/practice">Start a Session</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 xl:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-indigo-500">Consistency</span>
                </CardDescription>
                <CardTitle className="text-2xl">
                  Maintain Your Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground mb-4">
                  Current streak: <span className="font-bold">{goalStats.streak} day{goalStats.streak !== 1 && 's'}</span>. Goal: {goalStats.streakGoal}.
                </p>
                 <div className="flex justify-around items-end gap-1">
                    {goalStats.weekActivity.map((active, index) => (
                        <WeekdayPill key={index} day={weekDays[index]} active={active} isToday={index === 6}/>
                    ))}
                 </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2 xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Custom AI Goals
                  </CardTitle>
                  <CardDescription>
                    Add your own goals. Our AI will help you track them. (AI verification coming soon!)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {isLoadingCustomGoals ? (
                      <Skeleton className="h-8" />
                    ) : sortedCustomGoals.length > 0 ? (
                      sortedCustomGoals.map(goal => (
                        <div key={goal.id} className="flex items-center gap-3 group">
                          <Checkbox 
                            id={`goal-${goal.id}`}
                            checked={goal.isCompleted}
                            onCheckedChange={() => handleToggleCustomGoal(goal)}
                          />
                          <label 
                            htmlFor={`goal-${goal.id}`}
                            className={cn(
                              "flex-1 text-sm transition-colors", 
                              goal.isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {goal.text}
                          </label>
                          {goal.isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteCustomGoal(goal.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No custom goals yet. Add one below!</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full items-center gap-2">
                        <Input 
                            placeholder="e.g., Read chapter 5 of Biology"
                            value={newGoalText}
                            onChange={(e) => setNewGoalText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomGoal()}
                        />
                        <Button onClick={handleAddCustomGoal}><Plus className="h-4 w-4 mr-2"/> Add Goal</Button>
                    </div>
                </CardFooter>
            </Card>
          </>
        )}
      </div>

       {!isLoading && (!practiceSessions || practiceSessions.length === 0) && (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg mt-8">
            <Target className="h-16 w-16 mb-4" />
            <p className="font-semibold text-lg">Start Your Journey!</p>
            <p>Your personalized goals will appear here once you complete your first practice quiz.</p>
             <Button asChild className="mt-4">
                <Link href="/practice">Take Your First Quiz</Link>
            </Button>
        </div>
      )}
    </div>
  );
}
