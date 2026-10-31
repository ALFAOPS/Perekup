// Бот «Перекуп» для своего сервера (VPS). Нужен Node.js 18+, сторонние пакеты не нужны.
// Работает через long polling: бот сам забирает сообщения у Telegram, домен и HTTPS не нужны.
// Запуск: BOT_TOKEN=... node server.mjs   (или через systemd, см. install.sh)

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error('Нет BOT_TOKEN'); process.exit(1); }

const GAME_URL = 'https://alfaops.github.io/Perekup/';
const PROMO_URL = 'https://alfaops.github.io/Perekup/promo.png';

const playButton = (text = '🎮 Играть') => ({ inline_keyboard: [[{ text, web_app: { url: GAME_URL } }]] });

const WELCOME =
  '<b>Перекуп</b> — пиксельный симулятор перекупа 🎮\n\n' +
  'Стипендия кончилась, в холодильнике два доширака. Дядя Валера говорит: «Купи дешевле, продай дороже — вся наука».\n\n' +
  '📦 Открывай коробки вслепую\n🤥 Ври продавцам (если не раскусят)\n⚔️ Уводи лоты у Барыги Стаса\n🏆 Собирай коллекции\n🔥 Заходи каждый день за наградой\n\n' +
  'Начни с барахолки в общаге — стань королём рынка 👇';
const HELP =
  'Жми «🎮 Играть» — игра откроется прямо в Telegram.\n\n' +
  'Прогресс сохраняется в твоём аккаунте Telegram, так что можно продолжить с любого телефона.\n\n' +
  'Команды:\n/start — начать\n/play — открыть игру\n/help — помощь';
const NUDGES = [
  'Барыга Стас уже на барахолке. А ты? 😏',
  'Говорят, сегодня на Барахле кто-то выставил коробку с антресолей… 📦',
  'Бабушки на лавке уже обсуждают, где ты пропадаешь 👵',
  'Дядя Валера звонил: «Племяш, хватит спать, лоты сами себя не перепродадут!»',
];

async function tg(method, body = {}) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}

async function onMessage(msg) {
  const chat = msg.chat.id;
  const cmd = (msg.text || '').trim().split(/[\s@]/)[0].toLowerCase();
  if (cmd === '/start') {
    const sent = await tg('sendPhoto', { chat_id: chat, photo: PROMO_URL, caption: WELCOME, parse_mode: 'HTML', reply_markup: playButton() });
    if (!sent.ok) await tg('sendMessage', { chat_id: chat, text: WELCOME, parse_mode: 'HTML', reply_markup: playButton() });
    return;
  }
  if (cmd === '/help') return tg('sendMessage', { chat_id: chat, text: HELP, reply_markup: playButton() });
  if (cmd === '/play') return tg('sendMessage', { chat_id: chat, text: 'Погнали 👇', reply_markup: playButton() });
  const nudge = NUDGES[Math.floor(Math.random() * NUDGES.length)];
  return tg('sendMessage', { chat_id: chat, text: nudge, reply_markup: playButton('🎮 На барахолку') });
}

async function main() {
  const me = await tg('getMe');
  if (!me.ok) { console.error('Токен не подходит:', me.description); process.exit(1); }
  await tg('deleteWebhook', { drop_pending_updates: false }); // вебхук и polling вместе не работают
  await tg('setMyCommands', { commands: [
    { command: 'start', description: 'Начать' }, { command: 'play', description: 'Открыть игру' }, { command: 'help', description: 'Помощь' }] });
  await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: '🎮 Играть', web_app: { url: GAME_URL } } });
  console.log(`Бот @${me.result.username} запущен`);

  let offset = 0;
  for (;;) {
    try {
      const r = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      if (!r.ok) { console.error('getUpdates:', r.description); await new Promise(s => setTimeout(s, 5000)); continue; }
      for (const u of r.result) {
        offset = u.update_id + 1;
        if (u.message) onMessage(u.message).catch(e => console.error(e));
      }
    } catch (e) {
      console.error('Сеть:', e.message);
      await new Promise(s => setTimeout(s, 5000));
    }
  }
}
main();
