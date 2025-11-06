'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateApiKey, saveApiKey } from '@/lib/aistudio';

export default function ConnectPage() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');

      const isValid = await validateApiKey(apiKey);

      if (isValid) {
        await saveApiKey(apiKey);
        router.push('/practice/quiz');
      } else {
        setError('Invalid API key. Please check your key and try again.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && apiKey && !loading) {
      handleConnect();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Connect to Google AI Studio</CardTitle>
          <CardDescription>
            Enter your Google AI Studio API key to generate quiz questions.
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
              onKeyPress={handleKeyPress}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How to Get Your Google AI Studio API Key</AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm dark:prose-invert">
                  <ol>
                    <li>Go to 👉 <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">https://aistudio.google.com</a></li>
                    <li>Sign in with your Google (Gmail) account.</li>
                    <li>In the top-left corner, click the three stacked lines (☰).</li>
                    <li>From the menu, click “Get API Key.”</li>
                    <li>Then click “Create API Key.”</li>
                    <li>Type a name for your key (for example: My App Key).</li>
                    <li>Create a project when asked — just choose a simple name.</li>
                    <li>After it’s created, click the small paper icon (📄) to copy your key.</li>
                    <li>Paste your key here (in the app or website that asks for it).</li>
                  </ol>
                  <p>✅ Done! You now have your own working Google AI Studio API Key.</p>
                  <p><strong>⚠️ Important:</strong></p>
                  <ul>
                    <li>Do not share your key with anyone you don’t trust.</li>
                    <li>Keep it safe — you can write it down or save it in your email drafts.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
