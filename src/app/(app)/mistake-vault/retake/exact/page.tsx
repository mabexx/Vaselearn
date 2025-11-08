
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Mistake } from '@/lib/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function ExactRetakePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);

  const mistakesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'mistakes') : null
  , [firestore, user]);

  const { data: mistakes, isLoading } = useCollection<Mistake>(mistakesCollection);

  const groupedMistakes = useMemo(() => {
    if (!mistakes) return {};
    return mistakes.reduce((acc, mistake) => {
      const subject = mistake.tags?.[0] || 'General';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(mistake);
      return acc;
    }, {} as Record<string, Mistake[]>);
  }, [mistakes]);

  const handleToggleSelection = (mistakeId: string) => {
    setSelectedMistakes(prev =>
      prev.includes(mistakeId)
        ? prev.filter(id => id !== mistakeId)
        : [...prev, mistakeId]
    );
  };

  const handleStartQuiz = () => {
    router.push(`/practice/quiz?retake=exact&ids=${selectedMistakes.join(',')}`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Exact Retake - Select Questions</CardTitle>
        <CardDescription>
          Choose the exact questions you want to include in your retake quiz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : Object.keys(groupedMistakes).length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
            <ShieldAlert className="h-16 w-16 mb-4" />
            <p className="font-semibold">No mistakes found!</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4">
            {Object.entries(groupedMistakes).map(([subject, mistakesInGroup]) => (
              <AccordionItem key={subject} value={subject}>
                <AccordionTrigger className="text-xl font-semibold">{subject}</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {mistakesInGroup.map((mistake) => (
                    <div key={mistake.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                      <Checkbox
                        id={mistake.id}
                        checked={selectedMistakes.includes(mistake.id)}
                        onCheckedChange={() => handleToggleSelection(mistake.id)}
                      />
                      <Label htmlFor={mistake.id} className="flex-1 cursor-pointer">
                        {mistake.question}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
      <div className="p-6">
         <Button onClick={handleStartQuiz} disabled={selectedMistakes.length === 0} className="w-full">
            Start Quiz with {selectedMistakes.length} Question{selectedMistakes.length !== 1 && 's'} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
      </div>
    </Card>
  );
}
