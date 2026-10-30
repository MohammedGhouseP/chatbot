import {
  createBooking,
  isValidSessionId,
  SalesAgentError,
} from "@/lib/sales-agent";

type BookingRequest = {
  sessionId?: unknown;
  quote_id?: unknown;
  sku_id?: unknown;
  plan_code?: unknown;
  quantity?: unknown;
  promo_code?: unknown;
  final_price?: unknown;
};

export async function POST(request: Request) {
  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isValidSessionId(body.sessionId)) {
    return Response.json({ error: "A valid sessionId is required." }, { status: 400 });
  }
  if (
    typeof body.quote_id !== "string" ||
    typeof body.sku_id !== "string" ||
    typeof body.plan_code !== "string" ||
    typeof body.quantity !== "number" ||
    !Number.isInteger(body.quantity) ||
    (body.promo_code !== null &&
      body.promo_code !== "SAVE10" &&
      body.promo_code !== "CLOSENOW15") ||
    typeof body.final_price !== "number" ||
    !Number.isFinite(body.final_price)
  ) {
    return Response.json(
      { error: "Booking payload does not match the required schema." },
      { status: 400 },
    );
  }

  try {
    const booking = await createBooking(body.sessionId, {
      quote_id: body.quote_id,
      sku_id: body.sku_id,
      plan_code: body.plan_code,
      quantity: body.quantity,
      promo_code: body.promo_code,
      final_price: body.final_price,
    });
    return Response.json(booking, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SalesAgentError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Booking request failed.", error);
    return Response.json(
      { error: "The booking could not be completed. Please retry." },
      { status: 500 },
    );
  }
}
