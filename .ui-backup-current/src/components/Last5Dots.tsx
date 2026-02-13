export const Last5Dots = ({ form }: { form: ('W' | 'L')[] }) => (
  <div className="form-dots" aria-label="last-five-form">
    {form.length === 0 ? <span className="muted">-</span> : null}
    {form.map((result, idx) => (
      <span key={`${result}-${idx}`} className={`dot dot-${result}`} title={result}>
        {result}
      </span>
    ))}
  </div>
);
