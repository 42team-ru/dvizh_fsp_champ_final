.PHONY: hooks scan junk clean db back front logs
db:            ## Postgres для разработки
	docker compose -f docker-compose.dev.yml up -d
back:          ## Бэкенд локально
	cd backend && ./gradlew bootRun
front:         ## Фронт локально
	cd frontend && yarn dev
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
