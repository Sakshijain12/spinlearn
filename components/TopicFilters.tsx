"use client";

import { useId } from "react";
import { CATEGORIES, LEVELS } from "@/lib/learning";

export function TopicFilters({
  category, level, onCategoryChange, onLevelChange, disabled = false,
}: {
  category: string;
  level: string;
  onCategoryChange: (category: string) => void;
  onLevelChange: (level: string) => void;
  disabled?: boolean;
}) {
  const levelId = useId();
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <div role="group" aria-label="Category" className="flex min-w-0 max-w-full flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap">
        {CATEGORIES.map((item) => (
          <button key={item} type="button" className="filter-chip" aria-pressed={category === item} disabled={disabled} onClick={() => onCategoryChange(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="shrink-0">
        <label htmlFor={levelId} className="sr-only">Level</label>
        <select id={levelId} className="field" value={level} onChange={(event) => onLevelChange(event.target.value)} disabled={disabled}>
          {LEVELS.map((item) => <option key={item} value={item}>{item === "All" ? "All levels" : item}</option>)}
        </select>
      </div>
    </div>
  );
}
