
'use client';

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, BookCheck, Download, Star, Target, TrendingUp, TrendingDown, CalendarDays, Zap, BarChart3, Bot, Check, ShieldAlert, CheckCircle2, Repeat, CalendarCheck } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";
import { PracticeSession, Mistake, CustomGoal } from "@/lib/types";
import { downloadJson } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsistencyChart, PerformanceByTimeChart } from "@/components/dashboard-extra-charts";
import Link from "next/link";
import { isSameDay, startOfWeek, endOfWeek, differenceInDays, subDays, format } from 'date-fns';

interface SubjectStats {
  topic: string;
  averageScore: number;
  sessions: number;
}

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();

  const practiceSessionsCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'practiceSessions') : null
  , [firestore, user]);
  
  const customGoalsCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'customGoals') : null
  , [firestore, user]);

  const { data: practiceSessions, isLoading: isLoadingSessions } = useCollection<PracticeSession>(practiceSessionsCollection);
  const { data: customGoals, isLoading: isLoadingCustomGoals } = useCollection<CustomGoal>(customGoalsCollection);

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
    };

    if (!practiceSessions || practiceSessions.length === 0) {
      return defaultStats;
    }

    const statsBySubject: { [key: string]: { totalScore: number; totalQuestions: number; sessionCount: number } } = {};
    
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
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
      if (sessionDate >= startOfThisWeek && sessionDate <= endOfWeek(now, { weekStartsOn: 1 })) {
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
    };

  }, [practiceSessions]);


  const dashboardStats = useMemo(() => {
    if (!practiceSessions || practiceSessions.length === 0) {
      return {
        totalQuestionsAnswered: 0,
        uniqueSubjects: 0,
        overallAverageScore: 0,
        bestSubject: { topic: "N/A", averageScore: 0 },
        worstSubject: { topic: "N/A", averageScore: 0 },
        subjectStats: [],
        lastSession: null,
        consistencyData: [],
        performanceByTimeData: [],
      };
    }

    const statsBySubject: { [key: string]: { totalScore: number; sessionCount: number; questions: number } } = {};
    let totalQuestionsAnswered = 0;
    let totalScoreSum = 0;
    
    const dailyActivity: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        dailyActivity[dateString] = 0;
    }
    
    const timeOfDayStats: { [key: string]: { totalScore: number; totalQuestions: number } } = {
        'Morning (6-12)': { totalScore: 0, totalQuestions: 0 },
        'Afternoon (12-18)': { totalScore: 0, totalQuestions: 0 },
        'Evening (18-24)': { totalScore: 0, totalQuestions: 0 },
        'Night (0-6)': { totalScore: 0, totalQuestions: 0 },
    };


    practiceSessions.forEach(session => {
      if (!statsBySubject[session.topic]) {
        statsBySubject[session.topic] = { totalScore: 0, sessionCount: 0, questions: 0 };
      }
      statsBySubject[session.topic].totalScore += session.score;
      statsBySubject[session.topic].sessionCount += 1;
      statsBySubject[session.topic].questions += session.totalQuestions;
      totalQuestionsAnswered += session.totalQuestions;
      totalScoreSum += (session.score / session.totalQuestions) * 100;
      
      const sessionDate = (session.createdAt as Timestamp).toDate();
      
      const dateString = sessionDate.toISOString().split('T')[0];
      if(dailyActivity[dateString] !== undefined){
          dailyActivity[dateString] += session.totalQuestions;
      }
      
      const hour = sessionDate.getHours();
      let timeSlot: keyof typeof timeOfDayStats;
      if (hour >= 6 && hour < 12) timeSlot = 'Morning (6-12)';
      else if (hour >= 12 && hour < 18) timeSlot = 'Afternoon (12-18)';
      else if (hour >= 18 && hour < 24) timeSlot = 'Evening (18-24)';
      else timeSlot = 'Night (0-6)';
      
      timeOfDayStats[timeSlot].totalScore += session.score;
      timeOfDayStats[timeSlot].totalQuestions += session.totalQuestions;

    });

    const subjectStats: SubjectStats[] = Object.entries(statsBySubject).map(([topic, stats]) => ({
      topic,
      averageScore: Math.round((stats.totalScore / (stats.sessionCount * 10)) * 1000 / 10), // Assuming totalQuestions is always 10 for avg calc simplicity
      sessions: stats.sessionCount,
    }));

    const sortedByScore = [...subjectStats].sort((a, b) => b.averageScore - a.averageScore);
    const bestSubject = sortedByScore[0] || { topic: "N/A", averageScore: 0 };
    const worstSubject = sortedByScore[sortedByScore.length - 1] || { topic: "N/A", averageScore: 0 };

    const sortedByDate = [...practiceSessions].sort((a, b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds);
    const lastSession = sortedByDate[0] || null;

    const consistencyData = Object.entries(dailyActivity)
        .map(([date, questions]) => ({ date, questions }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const performanceByTimeData = Object.entries(timeOfDayStats).map(([time, data]) => ({
        time,
        averageScore: data.totalQuestions > 0 ? Math.round((data.totalScore / data.totalQuestions) * 100) : 0,
    }));


    return {
      totalQuestionsAnswered,
      uniqueSubjects: subjectStats.length,
      overallAverageScore: practiceSessions.length > 0 ? Math.round(totalScoreSum / practiceSessions.length) : 0,
      bestSubject,
      worstSubject,
      subjectStats,
      lastSession,
      consistencyData,
      performanceByTimeData,
    };
  }, [practiceSessions]);

  const handleExportReport = () => {
    if (!practiceSessions) return;
    
    const reportData = {
      summary: {
        totalQuestionsAnswered: dashboardStats.totalQuestionsAnswered,
        uniqueSubjects: dashboardStats.uniqueSubjects,
        overallAverageScore: dashboardStats.overallAverageScore,
        bestSubject: dashboardStats.bestSubject,
        worstSubject: dashboardStats.worstSubject,
      },
      goals: {
        ...goalStats
      },
      performance: {
        bySubject: dashboardStats.subjectStats,
        byTimeOfDay: dashboardStats.performanceByTimeData,
        consistencyOverTime: dashboardStats.consistencyData,
      },
      customGoals: customGoals || [],
      detailedHistory: practiceSessions || [],
    };
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    downloadJson(reportData, `studyflow-report_${timestamp}.json`);
  };

  const isLoading = isLoadingSessions || isLoadingCustomGoals;
  
  if (isLoading) {
      return (
          <div className="grid gap-4 md:gap-8">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Skeleton className="h-[400px]" />
                  <div className="grid gap-4">
                    <Skeleton className="h-[200px]" />
                    <Skeleton className="h-[200px]" />
                  </div>
              </div>
          </div>
      )
  }

  if (!practiceSessions || practiceSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg h-[60vh]">
        <Target className="h-16 w-16 mb-4" />
        <p className="font-semibold text-lg">No Data to Analyze</p>
        <p className="max-w-md mx-auto mt-2">Your dashboard will light up with insights as soon as you complete your first practice quiz. Ready to get started?</p>
        <Button asChild className="mt-6">
          <Link href="/practice">Take Your First Quiz</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
       {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
             <CardTitle className="text-sm font-medium">Subjects Practiced</CardTitle>
             <BookCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.uniqueSubjects}</div>
            <p className="text-xs text-muted-foreground">Unique topics covered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Questions Answered</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalQuestionsAnswered}</div>
            <p className="text-xs text-muted-foreground">Across all sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.overallAverageScore}%</div>
             <p className="text-xs text-muted-foreground">Your overall performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Strongest Subject</CardTitle>
             <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{dashboardStats.bestSubject.topic}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.bestSubject.averageScore}% average score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>Performance by Subject</CardTitle>
                      <CardDescription>Your average score across different topics.</CardDescription>
                  </div>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportReport}
                  >
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                  </Button>
              </CardHeader>
              <CardContent className="pl-2">
                  <DashboardCharts chartData={dashboardStats.subjectStats} />
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Study Consistency</CardTitle>
                  <CardDescription>Questions answered per day over the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ConsistencyChart data={dashboardStats.consistencyData} />
              </CardContent>
          </Card>
      </div>
      <div className="grid grid-cols-1 gap-4">
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Peak Performance Time</CardTitle>
                  <CardDescription>Your average quiz scores by time of day.</CardDescription>
              </CardHeader>
              <CardContent>
                  <PerformanceByTimeChart data={dashboardStats.performanceByTimeData} />
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

    