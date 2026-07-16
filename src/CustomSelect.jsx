import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function CustomSelect({
  value,
  defaultValue,
  onChange,
  options,
  disabled = false,
  label,
  name,
  className = ''
}) {
  const normalized = useMemo(() => options.map((option) => (
    typeof option === 'string' ? { value: option, label: option } : option
  )), [options]);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? normalized[0]?.value ?? '');
  const currentValue = controlled ? value : internalValue;
  const selectedIndex = Math.max(0, normalized.findIndex((option) => option.value === currentValue));
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('down');
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const menuHeight = Math.min(normalized.length * 52 + 18, 340);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setPlacement(spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'up' : 'down');
  }, [open, normalized.length]);

  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, []);

  const select = (nextValue) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const focusOption = (index) => {
    const next = (index + normalized.length) % normalized.length;
    setActiveIndex(next);
    requestAnimationFrame(() => optionRefs.current[next]?.focus());
  };
  const handleKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!open) setOpen(true);
    if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(normalized.length - 1);
    else focusOption(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
  };
  const selectedOption = normalized.find((option) => option.value === currentValue);

  return <div ref={rootRef} className={`hero-custom-select ${open ? 'open' : ''} opens-${placement} ${disabled ? 'disabled' : ''} ${className}`} onKeyDown={handleKeyDown}>
    {name && <input type="hidden" name={name} value={currentValue} />}
    <button ref={triggerRef} type="button" className="hero-select-trigger" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{selectedOption?.label || currentValue || label}</span><ChevronDown /></button>
    {open && <div className="hero-select-menu" role="listbox" aria-label={`${label} 목록`} data-lenis-prevent>
      {normalized.map((item, index) => <button ref={(node) => { optionRefs.current[index] = node; }} type="button" role="option" tabIndex={index === activeIndex ? 0 : -1} aria-selected={item.value === currentValue} className={item.value === currentValue ? 'selected' : ''} key={item.value} onFocus={() => setActiveIndex(index)} onClick={() => select(item.value)}>{item.label}{item.value === currentValue && <Check />}</button>)}
    </div>}
  </div>;
}
