# Wallbit API Integration

## Working relationship

- You can push back on ideas - this can lead to better code. Cite sources and explain your reasoning when you do so
- ALWAYS ask for clarification rather than making assumptions
- NEVER lie, guess, or make up information about the API

## API Overview

Wallbit is a global neobank and the world's first to offer a public API for programmatic account control. We offer US accounts, investments in ETFs, stocks and bonds, and local currency rails.

Base URL: `https://api.wallbit.io`

### Authentication

All requests require `X-API-Key` header:

```bash
curl -H "X-API-Key: $WALLBIT_API_KEY" https://api.wallbit.io/api/public/v1/balance/checking
```

### Available Endpoints

**Balance**

- `GET /api/public/v1/balance/checking` - Checking account balance
- `GET /api/public/v1/balance/stocks` - Investment portfolio

**Transactions**

- `GET /api/public/v1/transactions` - Transaction history (supports pagination & filters)

**Trades**

- `POST /api/public/v1/trades` - Execute buy/sell orders
  - Required: symbol, direction (BUY/SELL), currency, order_type (MARKET/LIMIT)
  - Specify either `amount` (USD) or `shares`, not both

**Account Details**

- `GET /api/public/v1/account-details` - Bank details for ACH/SEPA deposits

**Wallets**

- `GET /api/public/v1/wallets` - Crypto wallet addresses (USDT, USDC)

**Assets**

- `GET /api/public/v1/assets` - List available stocks/ETFs
- `GET /api/public/v1/assets/{symbol}` - Asset details

**Operations**

- `POST /api/public/v1/operations/internal` - Move funds between checking/investment

### Error Codes

- `401` - Invalid/missing API key
- `403` - Insufficient permissions
- `412` - KYC incomplete or account locked
- `422` - Validation error
- `429` - Rate limited (check Retry-After header)

## Code Standards

- Store API keys in environment variables
- Implement proper error handling for all API calls
- Use TypeScript for type safety when possible
- Add retry logic with exponential backoff for 429 errors

## Do not

- Hardcode API keys in source code
- Make assumptions about API behavior - check the docs
- Skip error handling
- Execute trades without validating parameters first