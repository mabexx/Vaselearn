
'use client';

import { useTranslation } from '@/context/TranslationContext';

export const T = ({ children }: { children: string }) => {
  const { t } = useTranslation();
  return <>{t(children)}</>;
};
