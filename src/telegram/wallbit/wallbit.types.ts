export interface AssetDetails {
  symbol: string;
  name: string;
  price: number;
  currency: string;
}

export interface CheckingBalance {
  available: number;
  currency: string;
}

export interface TradeResult {
  id?: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  amount: number;
  shares: number;
  status: string;
  created_at: string;
}

export interface TradeRequest {
  symbol: string;
  direction: 'BUY';
  currency: 'USD';
  order_type: 'MARKET';
  amount: number;
}
