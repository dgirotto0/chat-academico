-- 1. Adicionar coluna temporária
ALTER TABLE "Chats" ADD COLUMN "uuid" UUID DEFAULT uuid_generate_v4();

-- 2. Preencher a coluna com UUIDs
UPDATE "Chats" SET "uuid" = uuid_generate_v4();

-- 3.1. Remover constraint de chave estrangeira da tabela Messages
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_ChatId_fkey";

-- 3.2. Remover constraint de chave primária da tabela Chats
ALTER TABLE "Chats" DROP CONSTRAINT "Chats_pkey";

-- 4. Remover coluna antiga
ALTER TABLE "Chats" DROP COLUMN "id";

-- 5. Renomear coluna nova para id
ALTER TABLE "Chats" RENAME COLUMN "uuid" TO "id";

-- 6. Definir como chave primária
ALTER TABLE "Chats" ADD PRIMARY KEY ("id");

-- 7. Recriar constraint de chave estrangeira na tabela Messages
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_ChatId_fkey"
  FOREIGN KEY ("ChatId") REFERENCES "Chats"("id") ON UPDATE CASCADE ON DELETE CASCADE;
