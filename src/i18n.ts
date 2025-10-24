import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    debug: true,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'lv', 'lt', 'et'],
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}.json'
    }
  });

export default i18n;
