import axios from "axios";
import {
  SecurityPrice,
  CurrencyRate,
  FinnhubQuoteResponse,
  AlphaVantageQuoteResponse,
  AlphaVantageCryptoResponse,
  ExchangeRateResponse,
} from "../types";

export class PriceMonitor {
  private readonly ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  private readonly FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
  private readonly EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;

  async getStockPrice(symbol: string): Promise<SecurityPrice> {
    try {
      // First try Finnhub
      try {
        const finnhubResponse = await axios.get<FinnhubQuoteResponse>(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`
        );

        return {
          symbol,
          price: finnhubResponse.data.c,
          change: finnhubResponse.data.d,
          changePercent: finnhubResponse.data.dp,
          currency: "USD", // Finnhub defaults to USD
          timestamp: new Date(finnhubResponse.data.t * 1000),
        };
      } catch (finnhubError) {
        console.log("Finnhub failed, falling back to Alpha Vantage");
      }

      // Fallback to Alpha Vantage
      const alphaResponse = await axios.get<AlphaVantageQuoteResponse>(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}`
      );

      const data = alphaResponse.data["Global Quote"];
      if (!data) throw new Error("No data returned from Alpha Vantage");

      return {
        symbol: data["01. symbol"],
        price: parseFloat(data["05. price"]),
        change: parseFloat(data["09. change"]),
        changePercent: parseFloat(data["10. change percent"].replace("%", "")),
        currency: data["08. currency"],
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch stock price: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getCryptoPrice(symbol: string): Promise<SecurityPrice> {
    try {
      const response = await axios.get<AlphaVantageCryptoResponse>(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${this.ALPHA_VANTAGE_API_KEY}`
      );

      const data = response.data["Realtime Currency Exchange Rate"];
      if (!data) throw new Error("No data returned from API");

      return {
        symbol: data["1. From_Currency Code"],
        price: parseFloat(data["5. Exchange Rate"]),
        change: 0, // Need separate API call for change
        changePercent: 0,
        currency: data["3. To_Currency Code"],
        timestamp: new Date(data["6. Last Refreshed"]),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch crypto price: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getCurrencyRate(from: string, to: string): Promise<CurrencyRate> {
    try {
      const response = await axios.get<ExchangeRateResponse>(
        `https://v6.exchangerate-api.com/v6/${this.EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`
      );

      if (!response.data.conversion_rate) throw new Error("No rate returned");

      return {
        from,
        to,
        rate: response.data.conversion_rate,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch currency rate: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getKZTExchangeRates(): Promise<CurrencyRate[]> {
    try {
      const response = await axios.get<ExchangeRateResponse>(
        `https://v6.exchangerate-api.com/v6/${this.EXCHANGE_RATE_API_KEY}/latest/KZT`
      );

      if (!response.data.conversion_rates) throw new Error("No rates returned");

      return Object.entries(response.data.conversion_rates).map(
        ([currency, rate]) => ({
          from: "KZT",
          to: currency,
          rate: rate as number,
          timestamp: new Date(),
        })
      );
    } catch (error) {
      throw new Error(
        `Failed to fetch KZT rates: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
