// Usage: node scripts/telegram-webhook.mjs set|get|delete. Secrets come only from the environment or .env.
try { process.loadEnvFile('.env') } catch { /* Environment-only configuration is supported. */ }
const action = process.argv[2]
const methods = { set: 'setWebhook', get: 'getWebhookInfo', delete: 'deleteWebhook' }
const method = methods[action]
if (!method || !process.env.TELEGRAM_BOT_TOKEN) {
  console.error('Usage: node scripts/telegram-webhook.mjs set|get|delete; TELEGRAM_BOT_TOKEN is required.')
  process.exit(1)
}
try {
  let payload = {}
  if (action === 'set') {
    const webhook = process.env.TELEGRAM_WEBHOOK_URL
      ? new URL(process.env.TELEGRAM_WEBHOOK_URL)
      : new URL('/api/notifications/telegram/webhook', process.env.APP_PUBLIC_URL ?? '')
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
    if (webhook.protocol !== 'https:' || webhook.username || webhook.password || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
      throw new Error('Set TELEGRAM_WEBHOOK_URL (or APP_PUBLIC_URL) to a public HTTPS URL and TELEGRAM_WEBHOOK_SECRET to 1–256 A-Z/a-z/0–9/_/- characters.')
    }
    payload = { url: webhook.href,
      secret_token: secret, allowed_updates: ['message', 'my_chat_member'], drop_pending_updates: false }
  }
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })
  const result = await response.json()
  if (!response.ok || !result.ok) {
    console.error(`Telegram request failed (HTTP ${response.status}, API ${Number(result.error_code) || 'unknown'}).`)
    process.exitCode = 1
  } else if (action === 'get') {
    console.log(JSON.stringify({ configured: Boolean(result.result.url), pendingUpdateCount: result.result.pending_update_count,
      lastErrorDate: result.result.last_error_date ?? null }, null, 2))
  } else console.log(`Telegram webhook: ${action === 'set' ? 'registered' : 'removed'}.`)
} catch (error) {
  // fetch errors may contain a URL with the bot token: never print the exception or its cause.
  console.error(action === 'set' && error.message?.startsWith('Set TELEGRAM_WEBHOOK_URL') ? error.message : 'Telegram request failed. Check configuration and connectivity.')
  process.exitCode = 1
}
