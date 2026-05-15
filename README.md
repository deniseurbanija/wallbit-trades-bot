# Wallbit Investment Bot

Bot de Telegram que te pregunta periódicamente si querés invertir y, si aceptás, ejecuta la compra directamente desde la [API de Wallbit](https://api.wallbit.io).

---

## ¿Qué hace?

- Te manda un mensaje de Telegram preguntando si querés invertir
- Si decís que sí, te pide el monto y el símbolo (ej: `100 SPY`)
- Valida que el símbolo exista y que tengas saldo suficiente
- Muestra un resumen y ejecuta la compra si confirmás
- Por defecto te pregunta **todos los lunes a las 9:00 AM** (horario de Argentina)

---

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- Una cuenta en [Wallbit](https://wallbit.io) con API key
- Un bot de Telegram (Lo creas facilmente con [@BotFather](https://t.me/BotFather))

---

## Setup

### 1. Clonar e instalar dependencias

```bash
git clone git@github.com:deniseurbanija/wallbit-trades-bot.git
cd wallbit-api
npm install
```

### 2. Crear tu bot de Telegram

1. Abrí [@BotFather](https://t.me/BotFather) en Telegram
2. Escribí `/newbot` y seguí los pasos
3. Copiá el token que te da (formato: `123456789:AAH...`)

💡Para obtener tu Chat ID, mandá cualquier mensaje a [@userinfobot](https://t.me/userinfobot).

### 3. Configurar variables de entorno

Copiá el archivo de ejemplo y completá los valores:

```bash
cp .env.example .env
```

```env
WALLBIT_API_KEY=tu_api_key_de_wallbit
TELEGRAM_BOT_TOKEN=el_token_de_tu_bot
TELEGRAM_CHAT_ID=tu_chat_id
```

### 4. Correr el bot

```bash
npm run start:dev
```

---

## Cambiar cuándo llega el reminder

Por defecto el bot te pregunta **todos los lunes a las 9:00 AM (Argentina, UTC-3)**.

Para cambiarlo, editá el archivo [`src/telegram/scheduler/reminder.scheduler.ts`](src/telegram/scheduler/reminder.scheduler.ts):

```typescript
@Cron('0 9 * * 1', { timeZone: 'America/Argentina/Buenos_Aires' })
```

El formato es: `minuto hora día-del-mes mes día-de-la-semana`

| Quiero que me llegue...       | Cron expression |
|-------------------------------|-----------------|
| Lunes a las 9:00 AM (default) | `0 9 * * 1`     |
| Todos los días a las 8:00 AM  | `0 8 * * *`     |
| Primer día de cada mes        | `0 9 1 * *`     |
| Viernes a las 18:00           | `0 18 * * 5`    |

Para cambiar la zona horaria, reemplazá `America/Argentina/Buenos_Aires` por la tuya. Podés consultar la lista completa en [Wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) (ejemplos: `America/New_York`, `Europe/Madrid`, `UTC`).

---

## Comandos del bot

| Comando | Descripción |
|---------|-------------|
| `/start` | Muestra el mensaje de bienvenida |
| `/test`  | Dispara el reminder de inmediato (solo en modo desarrollo) |

---

## Estructura del proyecto

```
src/
  telegram/
    scenes/invest.scene.ts           ← flujo de conversación (wizard)
    wallbit/wallbit.service.ts       ← llamadas a la API de Wallbit
    scheduler/reminder.scheduler.ts  ← cron del reminder
    telegram.service.ts              ← bot de Telegram
```
