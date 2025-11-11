
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';

interface FlippableFlashcardProps {
  question: string;
  answer: string;
}

export default function FlippableFlashcard({ question, answer }: FlippableFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective w-full h-48" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of the card */}
        <Card className="absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 text-center">
          <CardContent>
            <p className="text-lg font-semibold">{question}</p>
          </CardContent>
        </Card>

        {/* Back of the card */}
        <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex flex-col justify-center items-center p-4 text-center bg-secondary">
          <CardContent>
            <p className="text-lg text-secondary-foreground">{answer}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
