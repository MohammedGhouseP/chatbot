import {
  isValidSessionId,
  processChatMessage,
  SalesAgentError,
} from "@/lib/sales-agent";

type ChatRequest = {
  sessionId?: unknown;
  messageId?: unknown;
  message?: unknown;
  visibleQuoteId?: unknown;
};

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isValidSessionId(body.sessionId)) {
    return Response.json({ error: "A valid sessionId is required." }, { status: 400 });
  }
  if (
    typeof body.messageId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(body.messageId)
  ) {
    return Response.json({ error: "A valid messageId is required." }, { status: 400 });
  }
  if (
    typeof body.message !== "string" ||
    body.message.trim().length === 0 ||
    body.message.length > 2000
  ) {
    return Response.json(
      { error: "Message must contain 1 to 2,000 characters." },
      { status: 400 },
    );
  }
  if (
    body.visibleQuoteId !== null &&
    body.visibleQuoteId !== undefined &&
    (typeof body.visibleQuoteId !== "string" ||
      body.visibleQuoteId.length > 120)
  ) {
    return Response.json({ error: "Invalid visibleQuoteId." }, { status: 400 });
  }

  try {
    const result = await processChatMessage({
      sessionId: body.sessionId,
      messageId: body.messageId,
      message: body.message.trim(),
      visibleQuoteId:
        typeof body.visibleQuoteId === "string" ? body.visibleQuoteId : null,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SalesAgentError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Sales chat request failed.", error);
    return Response.json(
      { error: "The sales assistant could not process that message. Please retry." },
      { status: 502 },
    );
  }
}
