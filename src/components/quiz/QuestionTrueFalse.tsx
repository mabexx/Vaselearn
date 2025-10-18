
'use client';

import { TrueFalseQuestion } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Props {
  question: TrueFalseQuestion;
  onAnswer: (answer: boolean) => void;
  userAnswer?: boolean;
}

export default function QuestionTrueFalse({ question, onAnswer, userAnswer }: Props) {
  return (
    <div className="space-y-4">
      <p className="font-semibold text-lg">{question.question}</p>
      <RadioGroup
        value={userAnswer === undefined ? '' : String(userAnswer)}
        onValueChange={(value) => onAnswer(value === 'true')}
      >
        <div className="flex items-center space-x-2 my-2">
          <RadioGroupItem value="true" id="q-opt-true" />
          <Label htmlFor="q-opt-true" className="text-base cursor-pointer">
            True
          </Label>
        </div>
        <div className="flex items-center space-x-2 my-2">
          <RadioGroupItem value="false" id="q-opt-false" />
          <Label htmlFor="q-opt-false" className="text-base cursor-pointer">
            False
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
