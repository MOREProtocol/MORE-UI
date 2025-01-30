// src/index.js
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import React, { useEffect, useState } from 'react';
import { IProps } from 'src/helpers/types';

// import { messages } from '../locales/en/messages.js';

// i18n.load('en', messages);
// i18n.activate('en');

export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'el'];
export const LANG_MAP = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  el: 'Greek',
};

/**
 * We do a dynamic import of just the catalog that we need
 * @param locale any locale string
 */
export async function dynamicActivateLanguage(locale: string) {
  const { messages } = await import(`../locales/${locale}/messages.js`);
  i18n.load(locale, messages);
  i18n.activate(locale);
  localStorage.setItem('LOCALE', locale);
}

export const LanguageProvider: React.FunctionComponent<IProps> = (props) => {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const initI18n = async () => {
      // With this method we dynamically load the catalogs
      const savedLocale = localStorage.getItem('LOCALE') || DEFAULT_LOCALE;
      if (i18n.locale !== savedLocale) {
        await dynamicActivateLanguage(savedLocale);
        setI18nReady(true);
      }
    };

    initI18n();
  }, []);

  return i18nReady ? <I18nProvider i18n={i18n}>{props.children}</I18nProvider> : <></>;
};
