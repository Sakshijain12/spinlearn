"use client";

import { STEP_NAMES } from "@/lib/learning";
import { Icon } from "./Icon";

export function StepBar({
  currentStep, completedSteps, onStepClick, disabled = false,
}: {
  currentStep: number;
  completedSteps: readonly number[];
  onStepClick: (step: number) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Lesson steps" className="grid grid-cols-5 gap-2 md:gap-3">
      {STEP_NAMES.map((name, index) => {
        const done = completedSteps.includes(index);
        const current = currentStep === index;
        return (
          <button key={name} type="button" disabled={disabled} onClick={() => onStepClick(index)} aria-current={current ? "step" : undefined} aria-label={`Step ${index + 1}: ${name}, ${done ? "completed" : "not completed"}`} className="min-h-12 text-left disabled:cursor-not-allowed disabled:opacity-50">
            <span className={`mb-2 block h-1 rounded-full ${done ? "bg-accent-fill" : "bg-border"} ${current ? "ring-1 ring-accent-fill ring-offset-2" : ""}`} />
            <span className={`flex items-center gap-1 text-[11px] sm:text-small ${current ? "font-medium text-text-primary" : "text-text-secondary"}`}>
              {done && <Icon name="check" size={14} className="hidden shrink-0 sm:block" />}
              {name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
