
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ArrowRight, CalendarIcon, ListChecks, TagIcon } from 'lucide-react';
import { Mistake } from '@/lib/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

type FilterType = 'manual' | 'time' | 'subject';

export default function ExactRetakePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('manual');
  const [selectedMistakeIds, setSelectedMistakeIds] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const { groupedMistakes, subjects } = useMemo(() => {
    if (!mistakes) return { groupedMistakes: {}, subjects: [] };
    const grouped = mistakes.reduce((acc, mistake) => {
      const subject = mistake.tags?.[0] || 'General';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(mistake);
      return acc;
    }, {} as Record<string, Mistake[]>);
    const uniqueSubjects = Array.from(new Set(mistakes.flatMap(m => m.tags || [])));
    return { groupedMistakes: grouped, subjects: uniqueSubjects };
  }, [mistakes]);

  const mistakesToDisplay = useMemo(() => {
    if (!mistakes) return [];
    switch (filterType) {
        case 'subject':
            if (selectedSubjects.length === 0) return mistakes;
            return mistakes.filter(m => m.tags?.some(t => selectedSubjects.includes(t)));
        case 'time':
            if (!dateRange?.from) return mistakes;
            const toDate = dateRange.to || dateRange.from;
            return mistakes.filter(m => {
                const createdAt = m.createdAt.toDate();
                return createdAt >= dateRange.from! && createdAt <= toDate;
            });
        case 'manual':
        default:
            return mistakes;
    }
  }, [mistakes, filterType, selectedSubjects, dateRange]);

  const handleToggleSelection = (mistakeId: string) => {
    setSelectedMistakeIds(prev =>
      prev.includes(mistakeId)
        ? prev.filter(id => id !== mistakeId)
        : [...prev, mistakeId]
    );
  };

  const handleStartQuiz = () => {
    if (selectedMistakeIds.length === 0) return;
    router.push(`/practice/quiz?retake=exact&ids=${selectedMistakeIds.join(',')}`);
  };

  const renderMistakeList = (mistakesToRender: Mistake[]) => {
      const grouped = mistakesToRender.reduce((acc, mistake) => {
        const subject = mistake.tags?.[0] || 'General';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(mistake);
        return acc;
      }, {} as Record<string, Mistake[]>);

      return (
         <Accordion type="multiple" className="w-full space-y-4">
              {Object.entries(grouped).map(([subject, mistakesInGroup]) => (
                <AccordionItem key={subject} value={subject}>
                  <AccordionTrigger className="text-xl font-semibold">{subject}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {mistakesInGroup.map((mistake) => (
                      <div key={mistake.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                        <Checkbox id={mistake.id} checked={selectedMistakeIds.includes(mistake.id)} onCheckedChange={() => handleToggleSelection(mistake.id)} />
                        <Label htmlFor={mistake.id} className="flex-1 cursor-pointer">{mistake.question}</Label>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
      )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Exact Retake - Select Questions</CardTitle>
        <CardDescription>
          Choose the exact questions you want to include in your retake quiz. Use the filters to narrow down your selection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={filterType} onValueChange={(v) => { setFilterType(v as FilterType); setSelectedMistakeIds([]) }} className="grid grid-cols-3 gap-4">
            <Label htmlFor="manual" className="p-4 border rounded-md cursor-pointer text-center peer-data-[state=checked]:border-primary">
                <RadioGroupItem value="manual" id="manual" className="sr-only peer" />
                <ListChecks className="h-6 w-6 mx-auto mb-2" /> Manual Selection
            </Label>
             <Label htmlFor="time" className="p-4 border rounded-md cursor-pointer text-center peer-data-[state=checked]:border-primary">
                <RadioGroupItem value="time" id="time" className="sr-only peer" />
                <CalendarIcon className="h-6 w-6 mx-auto mb-2" /> By Date
            </Label>
             <Label htmlFor="subject" className="p-4 border rounded-md cursor-pointer text-center peer-data-[state=checked]:border-primary">
                <RadioGroupItem value="subject" id="subject" className="sr-only peer" />
                <TagIcon className="h-6 w-6 mx-auto mb-2" /> By Subject
            </Label>
        </RadioGroup>

        {isLoading ? <Skeleton className="h-48 w-full" /> :
          filterType === 'manual' ? (
            renderMistakeList(mistakes || [])
          ) : filterType === 'subject' ? (
            <div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {subjects.map(subject => (
                         <div key={subject} className="flex items-center space-x-2">
                            <Checkbox id={subject} checked={selectedSubjects.includes(subject)} onCheckedChange={() => setSelectedSubjects(p => p.includes(subject) ? p.filter(s => s !== subject) : [...p, subject])} />
                            <Label htmlFor={subject} className="cursor-pointer">{subject}</Label>
                        </div>
                    ))}
                </div>
                {renderMistakeList(mistakesToDisplay)}
            </div>
          ) : ( // time
            <div className="flex flex-col items-center gap-4">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} />
               {renderMistakeList(mistakesToDisplay)}
            </div>
          )
        }
      </CardContent>
      <div className="p-6">
         <Button onClick={handleStartQuiz} disabled={selectedMistakeIds.length === 0} className="w-full">
            Start Quiz with {selectedMistakeIds.length} Question{selectedMistakeIds.length !== 1 && 's'} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
      </div>
    </Card>
  );
}
