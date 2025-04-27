import { SessionFlavor } from "grammy";
import { Context } from "grammy";

export interface SecurityPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  timestamp: Date;
}

export interface SessionData {
  conversion: {
    from: string | null;
    to: string | null;
    amount: number | null;
  };
  subscription: {
    symbol: string | null;
    threshold: number | null;
    direction: "up" | "down" | null;
  };
  waitingFor: string | null;
}
export type MyContext = Context & SessionFlavor<SessionData>;

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

export interface Subscription {
  userId: number;
  symbol: string;
  threshold: number;
  direction: "up" | "down";
}

export interface UserSession {
  userId: number;
  subscribedSymbols: string[];
}

export interface FinnhubQuoteResponse {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  t: number; // timestamp
}

export interface AlphaVantageQuoteResponse {
  "Global Quote": {
    "01. symbol": string;
    "05. price": string;
    "09. change": string;
    "10. change percent": string;
    "08. currency": string;
  };
}

export interface AlphaVantageCryptoResponse {
  "Realtime Currency Exchange Rate": {
    "1. From_Currency Code": string;
    "3. To_Currency Code": string;
    "5. Exchange Rate": string;
    "6. Last Refreshed": string;
  };
}

export interface ExchangeRateResponse {
  conversion_rate: number;
  conversion_rates: Record<string, number>;
}
