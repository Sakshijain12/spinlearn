import { z } from "zod";

export const loginIdSchema = z.string().trim().min(3, "Use at least 3 characters for your login ID.")
  .max(64, "Use at most 64 characters for your login ID.")
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9@._-]*$/, "Use letters, numbers, dots, underscores, hyphens, or @ in your login ID.")
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  loginId: loginIdSchema,
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
});

export const registrationSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, "Enter a display name.").max(40, "Use at most 40 characters for your display name."),
  password: z.string().min(12, "Use a password of at least 12 characters.").max(128, "Use at most 128 characters for your password."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"], message: "The passwords do not match.",
});

export const accountSchema = z.object({
  id: z.string().uuid(),
  loginId: z.string(),
  displayName: z.string(),
});

export const authResponseSchema = z.object({ account: accountSchema });
export type Account = z.infer<typeof accountSchema>;
