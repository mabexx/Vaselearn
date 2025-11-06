
'use client';

import { CaseBasedQuestion } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  question: CaseBasedQuestion;
  onAnswer: (answer: string) => void;
  userAnswer?: string;
  disabled?: boolean;
}

export default function QuestionCaseBased({ question, onAnswer, userAnswer, disabled }: Props) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-md border">
        <p className="font-semibold text-lg mb-2">Case Study</p>
        <p className="text-muted-foreground">{question.question}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="case-answer" className="text-lg font-semibold">{question.prompt}</Label>
        <Textarea
          id="case-answer"
          placeholder="Type your response here..."
          value={userAnswer || ''}
          onChange={(e) => onAnswer(e.target.value)}
          className="min-h-[150px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
