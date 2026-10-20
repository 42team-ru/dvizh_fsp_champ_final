#!/usr/bin/env node
// Гигиена коммитов и кода: блокирует подписи агентов и мат.
//   node scripts/hygiene.mjs msg <файл>     — для хука commit-msg
//   node scripts/hygiene.mjs staged         — для хука pre-commit (добавленные строки в индексе)
//   node scripts/hygiene.mjs junk           — мусорные файлы в git (артефакты, .DS_Store, .env, *.log, ...)
//   node scripts/hygiene.mjs scan           — отчёт по всей истории и рабочему дереву (ничего не меняет)
//   node scripts/hygiene.mjs scrub-history  — dry-run: какие сообщения коммитов будут очищены от подписей
//   node scripts/hygiene.mjs scrub-history --apply — переписать сообщения (создаст backup-ветку, НЕ пушит)
// Кроссплатформенно (Node), работает и в Git for Windows.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const L = '(?<![\\p{L}\\p{N}])' // «граница слова» для кириллицы (\b её не понимает)

// Подписи/следы агентов
const AI = [
  /co-authored-by:.*(claude|anthropic|codex|openai|gpt|copilot|gemini|\bai\b|\bbot\b)/i,
  /generated (with|by)\b.*(claude|codex|gpt|copilot|ai\b|\[)/i,
  /🤖|ai[- ]generated|as an ai\b/iu,
]
// Мат (корни, рус/англ). Список правьте под себя.
const PROFANITY = new RegExp(
  `${L}(` +
    [
      '\\p{L}{0,4}пизд\\p{L}*',
      '\\p{L}{0,3}ху[йеёяию]\\p{L}*',
      '(?:вы|по|за|на|от|до|при|под|у|\\p{L}{0,4}ъ)?[её]б(?:[аоуыиеёяцн]|л)\\p{L}*',
      'бл[яэ][дт]\\p{L}*',
      'мудак\\p{L}*', 'мудил\\p{L}*', 'залуп\\p{L}*', 'пид[оа]р\\p{L}*', 'сука', 'суки', 'суку', 'сучк\\p{L}*',
      'fuck\\p{L}*', 'shit\\p{L}*', 'bitch\\p{L}*', 'asshole', 'cunt', 'dickhead', 'bullshit',
    ].join('|') +
    `)(?![\\p{L}\\p{N}])`,
  'iu',
)

// Где следы агентов допустимы (инструкции и сам скрипт) и что вообще не проверяем
const ALLOW_AI = [/^CLAUDE\.md$/, /^AGENTS\.md$/, /^\.claude\//, /^\.codex\//, /^scripts\/finalize\.mjs$/, /^docs\/final\.md$/, /^frontend\/\.mcp\.json$/, /^\.githooks\//, /^scripts\/hygiene\.mjs$/]
const SKIP = [/^scripts\/hygiene\.mjs$/, /yarn\.lock$/, /openapi\.json$/, /\/generated\//, /\.(png|ico|jpg|jar|woff2?)$/, /gradle-wrapper\.jar$/]

// Мусор, которому не место в репозитории
const JUNK = [
  /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /\.(log|tmp|bak|orig|rej|swp|swo)$/, /~$/, /\.tsbuildinfo$/, /\.iml$/,
  /(^|\/)\.idea\//, /(^|\/)\.vscode\//, /(^|\/)node_modules\//, /(^|\/)\.gradle\//, /(^|\/)\.react-router\//,
  /^backend\/build\//, /^frontend\/(build|dist)\//, /^deploy\/(data|app\.jar|web)(\/|$)/,
  /(^|\/)\.env(\.local)?$/, /(^|\/)HELP\.md$/, /\.(pem|key)$/, /(^|\/)id_(rsa|ed25519)$/, /(^|\/)deploy_key(\.pub)?$/,
]
const isJunk = (f) => JUNK.some((r) => r.test(f))

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 })
const first = (re, s) => re.exec(s)?.[0]

function checkText(text, { ai = true, profanity = true } = {}) {
  const out = []
  for (const [i, line] of text.split('\n').entries()) {
    if (profanity) { const m = first(PROFANITY, line); if (m) out.push([i + 1, `мат: «${m}»`]) }
    if (ai) for (const re of AI) { const m = first(re, line); if (m) { out.push([i + 1, `след агента: «${m}»`]); break } }
  }
  return out
}

const fail = (title, items) => {
  console.error(`\n✖ ${title}`)
  for (const s of items) console.error('  ' + s)
  console.error('\nИсправьте и повторите. (Обход: git commit --no-verify — не рекомендуется.)\n')
  process.exit(1)
}

const [cmd, arg, flag] = process.argv.slice(2)

if (cmd === 'msg') {
  const text = readFileSync(arg, 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n')
  const bad = checkText(text).map(([n, w]) => `строка ${n}: ${w}`)
  if (bad.length) fail('Сообщение коммита не прошло проверку', bad)
} else if (cmd === 'staged') {
  const files = git('diff', '--cached', '--name-only', '--diff-filter=ACM').split('\n').filter(Boolean)
  const bad = files.filter(isJunk).map((f) => `${f}: мусорный/секретный файл, не коммитим`)
  for (const f of files) {
    if (SKIP.some((r) => r.test(f))) continue
    const added = git('diff', '--cached', '-U0', '--', f).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
    for (const [n, w] of checkText(added.join('\n'), { ai: !ALLOW_AI.some((r) => r.test(f)) }))
      bad.push(`${f} (добавленная строка ${n}): ${w}`)
  }
  if (bad.length) fail('В индексе найдены запрещённые слова', bad)
} else if (cmd === 'junk') {
  const tracked = git('ls-files').split('\n').filter(Boolean).filter(isJunk)
  const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean).filter(isJunk)
  for (const f of tracked) console.log(`в git:        ${f}   → git rm --cached "${f}"  и добавить в .gitignore`)
  for (const f of untracked) console.log(`не в .gitignore: ${f}   → добавить в .gitignore`)
  console.log(tracked.length + untracked.length ? `\nНайдено: ${tracked.length + untracked.length}` : '✔ Мусора нет')
  process.exit(tracked.length ? 1 : 0)
} else if (cmd === 'scan' || cmd === 'scrub-history') {
  const bad = []
  const log = git('log', '--all', '--format=%H%x00%an%x00%B%x01').split('\x01').map((s) => s.trim()).filter(Boolean)
  const dirty = []
  for (const rec of log) {
    const [sha, author, msg] = rec.split('\x00')
    const hits = checkText(msg)
    if (hits.length) { dirty.push(sha); bad.push(`коммит ${sha.slice(0, 7)} (${author}): ${hits.map((h) => h[1]).join('; ')}`) }
  }
  if (cmd === 'scan') {
    for (const f of git('ls-files').split('\n').filter(Boolean)) {
      if (SKIP.some((r) => r.test(f))) continue
      let t; try { t = readFileSync(f, 'utf8') } catch { continue }
      for (const [n, w] of checkText(t, { ai: !ALLOW_AI.some((r) => r.test(f)) })) bad.push(`${f}:${n}: ${w}`)
    }
    console.log(bad.length ? bad.join('\n') + `\n\nНайдено: ${bad.length}` : '✔ Чисто')
    process.exit(bad.length ? 1 : 0)
  }
  // scrub-history: вычищаем только строки-подписи из сообщений (код и мат не трогаем: это решает автор)
  if (!dirty.length) { console.log('✔ В сообщениях коммитов подписей нет'); process.exit(0) }
  console.log(bad.join('\n'))
  if (!process.argv.includes('--apply')) { console.log('\nDry-run. Применить: node scripts/hygiene.mjs scrub-history --apply'); process.exit(0) }
  if (git('status', '--porcelain').trim()) { console.error('Сначала закоммитьте/уберите изменения в рабочем дереве.'); process.exit(2) }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim()
  const backup = `backup/pre-scrub-${Date.now()}`
  git('branch', backup)
  const filter = `node "${process.argv[1].replace(/\\/g, '/')}" filter-msg`
  execFileSync('git', ['filter-branch', '-f', '--msg-filter', filter, '--', branch], { stdio: 'inherit', env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: '1' } })
  console.log(`\n✔ Сообщения переписаны. Бэкап: ${backup}.\nНа GitHub автоматически НИЧЕГО не отправлено. Чтобы обновить удалённую ветку, нужен force-push — делайте его осознанно сами (git push --force-with-lease).`)
} else if (cmd === 'filter-msg') {
  // stdin -> stdout: убрать строки-подписи
  const text = readFileSync(0, 'utf8')
  const kept = text.split('\n').filter((l) => !checkText(l, { profanity: false }).length)
  process.stdout.write(kept.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '\n'))
} else {
  console.error('Команды: msg <файл> | staged | junk | scan | scrub-history [--apply]')
  process.exit(2)
}
