export const toISODate = (date: Date): string => date.toISOString().slice(0, 10);

export const formatDateLabel = (isoDate: string): string => {
  const dt = new Date(`${isoDate}T12:00:00`);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const weekKey = (isoDate: string): string => {
  const dt = new Date(`${isoDate}T12:00:00`);
  const day = dt.getDay() || 7;
  dt.setDate(dt.getDate() - day + 1);
  return toISODate(dt);
};

export const weekLabel = (weekStart: string): string => {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};
