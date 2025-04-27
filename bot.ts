import { Bot, InlineKeyboard, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import { PriceMonitor } from "./services/priceMonitor";
import { NotificationService } from "./services/notificationService";
import {
  mainMenuKeyboard,
  currencySelectionKeyboard,
  backKeyboard,
} from "./keyboard";
import { MyContext, SessionData } from "./types";

dotenv.config();

const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

const priceMonitor = new PriceMonitor();
const notificationService = new NotificationService(priceMonitor, bot);

bot.use(
  session({
    initial: (): SessionData => ({
      conversion: { from: null, to: null, amount: null },
      subscription: { symbol: null, threshold: null, direction: null },
      waitingFor: null,
    }),
  })
);

// Обработчик команды /start
bot.command("start", async (ctx) => {
  await ctx.reply(
    `📊 <b>Финансовый помощник</b>\n\n` +
      `Я могу показывать курсы валют, акций и криптовалют в реальном времени.`,
    {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard,
    }
  );
});

// Главное меню
bot.callbackQuery("main_menu", async (ctx) => {
  await ctx.editMessageText(`📊 <b>Главное меню</b>\n\nВыберите действие:`, {
    parse_mode: "HTML",
    reply_markup: mainMenuKeyboard,
  });
  ctx.session.waitingFor = null;
});

bot.callbackQuery("convert_currency", async (ctx) => {
  ctx.session.conversion = { from: null, to: null, amount: null };
  ctx.session.waitingFor = null;

  await ctx.editMessageText(
    `💱 <b>Конвертация валют</b>\n\nВыберите исходную валюту:`,
    {
      parse_mode: "HTML",
      reply_markup: currencySelectionKeyboard("select_from"),
    }
  );
});

bot.callbackQuery(/^select_from_(.+)$/, async (ctx) => {
  const currency = ctx.match[1];
  ctx.session.conversion.from = currency;
  ctx.session.waitingFor = null;

  await ctx.editMessageText(
    `💱 Конвертация из <b>${currency}</b>\n\nВыберите целевую валюту:`,
    {
      parse_mode: "HTML",
      reply_markup: currencySelectionKeyboard("select_to"),
    }
  );
});

bot.callbackQuery(/^select_to_(.+)$/, async (ctx) => {
  const currency = ctx.match[1];
  ctx.session.conversion.to = currency;
  ctx.session.waitingFor = "conversion_amount";

  await ctx.editMessageText(
    `💱 Конвертация из <b>${ctx.session.conversion.from}</b> в <b>${currency}</b>\n\n` +
      `Введите сумму для конвертации:`,
    {
      parse_mode: "HTML",
      reply_markup: backKeyboard("back_to_currency_selection"),
    }
  );
});

bot.callbackQuery("back_to_currency_selection", async (ctx) => {
  ctx.session.waitingFor = null;
  await ctx.editMessageText(
    `💱 Конвертация из <b>${ctx.session.conversion.from}</b>\n\nВыберите целевую валюту:`,
    {
      parse_mode: "HTML",
      reply_markup: currencySelectionKeyboard("select_to"),
    }
  );
});

bot.callbackQuery("get_stock_price", async (ctx) => {
  ctx.session.waitingFor = "stock_ticker";

  await ctx.editMessageText(
    "📈 <b>Узнать цену акции</b>\n\nВведите тикер акции (например: AAPL, TSLA, GAZP):",
    {
      parse_mode: "HTML",
      reply_markup: backKeyboard("main_menu"),
    }
  );
});

bot.callbackQuery("get_crypto_price", async (ctx) => {
  ctx.session.waitingFor = "crypto_ticker";

  await ctx.editMessageText(
    "🚀 <b>Узнать цену криптовалюты</b>\n\nВведите тикер криптовалюты (например: BTC, ETH, SOL):",
    {
      parse_mode: "HTML",
      reply_markup: backKeyboard("main_menu"),
    }
  );
});

bot.callbackQuery("subscribe_menu", async (ctx) => {
  ctx.session.waitingFor = "subscribe_ticker";
  ctx.session.subscription = { symbol: null, threshold: null, direction: null };

  await ctx.editMessageText(
    "🔔 <b>Подписаться на уведомления</b>\n\nВведите тикер акции/криптовалюты:",
    {
      parse_mode: "HTML",
      reply_markup: backKeyboard("main_menu"),
    }
  );
});

bot.callbackQuery(/^subscribe_direction_(up|down)$/, async (ctx) => {
  const direction = ctx.match[1] as "up" | "down";

  if (
    !ctx.session.subscription?.symbol ||
    !ctx.session.subscription?.threshold
  ) {
    await ctx.answerCallbackQuery("Ошибка: данные подписки не найдены");
    return;
  }

  try {
    await notificationService.subscribe(
      ctx.from.id,
      ctx.session.subscription.symbol,
      ctx.session.subscription.threshold,
      direction
    );

    await ctx.editMessageText(
      `✅ Вы успешно подписались на уведомления для ${ctx.session.subscription.symbol}\n\n` +
        `Я сообщу вам, когда цена изменится на ${
          ctx.session.subscription.threshold
        }% в направлении ${direction === "up" ? "роста 📈" : "падения 📉"}`,
      { reply_markup: mainMenuKeyboard }
    );
  } catch (error) {
    await ctx.editMessageText(
      "❌ Не удалось оформить подписку. Попробуйте позже."
    );
  }

  ctx.session.subscription = { symbol: null, threshold: null, direction: null };
  ctx.session.waitingFor = null;
});

// Обработка текстовых сообщений
bot.on("message:text", async (ctx) => {
  if (!ctx.session.waitingFor) return;

  const text = ctx.message.text.trim().toUpperCase();

  if (ctx.session.waitingFor === "conversion_amount") {
    const amount = parseFloat(text);
    if (isNaN(amount)) {
      await ctx.reply("Пожалуйста, введите корректное число");
      return;
    }

    try {
      const rate = await priceMonitor.getCurrencyRate(
        ctx.session.conversion.from!,
        ctx.session.conversion.to!
      );

      const converted = amount * rate.rate;
      const emoji = rate.rate > 1 ? "📈" : rate.rate < 1 ? "📉" : "➡️";

      await ctx.reply(
        `💱 <b>Результат конвертации</b>\n\n` +
          `${amount} ${ctx.session.conversion.from} = ` +
          `<b>${converted.toFixed(2)} ${
            ctx.session.conversion.to
          }</b> ${emoji}\n` +
          `Курс: 1 ${ctx.session.conversion.from} = ${rate.rate.toFixed(6)} ${
            ctx.session.conversion.to
          }`,
        {
          parse_mode: "HTML",
          reply_markup: mainMenuKeyboard,
        }
      );
    } catch (error) {
      await ctx.reply("Ошибка при конвертации. Попробуйте позже.");
    }
  } else if (ctx.session.waitingFor === "stock_ticker") {
    try {
      const priceData = await priceMonitor.getStockPrice(text);
      const emoji = priceData.changePercent >= 0 ? "📈" : "📉";

      await ctx.reply(
        `📊 <b>${priceData.symbol}</b>\n` +
          `Цена: <b>${priceData.price.toFixed(2)} ${priceData.currency}</b>\n` +
          `Изменение: ${priceData.change.toFixed(
            2
          )} (${priceData.changePercent.toFixed(2)}%) ${emoji}`,
        {
          parse_mode: "HTML",
          reply_markup: mainMenuKeyboard,
        }
      );
    } catch (error) {
      await ctx.reply(
        "❌ Не удалось получить данные. Проверьте правильность тикера и попробуйте снова."
      );
    }
  } else if (ctx.session.waitingFor === "crypto_ticker") {
    try {
      const priceData = await priceMonitor.getCryptoPrice(text);
      const emoji = priceData.changePercent >= 0 ? "🚀" : "💸";

      await ctx.reply(
        `🪙 <b>${priceData.symbol}</b>\n` +
          `Цена: <b>${priceData.price.toFixed(6)} ${
            priceData.currency
          }</b> ${emoji}`,
        {
          parse_mode: "HTML",
          reply_markup: mainMenuKeyboard,
        }
      );
    } catch (error) {
      await ctx.reply(
        "❌ Не удалось получить данные. Проверьте правильность тикера и попробуйте снова."
      );
    }
  } else if (ctx.session.waitingFor === "subscribe_ticker") {
    ctx.session.subscription.symbol = text;
    ctx.session.waitingFor = "subscribe_threshold";

    await ctx.reply(
      `🔔 Подписка на ${text}\n\n` +
        "На сколько % должно измениться значение, чтобы вы получили уведомление? (например: 5)",
      { reply_markup: backKeyboard("subscribe_menu") }
    );
    return;
  } else if (ctx.session.waitingFor === "subscribe_threshold") {
    const threshold = parseFloat(text);
    if (isNaN(threshold)) {
      await ctx.reply("Пожалуйста, введите корректное число");
      return;
    }

    ctx.session.subscription.threshold = threshold;
    ctx.session.waitingFor = null;

    await ctx.reply(
      "Вы хотите получать уведомления при росте или падении цены?",
      {
        reply_markup: new InlineKeyboard()
          .text("Рост 📈", "subscribe_direction_up")
          .text("Падение 📉", "subscribe_direction_down"),
      }
    );
    return;
  }

  ctx.session.waitingFor = null;
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
