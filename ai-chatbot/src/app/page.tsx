"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type CatalogProduct = {
  name: string;
  max_capacity_per_unit: number;
  plans: Record<string, number>;
};

type Quote = {
  quote_id: string;
  sku_id: string;
  product_name: string;
  plan_code: string;
  quantity: number;
  max_capacity_per_unit: number;
  requirement_count: number;
  requirement_label: string;
  standard_price: number;
  promo_code: "SAVE10" | "CLOSENOW15" | null;
  discount_percent: 0 | 10 | 15;
  final_price: number;
};

type Booking = {
  booking_id: string;
  quote_id: string;
  sku_id: string;
  plan_code: string;
  quantity: number;
  promo_code: "SAVE10" | "CLOSENOW15" | null;
  final_price: number;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  quote?: Quote | null;
  booking?: Booking;
  time: string;
};

const initialMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! Tell me what you need and how many rooms, people or units you want covered. I'll check the catalog, explain the exact total and only book after you confirm.",
  time: "Now",
};

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function formatTime(): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="quote-card">
      <div className="quote-card-heading">
        <span className="quote-icon" aria-hidden="true">
          Q
        </span>
        <div>
          <strong>Order summary</strong>
          <span>Quote {quote.quote_id.split("-").at(-1)}</span>
        </div>
      </div>
      <div className="quote-details">
        <div>
          <span>Package</span>
          <strong>{quote.product_name}</strong>
        </div>
        <div>
          <span>Plan</span>
          <strong>{quote.plan_code}</strong>
        </div>
        <div>
          <span>Quantity</span>
          <strong>
            {quote.quantity} unit{quote.quantity === 1 ? "" : "s"}
          </strong>
        </div>
        <div>
          <span>Coverage</span>
          <strong>
            {quote.requirement_count} {quote.requirement_label}
          </strong>
        </div>
      </div>
      <div className="quote-total">
        <div>
          <span>Standard price</span>
          <strong>{formatPrice(quote.standard_price)}</strong>
        </div>
        {quote.promo_code && (
          <div className="discount-line">
            <span>
              {quote.promo_code} / {quote.discount_percent}% off
            </span>
            <strong>-{formatPrice(quote.standard_price - quote.final_price)}</strong>
          </div>
        )}
        <div className="final-total">
          <span>Total</span>
          <strong>{formatPrice(quote.final_price)}</strong>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [catalog, setCatalog] = useState<Record<string, CatalogProduct>>({});
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [catalogError, setCatalogError] = useState("");
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef("");

  useEffect(() => {
    void startConversation();
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingCount]);

  async function startConversation() {
    const newSessionId = crypto.randomUUID();
    activeSessionRef.current = newSessionId;
    setSessionId(newSessionId);
    setLoadingCatalog(true);
    setCatalogError("");

    try {
      const response = await fetch(
        `/api/catalog?sessionId=${encodeURIComponent(newSessionId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("The catalog could not be loaded. Please try again.");
      }

      const data = (await response.json()) as Record<string, CatalogProduct>;
      if (activeSessionRef.current !== newSessionId) return;
      setCatalog(data);
    } catch (error) {
      if (activeSessionRef.current !== newSessionId) return;
      setCatalogError(
        error instanceof Error
          ? error.message
          : "The catalog could not be loaded. Please try again.",
      );
    } finally {
      if (activeSessionRef.current === newSessionId) {
        setLoadingCatalog(false);
      }
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !sessionId || !catalog || loadingCatalog) return;

    const requestSessionId = sessionId;
    const messageId = crypto.randomUUID();
    const visibleQuoteId = quote?.quote_id ?? null;
    setDraft("");
    setMessages((current) => [
      ...current,
      {
        id: messageId,
        role: "user",
        content: message,
        time: formatTime(),
      },
    ]);
    setPendingCount((current) => current + 1);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messageId,
          message,
          visibleQuoteId,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
        quote?: Quote | null;
        booking?: Booking;
      };

      if (activeSessionRef.current !== requestSessionId) return;
      if (!response.ok) {
        throw new Error(result.error ?? "The assistant could not respond.");
      }

      if ("quote" in result) setQuote(result.quote ?? null);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message ?? "I could not prepare a response.",
          quote: result.quote,
          booking: result.booking,
          time: formatTime(),
        },
      ]);
    } catch (error) {
      if (activeSessionRef.current !== requestSessionId) return;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant could not respond. Please retry.",
          time: formatTime(),
        },
      ]);
    } finally {
      if (activeSessionRef.current === requestSessionId) {
        setPendingCount((current) => Math.max(0, current - 1));
      }
    }
  }

  function startNewChat() {
    setMessages([initialMessage]);
    setQuote(null);
    setDraft("");
    setPendingCount(0);
    setCatalog({});
    void startConversation();
  }

  const canSend = Boolean(sessionId && !loadingCatalog && !catalogError);
  const hasBooking = messages.some((message) => message.booking);

  return (
    <main className="sales-app">
      <aside className="catalog-panel">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            S
          </div>
          <div>
            <span className="brand-name">Sales desk</span>
            <span className="brand-caption">PERSONAL SHOPPING</span>
          </div>
        </div>

        <div className="catalog-intro">
          <span className="eyebrow">YOUR CATALOG</span>
          <h1>Find the right fit.</h1>
          <p>Compare packages and plans with help from your sales assistant.</p>
        </div>

        <div className="catalog-list">
          {Object.entries(catalog).map(([skuId, product], index) => (
            <article className="catalog-item" key={skuId}>
              <div className={`product-art product-art-${index + 1}`}>
                <span aria-hidden="true">{["A", "M", "H"][index % 3]}</span>
              </div>
              <div className="product-copy">
                <span className="product-sku">{skuId.replace("SKU_", "")}</span>
                <h2>{product.name}</h2>
                <p>
                  Up to {product.max_capacity_per_unit} per unit
                </p>
                <div className="plan-list">
                  {Object.entries(product.plans).map(([plan, price]) => (
                    <span className="plan-chip" key={plan}>
                      {plan} <b>{formatPrice(price)}</b>
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {loadingCatalog && (
            <div className="catalog-loading">Loading catalog...</div>
          )}
        </div>

        <div className="catalog-footer">
          <span className="status-dot" />
          Prices and availability are checked from the catalog
        </div>
      </aside>

      <section className="conversation">
        <header className="conversation-header">
          <div className="assistant-identity">
            <div className="assistant-avatar" aria-hidden="true">
              <span />
            </div>
            <div>
              <strong>Sales assistant</strong>
              <span>
                <i className="status-dot" />
                {loadingCatalog ? "Connecting..." : "Ready to help"}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <div className="secure-label">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4.5 7V5.25a3.5 3.5 0 0 1 7 0V7M3.5 7h9v7h-9z" />
              </svg>
              <span>Server-validated</span>
            </div>
            <button
              className="new-chat-button"
              onClick={startNewChat}
              type="button"
              aria-label="Start a new conversation"
              title="Start a new conversation"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="conversation-body">
          <div className="conversation-date">
            <span />
            <time>Today</time>
            <span />
          </div>

          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article
                className={`message-row ${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <div className="message-avatar" aria-hidden="true">
                    S
                  </div>
                )}
                <div className="message-stack">
                  <div className="message-bubble">
                    {message.content}
                    {message.booking && (
                      <div className="booking-receipt">
                        <span className="receipt-check" aria-hidden="true">
                                    OK
                        </span>
                        <div>
                          <span>Booking reference</span>
                          <strong>{message.booking.booking_id}</strong>
                          <small>
                            {message.booking.quantity} unit
                            {message.booking.quantity === 1 ? "" : "s"} /{" "}
                            {message.booking.plan_code} /{" "}
                            {formatPrice(message.booking.final_price)}
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                  {message.quote && <QuoteCard quote={message.quote} />}
                  <span className="message-time">{message.time}</span>
                </div>
              </article>
            ))}

            {pendingCount > 0 && (
              <div className="message-row assistant">
                <div className="message-avatar" aria-hidden="true">
                  S
                </div>
                <div className="typing-indicator" aria-label="Assistant is thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>
        </div>

        <div className="composer-wrap">
          {quote && !hasBooking && (
            <div className="confirmation-hint">
                  <span className="hint-check" aria-hidden="true">
                    OK
              </span>
              <span>
                    Quote ready <b>{formatPrice(quote.final_price)}</b> - Confirm
                these exact details to book
              </span>
            </div>
          )}
          {catalogError && (
            <div className="catalog-error" role="alert">
              {catalogError}
              <button onClick={startNewChat} type="button">
                Retry
              </button>
            </div>
          )}
          <form className="composer" onSubmit={sendMessage}>
            <label className="visually-hidden" htmlFor="message-input">
              Message the sales assistant
            </label>
            <input
              id="message-input"
              autoComplete="off"
              maxLength={2000}
              placeholder={
                loadingCatalog
                  ? "Connecting to catalog..."
                  : "Ask about a package, plan, or price..."
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!canSend}
            />
            <span className="enter-hint">Enter</span>
            <button
              className="send-button"
              type="submit"
              disabled={!canSend || !draft.trim()}
              aria-label="Send message"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 10h13M10 4l6 6-6 6" />
              </svg>
            </button>
          </form>
          <p className="composer-note">
            The assistant verifies quantities and totals before any booking.
          </p>
        </div>
      </section>
    </main>
  );
}
