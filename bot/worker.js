// Бот «Перекуп» для Cloudflare Workers.
// Работает через вебхук: Telegram сам присылает сюда сообщения, сервер держать не нужно.
// Переменные окружения (Settings → Variables and Secrets):
//   BOT_TOKEN      — токен от @BotFather (тип Secret)
//   WEBHOOK_SECRET — любая длинная строка из букв и цифр (тип Secret)

const GAME_URL = 'https://alfaops.github.io/Perekup/';
const PROMO_URL = 'https://alfaops.github.io/Perekup/welcome.png';

const playButton = (text = '🎮 Играть') => ({
  inline_keyboard: [[{ text, web_app: { url: GAME_URL } }]],
});

const WELCOME =
  '<b>Перекуп</b> — пиксельный симулятор перекупа 🎮\n\n' +
  'Стипендия кончилась, в холодильнике два доширака. Дядя Валера говорит: «Купи дешевле, продай дороже — вся наука».\n\n' +
  '📦 Открывай коробки вслепую\n' +
  '🤥 Ври продавцам (если не раскусят)\n' +
  '⚔️ Уводи лоты у Барыги Стаса\n' +
  '🏆 Собирай коллекции\n' +
  '🔥 Заходи каждый день за наградой\n\n' +
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

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function onMessage(env, msg) {
  const chat = msg.chat.id;
  const text = (msg.text || '').trim();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/start') {
    const sent = await tg(env, 'sendPhoto', {
      chat_id: chat, photo: PROMO_URL, caption: WELCOME, parse_mode: 'HTML', reply_markup: playButton(),
    });
    // если картинка вдруг не загрузилась — отправим просто текст
    if (!sent.ok) await tg(env, 'sendMessage', { chat_id: chat, text: WELCOME, parse_mode: 'HTML', reply_markup: playButton() });
    return;
  }
  if (cmd === '/help') return tg(env, 'sendMessage', { chat_id: chat, text: HELP, reply_markup: playButton() });
  if (cmd === '/play') return tg(env, 'sendMessage', { chat_id: chat, text: 'Погнали 👇', reply_markup: playButton() });

  // на любое другое сообщение — шутка и кнопка
  const nudge = NUDGES[Math.floor(Math.random() * NUDGES.length)];
  return tg(env, 'sendMessage', { chat_id: chat, text: nudge, reply_markup: playButton('🎮 На барахолку') });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Однократная настройка: открой https://<адрес-воркера>/setup?key=<WEBHOOK_SECRET>
    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('нет доступа', { status: 403 });
      const hook = await tg(env, 'setWebhook', {
        url: `${url.origin}/webhook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message'],
      });
      await tg(env, 'setMyCommands', {
        commands: [
          { command: 'start', description: 'Начать' },
          { command: 'play', description: 'Открыть игру' },
          { command: 'help', description: 'Помощь' },
        ],
      });
      await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: '🎮 Играть', web_app: { url: GAME_URL } } });
      return new Response(hook.ok ? 'Готово! Бот подключён ✅' : 'Ошибка: ' + JSON.stringify(hook), {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    if (url.pathname === '/webhook' && request.method === 'POST') {
      // принимаем запросы только от Telegram
      if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const update = await request.json();
      if (update.message) {
        try { await onMessage(env, update.message); } catch (e) { console.log(e); }
      }
      return new Response('ok');
    }

    return new Response('Бот «Перекуп» работает 🎮', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
