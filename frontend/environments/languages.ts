import { InjectionToken } from '@angular/core';
import { Language } from '../app/_models/models';

// Available UI languages
export const languages: Language[] = [
    // Work around the strange choice of 2-digit year for the default en-US locale
    {nativeName: 'English', code: 'en', weight: 10, dateFormat: 'M/d/yyyy', datetimeFormat: 'M/d/yyyy, h:mm a'},
];

/**
 * Injection token for obtaining the current application language.
 */
export const LANGUAGE = new InjectionToken<Language>('appLanguage');

/**
 * Provider for the LANGUAGE injection token.
 */
export const provideLanguage = (localeId: string): Language => {
    // Try to find the language that corresponds to the current locale by its code, falling back to the first language
    // (with the highest priority)
    return languages.find(l => l.code === localeId) ?? languages[0];
};
