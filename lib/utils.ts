export function generateId(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("Secure random number generation is unavailable.");
  }

  // getRandomValues also works on HTTP origins where randomUUID is unavailable.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Set the UUIDv4 version and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getTodayDate(timezone: string, now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function calculateStreakUpdate(
  lastActivityDate: string | null,
  today: string
): { current: number; extended_today: boolean; lastActivityDate: string } {
  if (!lastActivityDate) {
    // First activity
    return {
      current: 1,
      extended_today: false,
      lastActivityDate: today,
    };
  }

  const last = new Date(lastActivityDate);
  const todayDate = new Date(today);
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastStr = last.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const todayStr = todayDate.toISOString().split("T")[0];

  if (lastStr === todayStr) {
    // Already active today
    return {
      current: 0, // No change
      extended_today: false,
      lastActivityDate: today,
    };
  } else if (lastStr === yesterdayStr) {
    // Active yesterday, continuing streak
    return {
      current: 1, // Increment
      extended_today: false,
      lastActivityDate: today,
    };
  } else {
    // Streak broken, start new
    return {
      current: 1,
      extended_today: false,
      lastActivityDate: today,
    };
  }
}

export function calculateReviewDueDate(lastScore: number): Date {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 1);

  // Spaced repetition: harder topics get sooner reviews
  let daysUntilReview = 3;
  if (lastScore < 0.4) {
    daysUntilReview = 1;
  } else if (lastScore < 0.7) {
    daysUntilReview = 2;
  } else if (lastScore >= 0.9) {
    daysUntilReview = 7;
  }

  const reviewDate = new Date(baseDate);
  reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
  return reviewDate;
}

export function calculateMastery(
  learned: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((learned / total) * 100);
}

export function validateMagicLink(token: string): boolean {
  // In production, validate against stored tokens with expiry
  return token.length > 0;
}

export function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function sampleTopicPool(
  topics: Array<{ slug: string; name: string }>,
  count: number = 41
): { decoys: string[]; chosenIndex: number } {
  if (topics.length === 0) {
    throw new Error("No topics available");
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new Error("A reel needs at least one decoy before the chosen topic.");
  }
  const chosen = topics[Math.floor(Math.random() * topics.length)];
  const others = topics.filter((t) => t.slug !== chosen.slug);
  const pool = others.length ? others : topics;
  const decoys = Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)].name);
  const chosenIndex = count - 1;
  return {
    decoys: [...decoys.slice(0, chosenIndex), chosen.name, decoys[chosenIndex]],
    chosenIndex,
  };
}

export function formatDateForDisplay(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return formatter.format(date);
}

export function getTopicsByCategory(
  topics: Array<{ category: string; [key: string]: unknown }>,
  category: string
): Array<{ category: string; [key: string]: unknown }> {
  if (category === "All") {
    return topics;
  }
  return topics.filter((t) => t.category === category);
}

export function getTopicsByLevel(
  topics: Array<{ level: string; [key: string]: unknown }>,
  level: string
): Array<{ level: string; [key: string]: unknown }> {
  if (level === "All") {
    return topics;
  }
  return topics.filter((t) => t.level === level);
}

export function formatErrorResponse(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}
