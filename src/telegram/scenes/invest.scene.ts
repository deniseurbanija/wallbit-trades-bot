import { Scenes, Context } from 'telegraf';
import { WallbitApiException, WallbitService } from '../wallbit/wallbit.service';
import { ConversationStateService } from '../state/conversation-state.service';
import { AssetDetails } from '../wallbit/wallbit.types';

const SESSION_TIMEOUT_MINUTES = 30;

interface InvestWizardState {
  startedAt: number;
  amount: number;
  symbol: string;
  assetDetails: AssetDetails;
}

type InvestContext = Context & Scenes.WizardContext & {
  wizard: Scenes.WizardContext['wizard'] & { state: Partial<InvestWizardState> };
};

const INPUT_REGEX = /^(\d+(?:\.\d+)?)\s+([A-Za-z]{1,10})$/;

export function createInvestScene(
  wallbit: WallbitService,
  conversationState: ConversationStateService,
): Scenes.WizardScene<InvestContext> {
  const scene = new Scenes.WizardScene<InvestContext>(
    'invest-wizard',

    // Step 0: Ask for amount and symbol
    async (ctx) => {
      ctx.wizard.state.startedAt = Date.now();
      await ctx.reply(
        '¿Cuánto USD y en qué símbolo querés invertir?\n\nEjemplo: <code>100 SPY</code>',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'cancel-wizard' }]],
          },
        },
      );
      return ctx.wizard.next();
    },

    // Step 1: Parse input, validate symbol, show preview
    async (ctx) => {
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Enviá el monto y símbolo como texto. Ejemplo: <code>100 SPY</code>', { parse_mode: 'HTML' });
        return;
      }

      const text = ctx.message.text;
      const match = INPUT_REGEX.exec(text.trim());

      if (!match) {
        await ctx.reply('Formato inválido. Intentá de nuevo.\nEjemplo: <code>100 SPY</code>', { parse_mode: 'HTML' });
        return;
      }

      const amount = parseFloat(match[1]);
      const symbol = match[2].toUpperCase();

      let assetDetails: AssetDetails;
      try {
        assetDetails = await wallbit.getAsset(symbol);
      } catch (err) {
        const msg = err instanceof WallbitApiException ? err.userMessage : 'Error al validar el símbolo.';
        await ctx.reply(msg);
        return;
      }

      let balance;
      try {
        balance = await wallbit.getCheckingBalance();
      } catch {
        await ctx.reply('No se pudo verificar el saldo. Intentá más tarde.');
        return ctx.scene.leave();
      }

      if (balance.available < amount) {
        await ctx.reply(`Saldo insuficiente. Tu saldo disponible es $${balance.available.toFixed(2)} USD.`);
        return ctx.scene.leave();
      }

      ctx.wizard.state.amount = amount;
      ctx.wizard.state.symbol = symbol;
      ctx.wizard.state.assetDetails = assetDetails;

      const estimatedShares = (amount / assetDetails.price).toFixed(6);

      await ctx.reply(
        `<b>Resumen de inversión</b>\n\n` +
        `Activo: ${assetDetails.name} (${symbol})\n` +
        `Precio actual: $${assetDetails.price.toFixed(2)}\n` +
        `Monto: $${amount} USD\n` +
        `Shares aprox: ~${estimatedShares}\n\n` +
        `¿Confirmás la operación?`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirmar', callback_data: 'confirm-trade' },
              { text: '❌ Cancelar', callback_data: 'cancel-trade' },
            ]],
          },
        },
      );
      return ctx.wizard.next();
    },

    // Step 2: Execute trade on confirmation
    async (ctx) => {
      // Fallback for text messages on this step
      await ctx.reply('Usá los botones de arriba para confirmar o cancelar.');
    },
  );

  // Action: confirm trade
  scene.action('confirm-trade', async (ctx) => {
    await ctx.answerCbQuery();

    const draft = conversationState.getDraft(String(ctx.chat!.id));
    if (draft.processing) return;

    const elapsed = (Date.now() - (ctx.wizard.state.startedAt ?? 0)) / 60000;
    if (elapsed > SESSION_TIMEOUT_MINUTES) {
      await ctx.editMessageText('Esta sesión expiró (30 min). El precio puede haber cambiado. Empezá de nuevo con el botón del recordatorio.');
      conversationState.clearDraft(String(ctx.chat!.id));
      return ctx.scene.leave();
    }

    const { amount, symbol } = ctx.wizard.state;
    if (!amount || !symbol) {
      await ctx.editMessageText('Sesión inválida. Empezá de nuevo.');
      return ctx.scene.leave();
    }

    conversationState.setDraft(String(ctx.chat!.id), { processing: true });

    try {
      const result = await wallbit.executeTrade({
        symbol,
        direction: 'BUY',
        currency: 'USD',
        order_type: 'MARKET',
        amount,
      });

      await ctx.editMessageText(
        `✅ <b>Inversión enviada</b>\n\n` +
        `${result.shares} shares de ${result.symbol}\n` +
        `Monto: $${result.amount} USD\n` +
        `Estado: ${result.status}`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      const msg = err instanceof WallbitApiException ? err.userMessage : 'Error al ejecutar el trade.';
      await ctx.editMessageText(`❌ ${msg}`);
    } finally {
      conversationState.clearDraft(String(ctx.chat!.id));
      await ctx.scene.leave();
    }
  });

  // Action: cancel trade
  scene.action('cancel-trade', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Operación cancelada.');
    conversationState.clearDraft(String(ctx.chat!.id));
    return ctx.scene.leave();
  });

  // Action: cancel wizard (step 0 button)
  scene.action('cancel-wizard', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Operación cancelada.');
    return ctx.scene.leave();
  });

  return scene;
}
