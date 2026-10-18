#!/usr/bin/env node
// Команда для КОНЦА хакатона: убирает служебные файлы из репозитория одним обычным коммитом (без force-push).
//   node scripts/finalize.mjs                    — dry-run: показать, что будет сделано
//   node scripts/finalize.mjs --apply            — убрать из git одним коммитом; локальные копии остаются
//   node scripts/finalize.mjs --apply --purge    — то же + удалить файлы с диска (необратимо)
// Коммит НЕ пушится: после проверки выполните `git push origin main`.
// История не переписывается: в старых коммитах файлы останутся (можно откатиться на коммит назад).
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, rmSync } from 'node:fs'

const TARGETS = ['CLAUDE.md', 'AGENTS.md', '.claude', '.codex', 'scripts/finalize.mjs']
const apply = process.argv.includes('--apply')
const purge = process.argv.includes('--purge')

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' })
const root = git('rev-parse', '--show-toplevel').trim()
process.chdir(root)

const tracked = TARGETS.filter((t) => git('ls-files', '--', t).trim())
const local = TARGETS.filter((t) => existsSync(t))

if (!tracked.length) {
  console.log('✔ В репозитории уже нет служебных файлов, делать нечего.')
  process.exit(0)
}

console.log('Будет убрано из репозитория:')
for (const t of tracked) console.log('  - ' + t)
console.log(purge ? '\n--purge: файлы будут удалены и с диска (необратимо).' : '\nЛокальные копии останутся на диске (и будут добавлены в .git/info/exclude).')

if (!apply) {
  console.log('\nDry-run. Применить: node scripts/finalize.mjs --apply [--purge]')
  process.exit(0)
}

if (git('status', '--porcelain', '--', ...TARGETS).trim() && purge) {
  console.error('\nЕсть незакоммиченные изменения в служебных файлах. С --purge они пропадут: сначала сохраните их или уберите --purge.')
  process.exit(2)
}

git('rm', '-r', '-q', '--cached', '--', ...tracked)
if (!purge) {
  appendFileSync('.git/info/exclude', '\n# служебные файлы (локально)\n' + TARGETS.map((t) => '/' + t).join('\n') + '\n')
}
git('commit', '-q', '-m', 'chore: убрать служебные файлы из репозитория')
if (purge) for (const t of local) rmSync(t, { recursive: true, force: true })

console.log('\n✔ Готово: один коммит создан, в дереве репозитория служебных файлов нет.')
console.log('Проверьте `git show --stat HEAD`, затем отправьте: git push origin main   (обычный push, без --force)')
console.log('Если кто-то из команды сделает pull, у него эти файлы тоже исчезнут из рабочей папки: предупредите команду.')
