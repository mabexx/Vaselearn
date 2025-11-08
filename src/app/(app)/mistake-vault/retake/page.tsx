
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight } from 'lucide-react';

export default function RetakeSelectionPage() {
  const [retakeType, setRetakeType] = useState('similar');
  const router = useRouter();

  const handleContinue = () => {
    router.push(`/mistake-vault/retake/${retakeType}`);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Retake Quiz from Mistake Vault</CardTitle>
          <CardDescription>How would you like to retake your mistakes?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={retakeType} onValueChange={setRetakeType} className="space-y-4">
            <div>
              <RadioGroupItem value="similar" id="similar" className="peer sr-only" />
              <Label htmlFor="similar" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                <h3 className="text-lg font-semibold mb-2">Similar Retake (AI-Powered)</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Let our AI generate new, similar questions based on your past mistakes to test your understanding of the core concepts.
                </p>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="exact" id="exact" className="peer sr-only" />
              <Label htmlFor="exact" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                <h3 className="text-lg font-semibold mb-2">Exact Retake (Verbatim)</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Review the exact same questions you got wrong previously. No changes, no surprises.
                </p>
              </Label>
            </div>
          </RadioGroup>
          <Button onClick={handleContinue} className="w-full">
            Continue <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
