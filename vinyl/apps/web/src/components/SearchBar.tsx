"use client";

type SearchBarProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
};

export function SearchBar({
  value = "",
  placeholder = "Search tracks, albums, or artists",
  onChange
}: SearchBarProps) {
  return (
    <input
      aria-label="Search"
      className="search-bar"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}
