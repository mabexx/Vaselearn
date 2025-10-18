"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface FlashcardProps {
  question: string;
  answer: string;
}

export default function Flashcard({ question, answer }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="group h-64 w-full cursor-pointer [perspective:1000px]"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={cn(
          "relative h-full w-full rounded-lg shadow-md transition-transform duration-700 [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* Front of the card */}
        <Card className="absolute h-full w-full [backface-visibility:hidden]">
          <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
            <p className="text-lg font-semibold">{question}</p>
            <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              <RefreshCw className="h-3 w-3" />
              Click to flip
            </div>
          </CardContent>
        </Card>

        {/* Back of the card */}
        <Card className="absolute h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
            <p className="text-base text-muted-foreground">{answer}</p>
             <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              <RefreshCw className="h-3 w-3" />
              Click to flip
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
