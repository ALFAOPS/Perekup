#!/usr/bin/env bash
# Установка бота «Перекуп» на сервер с Ubuntu/Debian. Запускать от root:
#   curl -fsSL https://raw.githubusercontent.com/ALFAOPS/Perekup/main/bot/install.sh | bash
set -euo pipefail

DIR=/opt/perekup-bot

# Node.js 20, если нет подходящего
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "== Ставлю Node.js 20"
  apt-get update -y && apt-get install -y curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "== Скачиваю бота"
mkdir -p "$DIR"
curl -fsSL https://raw.githubusercontent.com/ALFAOPS/Perekup/main/bot/server.mjs -o "$DIR/server.mjs"

if [ ! -f "$DIR/.env" ]; then
  read -rsp "Вставь токен бота от @BotFather (символы не видны) и нажми Enter: " TOKEN </dev/tty; echo
  printf 'BOT_TOKEN=%s\n' "$TOKEN" > "$DIR/.env"
  chmod 600 "$DIR/.env"
fi

id -u perekup >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin perekup
chown -R perekup:perekup "$DIR"

cat > /etc/systemd/system/perekup-bot.service <<EOF
[Unit]
Description=Telegram bot Perekup
After=network-online.target
Wants=network-online.target

[Service]
User=perekup
WorkingDirectory=$DIR
EnvironmentFile=$DIR/.env
ExecStart=$(command -v node) $DIR/server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable perekup-bot
systemctl restart perekup-bot
sleep 3
systemctl --no-pager status perekup-bot | head -n 12
echo
echo "== Готово. Логи: journalctl -u perekup-bot -f"
