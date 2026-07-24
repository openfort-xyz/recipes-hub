import { Bot } from 'grammy'
import { handleBalance, handleSend, handleStart } from './commands.js'
import { config } from './config.js'

if (!config.telegramBotToken) {
  throw new Error(
    'Missing TELEGRAM_BOT_TOKEN. Create a bot with @BotFather (/newbot) and put the token in .env. ' +
      'To try the wallet flow without Telegram, run `pnpm demo` instead.',
  )
}

const bot = new Bot(config.telegramBotToken)

bot.command('start', async (ctx) => {
  if (!ctx.from) return
  await ctx.reply(await handleStart(ctx.from.id), { link_preview_options: { is_disabled: true } })
})

bot.command('balance', async (ctx) => {
  if (!ctx.from) return
  await ctx.reply(await handleBalance(ctx.from.id))
})

bot.command('send', async (ctx) => {
  if (!ctx.from) return
  await ctx.reply(await handleSend(ctx.from.id, ctx.match), {
    link_preview_options: { is_disabled: true },
  })
})

bot.catch((err) => {
  console.error('Bot error:', err.error)
})

console.log('Bot running — message it on Telegram. Ctrl+C to stop.')
bot.start()
