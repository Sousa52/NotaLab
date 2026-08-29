import { createContext, useContext, type ReactNode } from 'react'
import { ptPT, type TranslationDict } from './pt-PT'

export type Locale = 'pt-PT'

const dictionaries: Record<Locale, TranslationDict> = {
  'pt-PT': ptPT,
}

const I18nContext = createContext<TranslationDict>(ptPT)

export function I18nProvider({ locale = 'pt-PT', children }: { locale?: Locale; children: ReactNode }) {
  return <I18nContext.Provider value={dictionaries[locale]}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
