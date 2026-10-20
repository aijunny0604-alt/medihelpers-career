import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const menuId = useId();
  const valueId = useId();
  const unavailable = disabled || normalized.length === 0;

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const position = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const menuHeight = Math.min(normalized.length * 52 + 18, 340);
      const spaceBelow = window.innerHeight - rect.bottom - 32;
      const spaceAbove = rect.top - 32;
      const above = spaceBelow < menuHeight && spaceAbove > spaceBelow;
      setPlacement(above ? 'up' : 'down');
      rootRef.current.style.setProperty('--select-available-height', `${Math.max(52, above ? spaceAbove : spaceBelow)}px`);
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, normalized.length]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
    optionRefs.current[selectedIndex]?.focus({ preventScroll: true });
    optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex]);

  useEffect(() => {
    if (unavailable) setOpen(false);
  }, [unavailable]);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const select = (nextValue) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const focusOption = (index) => {
    if (!normalized.length) return;
    const next = (index + normalized.length) % normalized.length;
    setActiveIndex(next);
    optionRefs.current[next]?.focus({ preventScroll: true });
    optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
  };
  const handleKeyDown = (event) => {
    if (unavailable) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!open) {
      setOpen(true);
      return;
    }
    if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(normalized.length - 1);
    else focusOption(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
  };
  const selectedOption = normalized.find((option) => option.value === currentValue);

  return <div ref={rootRef} className={`hero-custom-select ${open ? 'open' : ''} opens-${placement} ${unavailable ? 'disabled' : ''} ${className}`} onKeyDown={handleKeyDown} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    {name && <input type="hidden" name={name} value={currentValue} disabled={unavailable} />}
    <button ref={triggerRef} type="button" className="hero-select-trigger" disabled={unavailable} aria-label={label} aria-describedby={valueId} aria-haspopup="listbox" aria-controls={open ? menuId : undefined} aria-expanded={open} onClick={() => setOpen((current) => !current)}><span id={valueId}>{selectedOption?.label || currentValue || label}</span><ChevronDown /></button>
    {open && <div id={menuId} className="hero-select-menu" role="listbox" aria-label={`${label} 목록`} data-lenis-prevent>
      {normalized.map((item, index) => <button ref={(node) => { optionRefs.current[index] = node; }} type="button" role="option" tabIndex={index === activeIndex ? 0 : -1} aria-selected={item.value === currentValue} className={item.value === currentValue ? 'selected' : ''} key={item.value} onFocus={() => setActiveIndex(index)} onClick={() => select(item.value)}>{item.label}{item.value === currentValue && <Check />}</button>)}
    </div>}
  </div>;
}
