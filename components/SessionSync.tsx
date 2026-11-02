"use client";

import { useEffect } from "react";
import { AUTH_EVENT_KEY } from "@/lib/account-storage";

export function SessionSync() {
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === AUTH_EVENT_KEY) window.location.reload();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  return null;
}
