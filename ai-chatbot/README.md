# Sales Desk

A Gemini-powered sales assistant that loads a product catalog, calculates exact quantities and totals, follows a capped two-step discount policy, and requires confirmation of the latest quote before booking.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `GEMINI_API_KEY` in `.env.local` to a valid, rotated Google AI Studio key. Keep it server-side; do not use a `NEXT_PUBLIC_` prefix or commit the file.
3. From this directory, run:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## API

- `GET /api/catalog?sessionId=<id>` loads the catalog and marks it fetched for that chat session.
- `POST /api/chat` accepts `{ "sessionId", "messageId", "message", "visibleQuoteId" }`. The `visibleQuoteId` is the quote displayed to the user when they send the message; confirmations for an older quote cannot place a booking.
- `POST /api/bookings` accepts `{ "sessionId", "quote_id", "sku_id", "plan_code", "quantity", "promo_code", "final_price" }`. The server compares every value to the latest confirmed quote and rejects mismatches.

The chat client assigns a unique `messageId` for request deduplication. Repeated booking confirmations for the same quote return the existing booking. The server, not the model or browser, calculates quantities, chooses the only permitted promo code for the objection count, and computes the final price.

## Demo backend limitations

The sample catalog and booking endpoint are implemented locally because no remote API URL or credentials were supplied. Bookings and conversation state are held in server-process memory for this demo; they are not durable across restarts and are not shared across multiple server instances. The 1.2-second booking delay makes concurrent confirmation behavior observable. Before production, connect the handlers to the real catalog and booking services and enforce idempotency with a durable store shared by all instances.

Catalog amounts are displayed as numeric amounts without a currency symbol because the supplied catalog does not identify a currency.
