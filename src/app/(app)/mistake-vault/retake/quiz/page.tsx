
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, CalendarIcon, ListChecks, TagIcon } from 'lucide-react';
import { Mistake } from '@/lib/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

type FilterType = 'manual' | 'time' | 'subject';

export default function RetakeQuizPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('manual');
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [questionsAmount, setQuestionsAmount] = useState('10');
  const [questionsAmountError, setQuestionsAmountError] = useState('');

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

  const filteredMistakes = useMemo(() => {
    if (!mistakes) return [];
    switch (filterType) {
      case 'manual':
        return mistakes.filter(m => selectedMistakes.includes(m.id));
      case 'subject':
        return mistakes.filter(m => m.tags?.some(t => selectedSubjects.includes(t)));
      case 'time':
        if (!dateRange?.from || !dateRange?.to) return [];
        return mistakes.filter(m => {
          const createdAt = m.createdAt.toDate();
          return createdAt >= dateRange.from! && createdAt <= date.to!;
        });
      default:
        return [];
    }
  }, [mistakes, filterType, selectedMistakes, selectedSubjects, dateRange]);

  const handleStartQuiz = () => {
    const amount = parseInt(questionsAmount, 10);
    if (isNaN(amount) || amount < 2 || amount > 30) {
      setQuestionsAmountError('Please enter a number between 2 and 30.');
      return;
    }
    const mistakeContext = filteredMistakes.map(m => m.question).join('\n');
    router.push(`/practice/quiz?retake=true&limit=${questionsAmount}&context=${encodeURIComponent(mistakeContext)}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 text-white space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Retake Quiz</h1>
        <p className="text-gray-400">
          Choose the mistakes that will be used as context for your new AI-generated quiz.
        </p>
      </div>

      <div className="bg-gray-800 border-gray-700 rounded-xl p-6 space-y-6">
        <RadioGroup value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Label htmlFor="manual" className="p-4 bg-gray-900 border-2 border-gray-700 rounded-md cursor-pointer text-center peer-data-[state=checked]:border-purple-500 transition-all">
                <RadioGroupItem value="manual" id="manual" className="sr-only peer" />
                <ListChecks className="h-6 w-6 mx-auto mb-2" /> Manual Selection
            </Label>
             <Label htmlFor="time" className="p-4 bg-gray-900 border-2 border-gray-700 rounded-md cursor-pointer text-center peer-data-[state=checked]:border-purple-500 transition-all">
                <RadioGroupItem value="time" id="time" className="sr-only peer" />
                <CalendarIcon className="h-6 w-6 mx-auto mb-2" /> By Date
            </Label>
             <Label htmlFor="subject" className="p-4 bg-gray-900 border-2 border-gray-700 rounded-md cursor-pointer text-center peer-data-[state=checked]:border-purple-500 transition-all">
                <RadioGroupItem value="subject" id="subject" className="sr-only peer" />
                <TagIcon className="h-6 w-6 mx-auto mb-2" /> By Subject
            </Label>
        </RadioGroup>

        <div className="min-h-[200px]">
          {isLoading ? <Skeleton className="h-48 w-full bg-gray-700" /> :
            filterType === 'manual' ? (
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groupedMistakes).map(([subject, mistakesInGroup]) => (
                  <AccordionItem key={subject} value={subject} className="bg-gray-900 rounded-lg px-4 border-b-0">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">{subject}</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      {mistakesInGroup.map((mistake) => (
                        <div key={mistake.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700">
                          <Checkbox id={mistake.id} checked={selectedMistakes.includes(mistake.id)} onCheckedChange={() => setSelectedMistakes(p => p.includes(mistake.id) ? p.filter(id => id !== mistake.id) : [...p, mistake.id])} className="border-gray-600"/>
                          <Label htmlFor={mistake.id} className="flex-1 cursor-pointer">{mistake.question}</Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : filterType === 'subject' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                  {subjects.map(subject => (
                      <div key={subject} className="flex items-center space-x-2">
                          <Checkbox id={subject} checked={selectedSubjects.includes(subject)} onCheckedChange={() => setSelectedSubjects(p => p.includes(subject) ? p.filter(s => s !== subject) : [...p, subject])} className="border-gray-600"/>
                          <Label htmlFor={subject} className="cursor-pointer">{subject}</Label>
                      </div>
                  ))}
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} className="bg-gray-900 rounded-md border-gray-700" />
              </div>
            )
          }
        </div>
      </div>

      <div className="bg-gray-800 border-gray-700 rounded-xl p-6 space-y-4">
         <div className="space-y-2">
            <Label htmlFor="questionsAmount">Number of Questions for New Quiz</Label>
            <Input id="questionsAmount" type="number" value={questionsAmount} onChange={(e) => setQuestionsAmount(e.target.value)} className="bg-gray-700 border-gray-600" />
            {questionsAmountError && <p className="text-sm text-red-500">{questionsAmountError}</p>}
          </div>
          <Button onClick={handleStartQuiz} disabled={filteredMistakes.length === 0} className="w-full btn-gradient font-bold text-lg py-6">
              Generate Quiz from {filteredMistakes.length} Selected Mistake{filteredMistakes.length !== 1 && 's'} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
      </div>
    </div>
  );
}
