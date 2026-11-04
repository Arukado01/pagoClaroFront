import { tr } from './i18n';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
type ChoiceProps = {
  value: string | number;
  onChange: (value: string) => void;
  options: {
    value: string | number;
    label: string;
  }[];
  label: string;
};
export function Choice({
  value,
  onChange,
  options,
  label
}: ChoiceProps) {
  return <Select value={String(value)} onValueChange={onChange}><SelectTrigger className="shad-select" aria-label={label}><SelectValue /></SelectTrigger><SelectContent className="shad-options">{options.map(option => <SelectItem key={String(option.value)} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
type PagerProps = {
  label: string;
  total: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  size: number;
  setSize: React.Dispatch<React.SetStateAction<number>>;
};
export default function Pager({
  label,
  total,
  page,
  setPage,
  size,
  setSize
}: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / size));
  const [draft, setDraft] = useState(String(page + 1));
  useEffect(() => { setDraft(String(page + 1)); }, [page]);
  function commitPage() { const parsed = Number(draft); if (!Number.isInteger(parsed) || parsed < 1 || parsed > pages) { setDraft(String(page + 1)); return; } setPage(parsed - 1); }
  return <div className="pagination"><div className="pagination-size"><span>{tr('Mostrar')}</span><Choice value={size} onChange={value => {
        setPage(0);
        setSize(Number(value));
      }} label={tr('Cantidad de {0} por página', label)} options={[10, 25, 50, 100].map(value => ({
        value,
        label: String(value)
      }))} /><span>{tr('por página')}</span></div><span aria-live="polite">{total ? tr('{0}–{1} de {2}', page * size + 1, Math.min((page + 1) * size, total), total) : tr('0 resultados')}</span><Pagination className="pagination-pages" aria-label={tr('Páginas de {0}', label)}><PaginationContent><PaginationItem><Button variant="outline" size="icon" type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label={tr('Página anterior')}>‹</Button></PaginationItem><PaginationItem><div className="pagination-current">{tr('Página')} <input className="page-input" type="number" min={1} max={pages} step={1} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commitPage} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} aria-label={tr('Seleccionar página de {0}', label)} /> {tr('de')} {pages}</div></PaginationItem><PaginationItem><Button variant="outline" size="icon" type="button" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page + 1 >= pages} aria-label={tr('Página siguiente')}>›</Button></PaginationItem></PaginationContent></Pagination></div>;
}
