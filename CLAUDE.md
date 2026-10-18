# CLAUDE.md

> TODO: заполнить под проект и удалить эту строку (описание, стек, команды, правила).

## Git

- Никаких подписей агентов в коммитах и PR: не добавлять `Co-Authored-By`, `Generated with Claude Code` и любые похожие строки. Автор коммита — только пользователь.

## Хуки коммитов

Включаются автоматически: при `yarn install` (скрипт `prepare`), при первой сборке Gradle (задача `installGitHooks`) и при старте сессии Claude Code (SessionStart). Вручную: `make hooks` / `git config core.hooksPath .githooks`. Нужен Node.
- `commit-msg` и `pre-commit` (`scripts/hygiene.mjs`) отклоняют подписи агентов (`Co-Authored-By`, `Generated with ...`, упоминания Claude/Codex/OpenAI и т.п.) и мат — в сообщении коммита и в добавленных строках кода. Исключения: `CLAUDE.md`, `AGENTS.md`, `.claude/`.
- Мусорные файлы (`.DS_Store`, `*.log`, `.env`, ключи, `node_modules`, `build`, `.idea` и т.п.) не пропускаются в коммит; `make junk` — отчёт по уже отслеживаемым, `make clean` — удалить локальные артефакты сборки.
- `node scripts/hygiene.mjs scan` — отчёт по истории и дереву, ничего не меняет.
- `node scripts/hygiene.mjs scrub-history` — dry-run очистки сообщений старых коммитов от подписей; `--apply` переписывает их (делает backup-ветку и **не пушит**; обновление удалённой ветки — только осознанным `git push --force-with-lease`).
- Не обходить хуки через `--no-verify`. Если хук блокирует, исправить текст, а не отключать проверку.
- В Claude Code подпись в коммитах и PR отключена настройкой `attribution` в `.claude/settings.json`.

## Codex

Codex (OpenAI) подключён как плагин Claude Code: `.claude/settings.json` в репозитории сам предлагает его установить при первом запуске в проекте. Через MCP не подключаем: `codex mcp-server` удалён в Codex CLI 0.154.0, официальная замена — плагин `codex@openai-codex`.

Настройка у каждого (один раз): `npm install -g @openai/codex`, затем `codex login`, затем в Claude Code `/codex:setup`. На Windows надёжнее WSL; нативный Windows у Codex экспериментальный.

Когда делегировать Codex (остальное делаем сами):
- `/codex:review --background` — независимое ревью перед коммитом/PR (только чтение).
- `/codex:adversarial-review <на что давить>` — критика выбранного решения, особенно auth, миграции БД, деплой.
- `/codex:rescue <задача>` — застряли на баге или нужен второй проход; можно `--background`, результат через `/codex:status` и `/codex:result`.

Правила:
- Задачу Codex формулируем самодостаточно: что сломано, как воспроизвести, что считать готовым.
- Результат Codex — это предложение: читаем диф и прогоняем тесты, прежде чем принимать.
- Не включать `--enable-review-gate`: это длинные циклы Claude↔Codex, которые быстро съедают лимиты.
