import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes, session } from 'telegraf';
import { WallbitService } from './wallbit/wallbit.service';
import { ConversationStateService } from './state/conversation-state.service';
import { ReminderScheduler } from './scheduler/reminder.scheduler';
import { createInvestScene } from './scenes/invest.scene';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf<Scenes.WizardContext>;

  constructor(
    private readonly config: ConfigService,
    private readonly wallbit: WallbitService,
    private readonly conversationState: ConversationStateService,
    private readonly scheduler: ReminderScheduler,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Telegraf<Scenes.WizardContext>(token);

    const investScene = createInvestScene(this.wallbit, this.conversationState);
    const stage = new Scenes.Stage<Scenes.WizardContext>([investScene]);

    this.bot.use(session());
    this.bot.use(stage.middleware());

    this.bot.command('start', (ctx) =>
      ctx.reply('Hola! Soy tu asistente de inversiones con Wallbit. Cada lunes te voy a preguntar si querés invertir.'),
    );

    if (this.config.get('NODE_ENV') !== 'production') {
      this.bot.command('test', async (ctx) => {
        await this.sendWeeklyReminder();
        await ctx.reply('Reminder enviado!');
      });
    }

    this.bot.action('invest-yes', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.scene.enter('invest-wizard');
    });

    this.bot.action('invest-no', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText('Entendido! Te lo vuelvo a preguntar la próxima semana. 📅');
    });

    this.bot.on('text', async (ctx) => {
      await ctx.reply('Sesión reiniciada. Esperá el recordatorio del lunes o usá /test para probar.');
    });

    this.scheduler.setTelegramService(this);

    void this.bot.launch();
    this.logger.log('Telegram bot started.');
  }

  async onModuleDestroy(): Promise<void> {
    this.bot?.stop('SIGTERM');
  }

  async sendWeeklyReminder(): Promise<void> {
    const chatId = this.config.getOrThrow<string>('TELEGRAM_CHAT_ID');
    await this.bot.telegram.sendMessage(
      chatId,
      '💰 ¿Querés invertir esta semana?',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Sí', callback_data: 'invest-yes' },
            { text: '❌ No', callback_data: 'invest-no' },
          ]],
        },
      },
    );
  }
}
