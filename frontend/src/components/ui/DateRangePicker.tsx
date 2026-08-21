interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <label className="form-label" htmlFor="from">
          Dari
        </label>
        <input
          id="from"
          type="date"
          className="form-input"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="to">
          Sampai
        </label>
        <input
          id="to"
          type="date"
          className="form-input"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
    </div>
  );
}
