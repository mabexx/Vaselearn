
'use client';

import React from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { setLanguage } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" data-testid="language-switcher">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('lv')}>Latvian</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('lt')}>Lithuanian</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('et')}>Estonian</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
