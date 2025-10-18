
'use client';

import { MultipleChoiceQuestion } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Props {
  question: MultipleChoiceQuestion;
  onAnswer: (answer: string) => void;
  userAnswer?: string;
}

export default function QuestionMultipleChoice({ question, onAnswer, userAnswer }: Props) {
  return (
    <div className="space-y-4">
      <p className="font-semibold text-lg">{question.question}</p>
      <RadioGroup value={userAnswer} onValueChange={onAnswer}>
        {question.options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2 my-2">
            <RadioGroupItem value={option} id={`q-opt-${index}`} />
            <Label htmlFor={`q-opt-${index}`} className="text-base cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
