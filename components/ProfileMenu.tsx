"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useLearning } from "./LearningProvider";
import type { Account } from "@/lib/auth/validation";

export function ProfileMenu({ account }: { account: Account }) {
  const { state, ready, signOut, signingOut } = useLearning();
  const pathname = usePathname();
  const menuId = useId();
  const [mode, setMode] = useState<"closed" | "hover" | "open">("closed");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const profileItem = useRef<HTMLAnchorElement>(null);
  const signOutItem = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const open = mode !== "closed";
  const name = state.profile.displayName;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => setMode("closed"), [pathname]);

  useEffect(() => {
    if (!open) return;
    if (pendingFocus.current !== null) {
      (pendingFocus.current === 0 ? profileItem : signOutItem).current?.focus();
      pendingFocus.current = null;
    }
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setMode("closed");
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, mode]);

  const openAndFocus = (index: number) => {
    if (open) (index === 0 ? profileItem : signOutItem).current?.focus();
    else pendingFocus.current = index;
    setMode("open");
  };

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = document.activeElement === profileItem.current ? 0 : 1;
    let index: number;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") index = 1 - current;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = 1;
    else return;
    event.preventDefault();
    (index === 0 ? profileItem : signOutItem).current?.focus();
  };

  return (
    <div
      ref={container}
      className="relative"
      onPointerEnter={(event) => {
        if (ready && event.pointerType === "mouse") setMode((current) => current === "closed" ? "hover" : current);
      }}
      onPointerLeave={() => {
        if (!container.current?.contains(document.activeElement)) setMode((current) => current === "hover" ? "closed" : current);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMode("closed");
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setMode("closed");
          trigger.current?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        disabled={!ready}
        aria-label="Open profile menu"
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-bg text-small font-medium text-accent-text hover:outline hover:outline-1 hover:outline-accent-fill disabled:cursor-wait"
        onClick={() => {
          if (mode === "open") setMode("closed");
          else openAndFocus(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus(event.key === "ArrowDown" ? 0 : 1);
          }
        }}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 w-56 max-w-[calc(100vw-40px)] pt-2">
          <div className="overflow-hidden rounded-card border border-border-strong bg-surface-2">
            <div className="border-b border-border px-4 py-3">
              <p className="break-words text-small font-medium text-text-primary">{name}</p>
              <p className="mt-0.5 break-all text-caption text-text-secondary">{account.loginId}</p>
            </div>
            <div id={menuId} role="menu" aria-label="Profile" className="p-1.5" onKeyDown={moveFocus}>
              <Link
                ref={profileItem}
                href="/settings#profile"
                role="menuitem"
                tabIndex={-1}
                className="flex min-h-11 items-center gap-3 rounded-default px-3 py-2 text-small text-text-primary hover:bg-surface-1 focus:bg-accent-bg"
                onClick={() => setMode("closed")}
              >
                <Icon name="user" size={18} />
                View profile
              </Link>
              <button
                ref={signOutItem}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={signingOut}
                aria-busy={signingOut}
                className="flex min-h-11 w-full items-center gap-3 rounded-default px-3 py-2 text-left text-small text-text-primary hover:bg-surface-1 focus:bg-accent-bg"
                onClick={signOut}
              >
                <Icon name="logout" size={18} />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
