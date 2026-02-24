import { getCurrentUser } from "@/lib/auth";
import { loadChatContext } from "@/lib/chat/context-loader";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(50),
  projectId: z.string().uuid().optional(),
});

// Simple in-memory rate limiter (adequate for single-tenant)
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimiter.set(userId, recent);
  return true;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorised" }, { status: 401 });
    }
    if (user.role !== "client" || !user.clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Chat is temporarily unavailable" },
        { status: 503 }
      );
    }

    if (!checkRateLimit(user.id)) {
      return Response.json(
        { error: "You're sending messages too quickly. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, projectId } = parsed.data;

    const context = await loadChatContext(user.clientId, projectId);
    const systemPrompt = buildSystemPrompt(context);

    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            new TextEncoder().encode(
              "\n\n[I ran into an issue. Please try again.]"
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Digi is busy right now. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: "Digi is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
