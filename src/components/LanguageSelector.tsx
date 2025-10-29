
// components/LanguageSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Language {
  value: string;
  label: string;
}

// Function to clear the Google Translate cookie
const clearGoogleTranslateCookie = () => {
  document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
};

export default function LanguageSelector() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    const googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );

      const observer = new MutationObserver(() => {
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (combo && combo.options.length > 1) {
          observer.disconnect();

          const allLanguages: Language[] = Array.from(combo.options).map(option => ({
            value: option.value,
            label: option.text,
          }));

          const ethiopianCodes = ['aa', 'am', 'om', 'ti'];
          const internationalCodes = ['ar', 'zh-CN', 'zh-TW', 'en', 'fr', 'ja', 'ko'];

          const priorityEthiopian = ethiopianCodes
            .map(code => allLanguages.find(lang => lang.value === code))
            .filter((lang): lang is Language => !!lang)
            .sort((a, b) => a.label.localeCompare(b.label));

          let priorityInternational = internationalCodes
            .map(code => allLanguages.find(lang => lang.value === code))
            .filter((lang): lang is Language => !!lang);

          if (!priorityInternational.some(lang => lang.value === 'en')) {
            priorityInternational.push({ value: 'en', label: 'English' });
          }

          priorityInternational.sort((a, b) => a.label.localeCompare(b.label));

          const otherLanguages = allLanguages
            .filter(lang => ![...ethiopianCodes, ...internationalCodes].includes(lang.value))
            .sort((a, b) => a.label.localeCompare(b.label));

          setLanguages([...priorityEthiopian, ...priorityInternational, ...otherLanguages]);
        }
      });

      const targetNode = document.getElementById('google_translate_element');
      if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
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
      { value: 'aa', label: 'Afar' },
      { value: 'am', label: 'Amharic' },
      { value: 'om', label: 'Oromo' },
      { value: 'ti', label: 'Tigrinya' },
      { value: 'ar', label: 'Arabic' },
      { value: 'zh-CN', label: 'Chinese (Simplified)' },
      { value: 'zh-TW', label: 'Chinese (Traditional)' },
      { value: 'fr', label: 'French' },
      { value: 'ja', label: 'Japanese' },
      { value: 'ko', label: 'Korean' },
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
            <span className="sr-only">Select Language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
