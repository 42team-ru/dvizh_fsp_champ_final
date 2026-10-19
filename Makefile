.PHONY: hooks scan junk clean dev dev-down back front logs postman
dev:           ## Postgres для разработки (один раз, остаётся работать); бэк и фронт запускайте отдельно: make back / make front
	node scripts/dev.mjs
dev-down:      ## Остановить БД разработки (данные сохраняются)
	docker compose -f docker-compose.dev.yml down
back:          ## Бэкенд :8080 (свой терминал, Ctrl+C и снова make back)
	node scripts/dev.mjs back
front:         ## Фронт :5173 (свой терминал)
	node scripts/dev.mjs front
postman:       ## Проверка сценариев приёмки через API (Postman-коллекция; нужен бэк с DEMO_MODE=true, URL=... — другой адрес)
	npx --yes newman@6 run postman/acceptance.postman_collection.json -e postman/local.postman_environment.json --env-var baseUrl=$${URL:-http://localhost:8080}
logs:
	@. ./.env && ssh $$VPS_HOST "cd $${VPS_DIR:-/opt/app} && docker compose logs -f --tail=100"
hooks:         ## Включить git-хуки проверки коммитов (один раз после клона)
	git config core.hooksPath .githooks
scan:          ## Отчёт: подписи агентов и мат в истории и коде
	node scripts/hygiene.mjs scan
junk:          ## Мусорные файлы в git
	node scripts/hygiene.mjs junk
clean:         ## Удалить локальные артефакты сборки (не трогает .env и исходники)
	rm -rf backend/build backend/.gradle frontend/build frontend/.react-router frontend/dist frontend/*.tsbuildinfo deploy/app.jar deploy/web
