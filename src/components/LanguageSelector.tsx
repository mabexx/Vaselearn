// components/LanguageSelector.tsx
'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function LanguageSelector() {
  useEffect(() => {
    const googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,et,lv,lt,es,fr,de,ja,zh-CN,pt,ru,ar,ko,it,hi,tr,pl,nl,sv',
          autoDisplay: false
        },
        'google_translate_element'
      );
    };

    (window as any).googleTranslateElementInit = googleTranslateElementInit;

    // Hide the annoying Google banner
    const style = document.createElement('style');
    style.innerHTML = `
      .goog-te-banner-frame { display: none !important; }
      body { top: 0 !important; }
      .skiptranslate { display: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

  const changeLanguage = (lang: string) => {
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
    }
  };

  return (
    <>
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <div id="google_translate_element" style={{ display: 'none' }}></div>

      <select
        onChange={(e) => changeLanguage(e.target.value)}
        className="border rounded px-3 py-2 bg-white"
      >
        <option value="en">🌐 English</option>
        <option value="et">🇪🇪 Eesti</option>
        <option value="lv">🇱🇻 Latviešu</option>
        <option value="lt">🇱🇹 Lietuvių</option>
        <option value="es">🇪🇸 Español</option>
        <option value="fr">🇫🇷 Français</option>
        <option value="de">🇩🇪 Deutsch</option>
        <option value="ja">🇯🇵 日本語</option>
        <option value="zh-CN">🇨🇳 中文</option>
        <option value="pt">🇵🇹 Português</option>
        <option value="ru">🇷🇺 Русский</option>
        <option value="ar">🇸🇦 العربية</option>
        <option value="ko">🇰🇷 한국어</option>
      </select>
    </>
  );
}
