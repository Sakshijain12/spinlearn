import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentAccount } from "@/lib/auth/session";
import { trustedAuthOrigin } from "@/lib/auth/config";
import { getLearningStore } from "@/lib/learning-store";
import { LearningActionError, learningMutationSchema } from "@/lib/learning-actions";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const failure = (status: number, message: string) => NextResponse.json({ error: { message } }, { status, headers });

export async function GET() {
  try {
    const account = await currentAccount();
    if (!account) return failure(401, "Log in to view your saved progress.");
    return NextResponse.json(await getLearningStore().read(account), { headers });
  } catch (error) {
    console.error("Spinlearn could not load server progress.", error);
    return failure(503, "Your saved progress could not be loaded. Try again; your server data has not been replaced.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!trustedAuthOrigin(request.headers.get("origin"), request.nextUrl.origin)) return failure(403, "Open Spinlearn on its own website and try again.");
    const account = await currentAccount();
    if (!account) return failure(401, "Log in to save your progress.");
    if (!request.headers.get("content-type")?.startsWith("application/json")) return failure(415, "Send learning changes as JSON.");
    if (Number(request.headers.get("content-length")) > 2 * 1024 * 1024) return failure(413, "This learning backup is too large.");
    const text = await request.text();
    if (Buffer.byteLength(text) > 2 * 1024 * 1024) return failure(413, "This learning backup is too large.");
    const mutation = learningMutationSchema.parse(JSON.parse(text));
    const result = await getLearningStore().mutate(account, mutation);
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof LearningActionError) return failure(error.status, error.message);
    if (error instanceof ZodError || error instanceof SyntaxError) return failure(400, "The learning update is invalid. Reload and try again.");
    console.error("Spinlearn could not save server progress.", error);
    return failure(503, "Your change could not be saved to the server. Check your connection and try again.");
  }
}
