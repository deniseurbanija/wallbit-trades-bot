import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);
  private telegramService: { sendWeeklyReminder: () => Promise<void> };

  setTelegramService(svc: { sendWeeklyReminder: () => Promise<void> }): void {
    this.telegramService = svc;
  }

  @Cron('0 9 * * 1', { timeZone: 'America/Argentina/Buenos_Aires' })
  async sendWeeklyReminder(): Promise<void> {
    this.logger.log('Sending weekly investment reminder...');
    try {
      await this.telegramService.sendWeeklyReminder();
      this.logger.log('Weekly reminder sent.');
    } catch (err) {
      this.logger.error('Failed to send weekly reminder', err);
    }
  }
}
