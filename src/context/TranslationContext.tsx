
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translate as translateApi } from 'google-translate-api-x';

interface TranslationContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
  loadTranslations: (keys: string[]) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const loadTranslations = useCallback(async (keys: string[]) => {
    if (language === 'en') {
      const enTranslations = keys.reduce((acc, key) => {
        acc[key] = key;
        return acc;
      }, {} as Record<string, string>);
      setTranslations(enTranslations);
      return;
    }

    try {
      const translatedTexts = await translateApi(keys.join('\n'), { to: language });
      const translatedKeys = translatedTexts.text.split('\n');
      const newTranslations = keys.reduce((acc, key, index) => {
        acc[key] = translatedKeys[index];
        return acc;
      }, {} as Record<string, string>);
      setTranslations(newTranslations);
    } catch (error) {
      console.error('Translation error:', error);
      const fallbackTranslations = keys.reduce((acc, key) => {
        acc[key] = key;
        return acc;
        }, {} as Record<string, string>);
      setTranslations(fallbackTranslations);
    }
  }, [language]);

  const t = (key: string) => {
    return translations[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, loadTranslations }}>
      {children}
    </TranslationContext.Provider>
  );
};
