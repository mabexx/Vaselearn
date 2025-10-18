
'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dumbbell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import clientsData from '@/lib/vls-clients.json';
import type { VLSClient, VLSTopic } from '@/lib/types/VLS';

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clients: VLSClient[] = clientsData.clients;

  // Group clients by sector for the dropdown
  const clientsBySector = useMemo(() => {
    return clients.reduce((acc, client) => {
      const sector = client.metadata.sector;
      if (!acc[sector]) {
        acc[sector] = [];
      }
      acc[sector].push(client);
      return acc;
    }, {} as Record<string, VLSClient[]>);
  }, [clients]);

  // Set initial state from URL params or defaults
  const getInitialClient = () => {
    const clientTypeFromUrl = searchParams.get('clientType');
    return clients.find(c => c.client_type === clientTypeFromUrl) || clients[0] || null;
  };
  
  const getInitialTopic = (client: VLSClient | null) => {
    const topicFromUrl = searchParams.get('topic');
    return client?.topics.hardcoded.find(t => t.title === topicFromUrl) || client?.topics.hardcoded[0] || null;
  };

  const [selectedClient, setSelectedClient] = useState<VLSClient | null>(getInitialClient());
  const [selectedTopic, setSelectedTopic] = useState<VLSTopic | null>(getInitialTopic(selectedClient));
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('mixed');
  const [numQuestions, setNumQuestions] = useState(5);

  const handleClientChange = (clientType: string) => {
    const client = clients.find(c => c.client_type === clientType) || null;
    setSelectedClient(client);
    // Reset topic and question type when client changes
    setSelectedTopic(client?.topics.hardcoded[0] || null);
    setSelectedQuestionType('mixed');
  };

  const handleTopicChange = (topicTitle: string) => {
    const topic = selectedClient?.topics.hardcoded.find(t => t.title === topicTitle) || null;
    setSelectedTopic(topic);
  };
  
  const handleQuestionTypeChange = (questionType: string) => {
    setSelectedQuestionType(questionType);
  };

  const handleStartQuiz = () => {
    if (!selectedClient || !selectedTopic) return;

    const queryParams = new URLSearchParams({
      clientType: selectedClient.client_type,
      topic: selectedTopic.title,
      limit: numQuestions.toString(),
      questionType: selectedQuestionType,
    });
    
    router.push(`/practice/quiz?${queryParams.toString()}`);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold">Practice Room</h1>
        <p className="text-muted-foreground mt-2">
          Generate a contextualized quiz based on vocational learning profiles.
        </p>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell />
            New Practice Quiz
          </CardTitle>
          <CardDescription>
            Select a profile and topic to start a new quiz.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="client-type">Client Profile</Label>
            <Select onValueChange={handleClientChange} value={selectedClient?.client_type || ''}>
              <SelectTrigger id="client-type">
                <SelectValue placeholder="Select a client profile..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(clientsBySector).map(([sector, clientsInSection]) => (
                  <SelectGroup key={sector}>
                    <SelectLabel>{sector}</SelectLabel>
                    {clientsInSection.map(client => (
                      <SelectItem key={client.client_type} value={client.client_type}>
                        {client.client_type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClient && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="topic">Topic</Label>
                <Select onValueChange={handleTopicChange} value={selectedTopic?.title || ''}>
                  <SelectTrigger id="topic">
                    <SelectValue placeholder="Select a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClient.topics.hardcoded.map(topic => (
                      <SelectItem key={topic.title} value={topic.title}>
                        {topic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="question-type">Question Type</Label>
                <Select onValueChange={handleQuestionTypeChange} value={selectedQuestionType}>
                  <SelectTrigger id="question-type">
                    <SelectValue placeholder="Select a question type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                    {selectedClient.question_generation.style.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="num-questions">Number of Questions: {numQuestions}</Label>
            <Slider
              id="num-questions"
              min={1}
              max={10}
              step={1}
              value={[numQuestions]}
              onValueChange={(value) => setNumQuestions(value[0])}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartQuiz} className="w-full" disabled={!selectedClient || !selectedTopic}>
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
