-- Личное имя питомца; NULL означает имя по умолчанию «Бублик».
ALTER TABLE users ADD COLUMN pet_name VARCHAR(30);
