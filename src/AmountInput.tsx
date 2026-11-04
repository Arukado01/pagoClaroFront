import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { locale, tr } from './i18n';

type Separators = { group: string; decimal: string };

export function amountSeparators(language: string): Separators {
  const parts = new Intl.NumberFormat(language, { minimumFractionDigits: 1 }).formatToParts(1234.5);
  return {
    group: parts.find(part => part.type === 'group')?.value ?? ',',
    decimal: parts.find(part => part.type === 'decimal')?.value ?? '.',
  };
}

const digitsOnly = (value: string) => /^\d*$/.test(value);

/** Parse without rounding or discarding unsupported characters. */
export function parseAmountInput(value: string, { group, decimal }: Separators): string | null {
  const normalized = group.trim() === '' ? value.replace(/[\u00a0\u202f ]/g, group) : value;
  const segments = normalized.split(decimal);
  if (segments.length > 2) return null;
  const integer = segments[0].split(group).join('');
  const fraction = segments[1];
  if (!digitsOnly(integer) || integer.length > 13 || (fraction !== undefined && (!digitsOnly(fraction) || fraction.length > 2))) return null;
  return integer + (fraction === undefined ? '' : `.${fraction}`);
}

/** A pasted grouped number must have valid three-digit groups for the active locale. */
export function isValidPastedAmount(value: string, separators: Separators): boolean {
  const { group, decimal } = separators;
  const normalized = group.trim() === '' ? value.replace(/[\u00a0\u202f ]/g, group) : value;
  const segments = normalized.split(decimal);
  if (segments.length > 2 || (segments[1] !== undefined && !digitsOnly(segments[1]))) return false;
  const groups = segments[0].split(group);
  if (groups.length > 1 && (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(part => !/^\d{3}$/.test(part)))) return false;
  return parseAmountInput(normalized, separators) !== null;
}

export function formatAmountInput(canonical: string, { group, decimal }: Separators): string {
  const [integer, fraction] = canonical.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return grouped + (fraction === undefined ? '' : decimal + fraction);
}

function logicalCharacters(value: string, decimal: string): number {
  return Array.from(value).filter(character => /\d/.test(character) || character === decimal).length;
}

function positionForLogicalCharacters(value: string, decimal: string, count: number): number {
  if (count === 0) return 0;
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index]) || value[index] === decimal) seen += 1;
    if (seen === count) return index + 1;
  }
  return value.length;
}

export default function AmountInput({ onAmountChange }: { onAmountChange: (value: string) => void }) {
  const separators = amountSeparators(locale());
  const [display, setDisplay] = useState('');
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const error = tr('Usa {0} para decimales; hasta 13 dígitos enteros y 2 decimales.', separators.decimal);

  useLayoutEffect(() => {
    input.current?.setCustomValidity(invalid ? error : '');
  }, [invalid, error]);

  const update = (candidate: string, caret: number, element: HTMLInputElement, strict = false) => {
    if ((strict || invalid) && !isValidPastedAmount(candidate, separators)) {
      setDisplay(candidate);
      setInvalid(true);
      return;
    }
    const canonical = parseAmountInput(candidate, separators);
    if (canonical === null) {
      setDisplay(candidate);
      setInvalid(true);
      return;
    }
    const formatted = formatAmountInput(canonical, separators);
    const logicalPosition = logicalCharacters(candidate.slice(0, caret), separators.decimal);
    const nextPosition = positionForLogicalCharacters(formatted, separators.decimal, logicalPosition);
    setInvalid(false);
    setDisplay(formatted);
    onAmountChange(canonical);
    queueMicrotask(() => {
      if (document.activeElement === element) element.setSelectionRange(nextPosition, nextPosition);
    });
  };

  return <>
    <input
      ref={input}
      required
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      placeholder={new Intl.NumberFormat(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(1234.56)}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      onChange={event => {
        const native = event.nativeEvent as InputEvent;
        // Manually entered group separators must form a valid local grouping before they can be submitted.
        const groupEntered = native.inputType === 'insertText' && (native.data === separators.group || (separators.group.trim() === '' && native.data !== null && /^[\u00a0\u202f ]$/.test(native.data)));
        update(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length, event.currentTarget, groupEntered);
      }}
      onPaste={event => {
        const pasted = event.clipboardData.getData('text');
        event.preventDefault();
        const element = event.currentTarget;
        const start = element.selectionStart ?? display.length;
        const end = element.selectionEnd ?? start;
        const candidate = display.slice(0, start) + pasted + display.slice(end);
        if (!isValidPastedAmount(pasted, separators)) {
          setDisplay(candidate);
          setInvalid(true);
          return;
        }
        const hasGroup = pasted.includes(separators.group) || (separators.group.trim() === '' && /[\u00a0\u202f ]/.test(pasted));
        update(candidate, start + pasted.length, element, hasGroup);
      }}
      onDrop={event => { event.preventDefault(); setInvalid(true); }}
      onKeyDown={event => {
        // Invalid text is shown verbatim: normal deletion must remove only the character the user selected.
        if (invalid) return;
        const element = event.currentTarget;
        const start = element.selectionStart;
        if (start === null || start !== element.selectionEnd) return;
        if (event.key === 'Backspace' && start > 1 && display[start - 1] === separators.group) {
          event.preventDefault();
          update(display.slice(0, start - 2) + display.slice(start), start - 2, element);
        } else if (event.key === 'Delete' && display[start] === separators.group && start + 1 < display.length) {
          event.preventDefault();
          update(display.slice(0, start) + display.slice(start + 2), start, element);
        }
      }}
    />
    {invalid && <small id={errorId} role="alert">{error}</small>}
  </>;
}
