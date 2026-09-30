import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Idioma = 'pt' | 'en'
export type Modo = 'claro' | 'escuro'

type Prefs = {
  idioma: Idioma
  modo: Modo
  setIdioma: (idioma: Idioma) => void
  setModo: (modo: Modo) => void
  t: (pt: string, en: string) => string
}

const PrefsContext = createContext<Prefs | null>(null)

function modoInicial(): Modo {
  const escolha = localStorage.getItem('mf-tema-escolha') === '1'
  const salvo = localStorage.getItem('mf-tema')
  if (escolha && (salvo === 'claro' || salvo === 'escuro')) return salvo
  return 'escuro'
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(() => (localStorage.getItem('mf-idioma') === 'en' ? 'en' : 'pt'))
  const [modo, setModoEstado] = useState<Modo>(modoInicial)
  const setModo = (proximo: Modo) => {
    localStorage.setItem('mf-tema-escolha', '1')
    setModoEstado(proximo)
  }

  useEffect(() => {
    localStorage.setItem('mf-idioma', idioma)
    document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR'
  }, [idioma])

  useEffect(() => {
    localStorage.setItem('mf-tema', modo)
    document.documentElement.dataset.tema = modo
  }, [modo])

  const valor = useMemo<Prefs>(() => ({
    idioma,
    modo,
    setIdioma,
    setModo,
    t: (pt, en) => (idioma === 'en' ? en : pt),
  }), [idioma, modo])

  return <PrefsContext.Provider value={valor}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const prefs = useContext(PrefsContext)
  if (!prefs) throw new Error('usePrefs fora do provider')
  return prefs
}
