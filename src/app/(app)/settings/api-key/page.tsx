
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { getApiKey, saveApiKey, validateApiKey } from '@/lib/aistudio';
import { Loader2 } from 'lucide-react';

export default function ApiKeyPage() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      saveApiKey(apiKey);
      toast({
        title: 'API Key Saved',
        description: 'Your AI Studio API key has been saved.',
      });
    } else {
      toast({
        title: 'Invalid API Key',
        description: 'Please enter a valid AI Studio API key.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Studio API Key</CardTitle>
        <CardDescription>
          Manage your Google AI Studio API key. This key is required to generate quizzes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your AI Studio API key"
          />
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
