import { useEffect, useId, useMemo, useRef, useState } from 'react';

interface DatePickerFieldProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

const toMonthStart = (iso?: string) => {
  const base = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return new Date(base.getFullYear(), base.getMonth(), 1);
};

const toISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });

const buildCalendarDays = (monthStart: Date): Date[] => {
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, idx) => {
    const dt = new Date(gridStart);
    dt.setDate(gridStart.getDate() + idx);
    return dt;
  });
};

export const DatePickerField = ({ value, onChange, placeholder = 'yyyy-mm-dd', ariaLabel }: DatePickerFieldProps) => {
  const uid = useId();
  const popoverId = `${uid}-calendar`;
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => toMonthStart(value));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setVisibleMonth(toMonthStart(value));
  }, [value]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  return (
    <div className="date-picker-field" ref={rootRef}>
      <div className="date-input-button" aria-label={ariaLabel ?? 'Choose date'}>
        <span>{value || placeholder}</span>
        <button
          type="button"
          className="calendar-glyph calendar-glyph-btn"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={ariaLabel ?? 'Open calendar'}
          aria-haspopup="dialog"
          aria-controls={popoverId}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M7 3.8V7.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M17 3.8V7.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M3.8 9.3H20.2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="date-popover" role="dialog" aria-modal="false" id={popoverId}>
          <div className="date-popover-head">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              aria-label="Previous month"
            >
              ‹
            </button>
            <strong>{monthLabel(visibleMonth)}</strong>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="date-week-row">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="date-grid">
            {days.map((day) => {
              const iso = toISO(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const active = iso === value;
              return (
                <button
                  type="button"
                  key={iso}
                  className={`date-cell ${inMonth ? '' : 'muted-cell'} ${active ? 'active' : ''}`}
                  aria-label={day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  aria-pressed={active}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-popover-footer">
            <button
              type="button"
              onClick={() => {
                onChange(toISO(new Date()));
                setOpen(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
