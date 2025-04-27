import { PriceMonitor } from "./priceMonitor";
import { Bot } from "grammy";
import { Subscription, SecurityPrice, MyContext } from "../types";

export class NotificationService {
  private priceMonitor: PriceMonitor;
  private bot: Bot<MyContext>;
  private subscriptions: Subscription[] = [];
  private priceHistory: Record<string, number[]> = {};

  constructor(priceMonitor: PriceMonitor, bot: Bot<MyContext>) {
    this.priceMonitor = priceMonitor;
    this.bot = bot;
    setInterval(this.checkSubscriptions.bind(this), 60000); // Check every minute
  }

  async subscribe(
    userId: number,
    symbol: string,
    threshold: number,
    direction: "up" | "down"
  ) {
    this.subscriptions.push({ userId, symbol, threshold, direction });
    await this.bot.api.sendMessage(
      userId,
      `✅ Вы подписались на уведомления для ${symbol}\n\n` +
        `Я сообщу вам, если цена изменится на ${threshold}% в направлении ${
          direction === "up" ? "вверх" : "вниз"
        }`
    );
  }

  async unsubscribe(userId: number, symbol: string) {
    this.subscriptions = this.subscriptions.filter(
      (sub) => !(sub.userId === userId && sub.symbol === symbol)
    );
  }

  private async checkSubscriptions() {
    for (const sub of this.subscriptions) {
      try {
        let priceData: SecurityPrice;
        if (sub.symbol.length <= 4) {
          priceData = await this.priceMonitor.getStockPrice(sub.symbol);
        } else {
          priceData = await this.priceMonitor.getCryptoPrice(sub.symbol);
        }

        // Track price history
        if (!this.priceHistory[sub.symbol]) {
          this.priceHistory[sub.symbol] = [];
        }
        this.priceHistory[sub.symbol].push(priceData.price);
        if (this.priceHistory[sub.symbol].length > 100) {
          this.priceHistory[sub.symbol].shift();
        }

        // Check threshold
        if (
          sub.direction === "up" &&
          priceData.changePercent >= sub.threshold
        ) {
          await this.sendNotification(
            sub.userId,
            `🚀 ${sub.symbol} is up ${priceData.changePercent.toFixed(2)}% to ${
              priceData.price
            } ${priceData.currency}`
          );
        } else if (
          sub.direction === "down" &&
          priceData.changePercent <= -sub.threshold
        ) {
          await this.sendNotification(
            sub.userId,
            `🔻 ${sub.symbol} is down ${Math.abs(
              priceData.changePercent
            ).toFixed(2)}% to ${priceData.price} ${priceData.currency}`
          );
        }
      } catch (error) {
        console.error(`Error checking subscription for ${sub.symbol}:`, error);
      }
    }
  }

  private async sendNotification(userId: number, message: string) {
    try {
      await this.bot.api.sendMessage(userId, message);
    } catch (error) {
      console.error(`Error sending notification to ${userId}:`, error);
    }
  }

  getTrend(symbol: string): string {
    const prices = this.priceHistory[symbol];
    if (!prices || prices.length < 2) return "No trend data available";

    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const change = ((lastPrice - prevPrice) / prevPrice) * 100;

    if (Math.abs(change) > 5) {
      return change > 0 ? "Strong uptrend 📈" : "Strong downtrend 📉";
    } else if (Math.abs(change) > 2) {
      return change > 0 ? "Mild uptrend ↗️" : "Mild downtrend ↘️";
    } else {
      return "Neutral trend ➡️";
    }
  }
}
