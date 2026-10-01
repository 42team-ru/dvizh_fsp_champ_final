.PHONY: db back front logs
db:            ## Postgres для разработки
	docker compose -f docker-compose.dev.yml up -d
back:          ## Бэкенд локально
	cd backend && ./gradlew bootRun
front:         ## Фронт локально
	cd frontend && yarn dev
logs:
	@. ./.env && ssh $$VPS_HOST "cd $${VPS_DIR:-/opt/app} && docker compose logs -f --tail=100"
