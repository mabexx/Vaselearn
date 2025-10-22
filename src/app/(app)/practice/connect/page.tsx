'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateApiKey, saveApiKey } from '@/lib/aistudio';

export default function ConnectPage() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      try {
        await saveApiKey(apiKey);
        router.push('/practice/quiz');
      } catch (error) {
        setError('Failed to save API key. Please try again.');
        console.error(error);
      }
    } else {
      setError('Invalid API key. Please check your key and try again.');
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Connect to Google AI Studio</CardTitle>
          <CardDescription>
            Enter your Google AI Studio API key to generate quiz questions using the Gemma 3 27B model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Get your Google AI Studio API key
            </a>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleConnect} disabled={loading || !apiKey}>
            {loading ? 'Connecting...' : 'Connect and Start Quiz'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
