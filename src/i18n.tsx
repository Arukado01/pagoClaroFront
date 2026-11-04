import React, { useEffect, useState } from 'react';
import { translations, type Language } from './translations';
const languages: Record<Language, string> = { es: 'es-CO', en: 'en-US', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN' };
type Theme = 'system' | 'dark' | 'light';
export function language(): Language { try { const lang = localStorage.getItem('pagoclaro.language'); return lang && lang in languages ? lang as Language : 'es'; } catch { return 'es'; } }
export function locale(): string { return languages[language()]; }
export function tr(key: string, ...values: Array<string | number>): string { const value = translations[language()]?.[key] || key; return value.replace(/\{(\d+)\}/g, (_, i: string) => String(values[Number(i)] ?? '')); }
function storedTheme(): Theme { try { const theme = localStorage.getItem('pagoclaro.theme'); return theme === 'light' || theme === 'dark' ? theme : 'system'; } catch { return 'system'; } }
function applyTheme(mode: Theme): void { const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; }
export function Preferences() {
  const [theme, setTheme] = useState<Theme>(storedTheme); const [lang] = useState<Language>(language);
  useEffect(() => { applyTheme(theme); const media = window.matchMedia('(prefers-color-scheme: dark)'); const change = () => applyTheme(theme); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, [theme]);
  function updateTheme(value: Theme) { setTheme(value); try { localStorage.setItem('pagoclaro.theme', value); } catch {} }
  function updateLanguage(value: Language) { try { localStorage.setItem('pagoclaro.language', value); } catch {} document.documentElement.lang = value === 'zh' ? 'zh-Hans' : value; window.location.reload(); }
  return <div className="preferences"><label><span className="sr-only">{tr('Idioma')}</span><select aria-label={tr('Idioma')} value={lang} onChange={e => updateLanguage(e.target.value as Language)}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="ja">日本語</option><option value="zh">简体中文</option></select></label><label><span className="sr-only">{tr('Apariencia')}</span><select aria-label={tr('Apariencia')} value={theme} onChange={e => updateTheme(e.target.value as Theme)}><option value="system">{tr('Sistema')}</option><option value="light">{tr('Claro')}</option><option value="dark">{tr('Oscuro')}</option></select></label></div>;
}
applyTheme(storedTheme());
document.documentElement.lang = language() === 'zh' ? 'zh-Hans' : language();
