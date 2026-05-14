import { Injectable } from '@nestjs/common';
import { AssetDetails } from '../wallbit/wallbit.types';

export interface InvestmentDraft {
  amount?: number;
  symbol?: string;
  assetDetails?: AssetDetails;
  processing?: boolean;
}

@Injectable()
export class ConversationStateService {
  private readonly state = new Map<string, InvestmentDraft>();

  getDraft(chatId: string): InvestmentDraft {
    return this.state.get(chatId) ?? {};
  }

  setDraft(chatId: string, draft: InvestmentDraft): void {
    this.state.set(chatId, draft);
  }

  clearDraft(chatId: string): void {
    this.state.delete(chatId);
  }
}
