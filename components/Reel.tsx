"use client";

import { useEffect, useRef } from "react";

interface ReelProps {
  options: readonly string[];
  isSpinning: boolean;
  selectedIndex: number;
  onSpinComplete: () => void;
}

export function Reel({ options, isSpinning, selectedIndex, onSpinComplete }: ReelProps) {
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = reelRef.current;
    if (!strip) return;
    const target = `translateY(calc(var(--row-height) * ${-(selectedIndex - 1)}))`;
    if (!isSpinning) {
      strip.style.transition = "none";
      strip.style.transform = target;
      return;
    }
    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        strip.style.transition = reduced ? "none" : "transform 3.4s cubic-bezier(0.12, 0.75, 0.2, 1)";
        strip.style.transform = target;
        timer = setTimeout(onSpinComplete, reduced ? 150 : 3400);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [isSpinning, options, selectedIndex, onSpinComplete]);

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-card border border-border bg-surface-1 p-3" aria-hidden="true">
      <div className="reel-window">
        <div className="reel-band" />
        <div ref={reelRef} className="reel-strip">
          {options.map((option, index) => (
            <div key={index} className={`reel-row ${index === selectedIndex && !isSpinning ? "text-text-primary" : "text-text-muted"}`}>
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
