-- Corrigir chat sem UserId (assumindo que é do usuário 1)
UPDATE "Chats" SET "UserId" = 1 WHERE "UserId" IS NULL;

-- Adicionar userId aos arquivos existentes (assumindo que são do usuário 1)
UPDATE "Files" SET "userId" = 1 WHERE "userId" IS NULL;

-- Garantir que todos os chats tenham UserId
ALTER TABLE "Chats" ALTER COLUMN "UserId" SET NOT NULL;

-- Garantir que todos os arquivos tenham userId
ALTER TABLE "Files" ALTER COLUMN "userId" SET NOT NULL;
