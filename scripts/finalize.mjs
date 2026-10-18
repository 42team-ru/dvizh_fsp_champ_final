#!/usr/bin/env node
// Команда для КОНЦА хакатона: оставляет в репозитории только полезный код, одним обычным коммитом (без force-push).
//   node scripts/finalize.mjs             — dry-run: показать, что будет сделано
//   node scripts/finalize.mjs --apply     — применить (служебные файлы остаются у вас на диске, но вне репозитория)
//   node scripts/finalize.mjs --apply --purge — то же + удалить служебные файлы и с диска (необратимо)
// Коммит НЕ пушится: после проверки выполните `git push origin main`. История не переписывается.
//
// Что делает:
//  1. Убирает из репозитория служебные файлы (инструкции для агентов, их настройки, этот скрипт, docs/final.md).
//  2. Убирает проверки коммитов целиком: .githooks, scripts/hygiene.mjs и их подключение
//     (Makefile: hooks/scan/junk, frontend/package.json: prepare, backend/build.gradle.kts: installGitHooks, .gitattributes).
//  3. Чистит упоминания в документации.
//  4. Снимает локальную настройку core.hooksPath.
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

// остаются у вас на диске (вне репозитория), с --purge удаляются
const KEEP_LOCAL = ['CLAUDE.md', 'AGENTS.md', '.claude', '.codex', 'frontend/.mcp.json', 'docs/final.md', 'scripts/finalize.mjs']
// удаляются и из репозитория, и с диска: проверки коммитов больше не нужны
const REMOVE_ALL = ['.githooks', 'scripts/hygiene.mjs']

const apply = process.argv.includes('--apply')
const purge = process.argv.includes('--purge')

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' })
process.chdir(git('rev-parse', '--show-toplevel').trim())
const tracked = (p) => git('ls-files', '--', p).trim() !== ''

// Правки текста в существующих файлах. Каждая возвращает новый текст.
const EDITS = [
  ['Makefile', (s) => s.replace(/^(hooks|scan|junk):.*\n(\t.*\n)*/gm, '').replace('hooks scan junk ', '')],
  ['.gitattributes', (s) => s.replace(/^\.githooks\/\*.*\n/m, '')],
  [
    'frontend/package.json',
    (s) => {
      const j = JSON.parse(s)
      delete j.scripts?.prepare
      return JSON.stringify(j, null, 2) + '\n'
    },
  ],
  [
    'backend/build.gradle.kts',
    (s) => s.replace(/\n\/\/ Включает git-хуки[\s\S]*?tasks\.compileJava \{\n\tdependsOn\(installGitHooks\)\n\}\n/, '\n').replace(/\n{3,}/g, '\n\n'),
  ],
  ['docs/development.md', (s) => s.replace(/\n## Git-хуки[\s\S]*$/, '\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '\n')],
  ['docs/architecture.md', (s) => s.replace(', hygiene.mjs (проверка коммитов)', '')],
  ['docs/README.md', (s) => s.replace(/^\| \[final\.md\].*\n/m, '').replace(', git-хуки', '')],
  ['README.md', (s) => s.replace(', git-хуки', '')],
]

const toRemoveFromRepo = [...KEEP_LOCAL, ...REMOVE_ALL].filter(tracked)
const changes = EDITS.map(([file, fn]) => {
  if (!existsSync(file)) return { file, state: 'нет файла' }
  const before = readFileSync(file, 'utf8')
  const after = fn(before)
  return { file, before, after, state: after === before ? 'без изменений (уже чисто)' : 'будет изменён' }
})

if (!toRemoveFromRepo.length && changes.every((c) => c.after === c.before || !c.after)) {
  console.log('✔ Репозиторий уже чистый, делать нечего.')
  process.exit(0)
}

console.log('Будет убрано из репозитория:')
for (const t of toRemoveFromRepo) console.log('  - ' + t + (REMOVE_ALL.includes(t) ? '  (и с диска)' : ''))
console.log('\nБудут поправлены файлы:')
for (const c of changes) console.log(`  - ${c.file}: ${c.state}`)
console.log(purge ? '\n--purge: служебные файлы будут удалены и с диска (необратимо).' : '\nСлужебные файлы останутся на диске и будут добавлены в .git/info/exclude.')

if (!apply) {
  console.log('\nDry-run. Применить: node scripts/finalize.mjs --apply [--purge]')
  process.exit(0)
}

const dirty = git('status', '--porcelain', '--', ...KEEP_LOCAL, ...REMOVE_ALL, ...EDITS.map(([f]) => f)).trim()
if (dirty) {
  console.error('\nЕсть незакоммиченные изменения в затрагиваемых файлах:\n' + dirty + '\nСначала закоммитьте их или откатите, затем повторите.')
  process.exit(2)
}

for (const c of changes) if (c.after !== undefined && c.after !== c.before) writeFileSync(c.file, c.after)
const keepLocalTracked = KEEP_LOCAL.filter(tracked)
if (keepLocalTracked.length) git('rm', '-r', '-q', '--cached', '--', ...keepLocalTracked)
const removeTracked = REMOVE_ALL.filter(tracked)
if (removeTracked.length) git('rm', '-r', '-q', '--', ...removeTracked)
const edited = changes.filter((c) => c.after !== undefined && c.after !== c.before).map((c) => c.file)
if (edited.length) git('add', '--', ...edited)

if (!purge) appendFileSync('.git/info/exclude', '\n# служебные файлы (локально)\n' + KEEP_LOCAL.map((t) => '/' + t).join('\n') + '\n')
git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'chore: убрать служебные файлы и проверки коммитов')
try {
  git('config', '--unset', 'core.hooksPath')
} catch {
  /* не было задано */
}
if (purge) for (const t of KEEP_LOCAL) rmSync(t, { recursive: true, force: true })

// Контроль: в отслеживаемых файлах не должно остаться ссылок на удалённое
let left = []
try {
  left = git('grep', '-nIE', 'hygiene|githooks|installGitHooks|core\\.hooksPath').split('\n').filter(Boolean)
} catch {
  /* git grep завершается с кодом 1, когда ничего не найдено: это хорошо */
}
console.log('\n✔ Готово: один коммит создан.')
if (left.length) {
  console.log('\nВнимание, остались упоминания (проверьте вручную):')
  for (const l of left) console.log('  ' + l)
}
console.log('\nПроверьте `git show --stat HEAD`, затем отправьте: git push origin main   (обычный push, без --force)')
console.log('После pull у остальных участников эти файлы пропадут из рабочей папки: предупредите команду заранее.')
