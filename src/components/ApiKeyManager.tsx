
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Info, Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ApiKeyManager() {
  const t = useTranslations('ApiKeyManager');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemma-3-27b-it');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('aiConfiguration')}</CardTitle>
        <CardDescription>{t('aiConfigurationDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">{t('apiKey')}</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('enterApiKey')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-model">{t('aiModel')}</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="ai-model">
                <SelectValue placeholder={t('selectModel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemma-3-27b-it">{t('gemma3-27b-it')}</SelectItem>
                <SelectItem value="gemma-3-9b-it">{t('gemma-3-9b-it')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <KeyRound className="mr-2 h-4 w-4" />
            {t('saveConfiguration')}
          </Button>
        </div>
        <Accordion type="single" collapsible className="w-full mt-6">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center">
                <Info className="mr-2 h-4 w-4" />
                {t('howToGetApiKey')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="prose dark:prose-invert">
                <p>How to Get Your Google AI Studio API Key</p>
                <ol>
                  <li>Go to 👉 <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">https://aistudio.google.com</a></li>
                  <li>Sign in with your Google (Gmail) account.</li>
                  <li>In the top-left corner, click the three stacked lines (☰).</li>
                  <li>From the menu, click “Get API Key.”</li>
                  <li>Then click “Create API Key.”</li>
                  <li>Type a name for your key (for example: My App Key).</li>
                  <li>Create a project when asked — just choose a simple name.</li>
                  <li>After it’s created, click the small paper icon 📄 to copy your key.</li>
                  <li>Paste your key here (in the app or website that asks for it).</li>
                  <li>✅ Done! You now have your own working Google AI Studio API Key.</li>
                </ol>
                <p>⚠️ <strong>Important:</strong></p>
                <ul>
                  <li>Do not share your key with anyone you don’t trust.</li>
                  <li>Keep it safe — you can write it down or save it in your email drafts.</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
