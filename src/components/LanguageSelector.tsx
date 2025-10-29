// components/LanguageSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface Language {
  value: string;
  label: string;
}

// Function to clear the Google Translate cookie
const clearGoogleTranslateCookie = () => {
    // Setting the expiration date to the past removes the cookie
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // It might be set on the specific domain, so we clear it there too
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
};


export default function LanguageSelector() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    const googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          autoDisplay: false,
        },
        'google_translate_element'
      );

      const observer = new MutationObserver(() => {
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (combo && combo.options.length > 1) {
          observer.disconnect(); // Stop observing once we have the languages

          const allLanguages: Language[] = Array.from(combo.options).map(option => ({
            value: option.value,
            label: option.text,
          }));

          const priorityCodes = ['en', 'et', 'lv', 'lt'];

          const priorityLanguages = priorityCodes
            .map(code => allLanguages.find(lang => lang.value === code))
            .filter((lang): lang is Language => !!lang);

          if (!priorityLanguages.some(lang => lang.value === 'en')) {
            priorityLanguages.unshift({ value: 'en', label: 'English' });
          }

          const otherLanguages = allLanguages
            .filter(lang => !priorityCodes.includes(lang.value))
            .sort((a, b) => a.label.localeCompare(b.label));

          setLanguages([...priorityLanguages, ...otherLanguages]);
        }
      });

      const targetNode = document.getElementById('google_translate_element');
      if (targetNode) {
        observer.observe(targetNode, {
          childList: true,
          subtree: true,
        });
      }
    };

    if (!(window as any).googleTranslateElementInit) {
        (window as any).googleTranslateElementInit = googleTranslateElementInit;
    }

    const style = document.createElement('style');
    style.innerHTML = `
      .goog-te-banner-frame { display: none !important; }
      body { top: 0 !important; }
      #google_translate_element { display: none !important; }
      .skiptranslate { display: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

  const changeLanguage = (lang: string) => {
    setSelectedLanguage(lang);
    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (combo) {
      if (lang === 'en') {
        clearGoogleTranslateCookie();
        window.location.reload();
        return;
      }
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    }
  };

  const defaultLanguages: Language[] = [
      { value: 'en', label: 'English' },
      { value: 'et', label: 'Eesti' },
      { value: 'lv', label: 'Latviešu' },
      { value: 'lt', label: 'Lietuvių' },
  ];

  const languagesToRender = languages.length > 0 ? languages : defaultLanguages;

  return (
    <>
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <div id="google_translate_element" style={{ display: 'none' }}></div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Globe className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {languagesToRender.map(lang => (
            <DropdownMenuItem key={lang.value} onSelect={() => changeLanguage(lang.value)}>
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
