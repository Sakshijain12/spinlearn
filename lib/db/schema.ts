// Database schema definitions (Drizzle ORM ready for production)
// Will be used with PostgreSQL + Drizzle ORM migration

export interface User {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  role: 'learner' | 'admin';
  emailReminders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  category: string;
  level: string;
  minutes: number;
  definition: string;
  embedding?: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  topicSlug: string;
  version: number;
  schemaVersion: string;
  content: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Spin {
  id: string;
  userId: string;
  topicSlug: string;
  localDate: string;
  respinsUsed: number;
  createdAt: string;
}

export interface Progress {
  userId: string;
  topicSlug: string;
  currentStep: number;
  completedAt?: string;
  activeSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  mode: 'quick_check' | 'full';
  answers: string;
  score: number;
  total: number;
  results: string;
  createdAt: string;
}

export interface Review {
  userId: string;
  topicSlug: string;
  dueAt: string;
  lastScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  userId: string;
  topicSlug: string;
  createdAt: string;
}

export interface Streak {
  userId: string;
  current: number;
  longest: number;
  lastActivityDate?: string;
  extendedToday: boolean;
  updatedAt: string;
}

export interface Mastery {
  userId: string;
  category: string;
  percent: number;
  learned: number;
  total: number;
  updatedAt: string;
}

export interface GenerationJob {
  id: string;
  topicSlug: string;
  status: 'queued' | 'generating' | 'validating' | 'pending_review' | 'completed' | 'failed';
  draftContent?: string;
  reviewerNotes?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
