
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function TutorPage() {

  return (
    <Card className="w-full h-full flex flex-col items-center justify-center text-center">
      <CardHeader>
        <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <CardTitle>
          AI Tutor (Under Construction)
        </CardTitle>
        <CardDescription>
          This feature is temporarily unavailable while we make improvements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
            We are working hard to bring you an even better AI-powered learning experience.
            <br />
            Please check back later!
        </p>
      </CardContent>
    </Card>
  );
}
