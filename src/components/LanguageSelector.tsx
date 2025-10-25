// components/LanguageSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface Language {
  value: string;
  label: string;
}

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

          // Find the languages that Google provides from our priority list
          const priorityLanguages = priorityCodes
            .map(code => allLanguages.find(lang => lang.value === code))
            .filter((lang): lang is Language => !!lang);

          // If English is not in the list from Google, add it manually to the top
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
      // If the user selects "English" (or the page's original language),
      // we need a way to revert the translation. Google's widget does this
      // by clearing cookies. The simplest way to trigger this is to reload.
      if (lang === 'en') {
        // A more sophisticated approach might involve manipulating cookies,
        // but a reload is robust and simple.
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

      <select
        value={selectedLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="border rounded px-3 py-2 bg-white"
      >
        {languagesToRender.map(lang => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </>
  );
}
