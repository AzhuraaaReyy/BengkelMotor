import { SearchIcon } from "../shared/icons";

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  name = "search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  name?: string;
}) {
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-secondary">
        <SearchIcon className="h-4 w-4" />
      </span>
      <input
        type="search"
        name={name}
        className="form-input pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
