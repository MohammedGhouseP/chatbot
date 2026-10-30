import {
  CATALOG,
  isValidSessionId,
  markCatalogLoaded,
} from "@/lib/sales-agent";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  if (sessionId) {
    if (!isValidSessionId(sessionId)) {
      return Response.json({ error: "Invalid sessionId." }, { status: 400 });
    }
    markCatalogLoaded(sessionId);
  }

  return Response.json(CATALOG, {
    headers: { "Cache-Control": "no-store" },
  });
}
