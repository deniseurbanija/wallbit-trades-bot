import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { WallbitService } from './wallbit/wallbit.service';
import { ConversationStateService } from './state/conversation-state.service';
import { ReminderScheduler } from './scheduler/reminder.scheduler';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: 'https://api.wallbit.io',
        headers: {
          'X-API-Key': config.getOrThrow('WALLBIT_API_KEY'),
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TelegramService, WallbitService, ConversationStateService, ReminderScheduler],
  exports: [TelegramService],
})
export class TelegramModule {}
