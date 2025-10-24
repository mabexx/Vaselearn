'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { validateApiKey, saveApiKey, saveModel } from '@/lib/aistudio';

const models = [
  {
    label: "Recommended",
    models: [
      { id: 'gemma-3-27b-it', name: 'Gemma 3 27B' },
      { id: 'gemma-3-8b-it', name: 'Gemma 3 8B' },
    ]
  },
  {
    label: "Other Models",
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ]
  }
];

export default function ConnectPage() {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0].models[0].id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      try {
        saveApiKey(apiKey);
        saveModel(selectedModel);
        router.push('/practice/quiz');
      } catch (error) {
        setError('Failed to save settings. Please try again.');
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
            Enter your Google AI Studio API key and select a model to generate quiz questions.
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
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Warning: Rate limits are dynamic and managed by Google.
            </p>
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
