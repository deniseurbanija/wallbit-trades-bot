// verify-fee.ts — Run: npx ts-node verify-fee.ts
// For the trade test: npx ts-node verify-fee.ts --trade

import { config } from 'dotenv';
config();

const BASE_URL = 'https://api.wallbit.io';
const API_KEY = process.env.WALLBIT_API_KEY;

if (!API_KEY) { console.error('Falta WALLBIT_API_KEY'); process.exit(1); }

const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };

const get = async (path: string) => {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

const post = async (path: string, body: unknown) => {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

async function checkTransactions() {
  console.log('\n=== Transacciones existentes (buscando campo fee) ===');
  const data = await get('/api/public/v1/transactions');
  console.log(JSON.stringify(data, null, 2));
}

async function testTrade(symbol = 'SPY', amount = 1) {
  console.log(`\n=== Test trade: $${amount} de ${symbol} ===`);
  console.log('⚠️  Esto ejecuta un trade real de $1');

  const before = await get('/api/public/v1/balance/checking');
  console.log(`Balance antes: $${before.data.available}`);

  if (before.data.available < amount) { console.error('Saldo insuficiente'); return; }

  const trade = await post('/api/public/v1/trades', {
    symbol, direction: 'BUY', currency: 'USD', order_type: 'MARKET', amount,
  });
  console.log('Respuesta del trade:', JSON.stringify(trade, null, 2));

  // Trade is async (status: REQUESTED) — wait for settlement before checking balance
  console.log('Esperando 3s para que el trade se ejecute...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const after = await get('/api/public/v1/balance/checking');
  console.log(`Balance después: $${after.data.available}`);

  const deducted = before.data.available - after.data.available;
  const impliedFee = deducted - amount;

  console.log(`\nDeducido del balance: $${deducted.toFixed(4)}`);
  console.log(`Monto del trade:      $${amount}`);
  console.log(`Fee implícito:        $${impliedFee.toFixed(6)}`);
  console.log(Math.abs(impliedFee) < 0.01 ? '✅ Fee = CERO' : `❌ Fee detectado: $${impliedFee.toFixed(4)}`);
}

async function main() {
  await checkTransactions();
  if (process.argv.includes('--trade')) await testTrade('SPY', 1);
  else console.log('\nPara el test con trade real: npx ts-node verify-fee.ts --trade');
}

main().catch(console.error);