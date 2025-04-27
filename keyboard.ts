import { InlineKeyboard } from 'grammy';

const mainCurrencies = ['USD', 'EUR', 'RUB', 'KZT', 'CNY', 'GBP'];

export const mainMenuKeyboard = new InlineKeyboard()
  .text('💱 Конвертировать валюту', 'convert_currency')
  .row()
  .text('📈 Узнать цену акции', 'get_stock_price')
  .row()
  .text('🚀 Узнать цену криптовалюты', 'get_crypto_price')
  .row()
  .text('🔔 Подписаться на уведомления', 'subscribe_menu');

export function currencySelectionKeyboard(prefix: string) {
  const keyboard = new InlineKeyboard();
  
  // Добавляем кнопки по 2 в ряд
  for (let i = 0; i < mainCurrencies.length; i += 2) {
    if (mainCurrencies[i+1]) {
      keyboard.text(mainCurrencies[i], `${prefix}_${mainCurrencies[i]}`)
        .text(mainCurrencies[i+1], `${prefix}_${mainCurrencies[i+1]}`)
        .row();
    } else {
      keyboard.text(mainCurrencies[i], `${prefix}_${mainCurrencies[i]}`);
    }
  }
  
  keyboard.row().text('🔙 Назад', 'main_menu');
  return keyboard;
}

export const backKeyboard = (backAction: string) => 
  new InlineKeyboard().text('🔙 Назад', backAction);