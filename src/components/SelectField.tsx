import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  testId?: string;
}

export const SelectField = ({
  value,
  options,
  onChange,
  placeholder = 'Select',
  ariaLabel,
  className,
  testId
}: SelectFieldProps) => {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedIndex = useMemo(() => options.findIndex((opt) => opt.value === value), [options, value]);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;

  useEffect(() => {
    if (!open) return;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={`custom-select ${className ?? ''}`.trim()} ref={rootRef} data-testid={testId}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={open ? `${uid}-opt-${highlightedIndex}` : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setOpen(true);
            return;
          }
          if (!open) return;
          if (event.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((idx) => (idx + 1) % options.length);
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((idx) => (idx - 1 + options.length) % options.length);
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const selected = options[highlightedIndex];
            if (selected) choose(selected.value);
            return;
          }
          if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(0);
            return;
          }
          if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(options.length - 1);
            return;
          }
          if (event.key === 'Tab') {
            setOpen(false);
          }
        }}
      >
        <span className={selectedIndex >= 0 ? '' : 'muted'}>{selectedLabel}</span>
        <span className="custom-select-chevron" aria-hidden />
      </button>

      {open ? (
        <div
          className="custom-select-menu"
          role="listbox"
          id={listboxId}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                type="button"
                id={`${uid}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                key={option.value || option.label}
                className={`custom-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  choose(option.value);
                }}
              >
                <span>{option.label}</span>
                {isSelected ? <span className="checkmark">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
