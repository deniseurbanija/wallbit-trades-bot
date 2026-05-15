import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AssetDetails,
  CheckingBalance,
  TradeRequest,
  TradeResult,
} from './wallbit.types';

export class WallbitApiException extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly statusCode?: number,
  ) {
    super(userMessage);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.response?.status === 429 && attempt < maxAttempts) {
        const retryAfter = parseInt(err.response.headers?.['retry-after'] ?? '5', 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retry attempts reached');
}

@Injectable()
export class WallbitService {
  private readonly logger = new Logger(WallbitService.name);

  constructor(private readonly http: HttpService) {}

  async getAsset(symbol: string): Promise<AssetDetails> {
    try {
      const res = await withRetry(() =>
        firstValueFrom(
          this.http.get<{ data: AssetDetails }>(`/api/public/v1/assets/${symbol}`),
        ),
      );
      return res.data.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        throw new WallbitApiException(`Símbolo '${symbol}' no encontrado. Verificá el ticker e intentá de nuevo.`, 404);
      }
      this.logger.error(`getAsset failed for ${symbol}`, err);
      throw new WallbitApiException('Error al obtener el activo. Intentá más tarde.', status);
    }
  }

  async getCheckingBalance(): Promise<CheckingBalance> {
    try {
      const res = await withRetry(() =>
        firstValueFrom(
          this.http.get<{ data: CheckingBalance }>('/api/public/v1/balance/checking'),
        ),
      );
      return res.data.data;
    } catch (err: any) {
      this.logger.error('getCheckingBalance failed', err);
      throw new WallbitApiException('Error al obtener el saldo. Intentá más tarde.');
    }
  }

  async executeTrade(request: TradeRequest): Promise<TradeResult> {
    try {
      const res = await withRetry(() =>
        firstValueFrom(
          this.http.post<{ data: TradeResult }>('/api/public/v1/trades', request),
        ),
      );
      return res.data.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const responseBody = err?.response?.data;
      this.logger.error(`executeTrade failed [${status}] request=${JSON.stringify(request)} response=${JSON.stringify(responseBody)}`);
      if (status === 412) {
        throw new WallbitApiException('Tu cuenta requiere verificación KYC antes de operar.', 412);
      }
      if (status === 422) {
        throw new WallbitApiException('La solicitud no puede ser procesada en este momento. Intentá más tarde.', 422);
      }
      throw new WallbitApiException('Error al ejecutar el trade. Intentá más tarde.', status);
    }
  }
}
