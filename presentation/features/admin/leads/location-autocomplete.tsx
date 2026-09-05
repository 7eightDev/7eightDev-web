"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/presentation/lib/utils";

interface LocationSuggestion {
  readonly main: string;
  readonly secondary?: string;
}

interface LocationAutocompleteProps {
  readonly value: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly inputClass?: string;
  readonly onSelect: (value: string) => void;
  readonly onChange: (value: string) => void;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

/**
 * Autocomplete input for the "località" field of the lead search form.
 * Fetches suggestions from the server-side proxy route (which keeps the
 * Google Places API key off the client) and lets the user pick a suggestion.
 */
export function LocationAutocomplete({
  value,
  placeholder,
  disabled,
  inputClass,
  onSelect,
  onChange,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < MIN_CHARS) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/admin/leads/new/location-autocomplete?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((data: { suggestions?: LocationSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        })
        .catch((error) => {
          if ((error as { name?: string })?.name !== "AbortError") {
            setSuggestions([]);
          }
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const select = (suggestion: LocationSuggestion) => {
    onChange(suggestion.main);
    onSelect(suggestion.main);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        i <= 0 ? suggestions.length - 1 : i - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="location-autocomplete-list"
        aria-autocomplete="list"
        aria-busy={loading}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          setActiveIndex(-1);
          if (next.trim().length < MIN_CHARS) {
            setSuggestions([]);
            setOpen(false);
            setLoading(false);
          }
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />

      {open && suggestions.length > 0 && (
        <ul
          id="location-autocomplete-list"
          role="listbox"
          className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg bg-surface border border-border shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.main}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(suggestion)}
                className={cn(
                  "w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors cursor-pointer",
                  index === activeIndex ? "bg-raised" : "hover:bg-raised",
                )}
              >
                <span className="font-hanken text-sm text-foreground">
                  {suggestion.main}
                </span>
                {suggestion.secondary && (
                  <span className="font-mono text-[10.5px] text-muted">
                    {suggestion.secondary}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
