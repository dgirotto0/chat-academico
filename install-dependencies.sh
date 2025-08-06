#!/bin/bash

echo "🔧 Instalando dependências necessárias..."

# Aguardar container estar pronto
echo "⏳ Aguardando container backend ficar pronto..."
sleep 10

# Tentar instalar as dependências
echo "📦 Instalando node-mailjet..."
docker exec chat-academico-backend-1 npm install node-mailjet@6.0.9

echo "📦 Instalando adm-zip..."
docker exec chat-academico-backend-1 npm install adm-zip@0.5.10

echo "📦 Instalando mammoth..."
docker exec chat-academico-backend-1 npm install mammoth@1.6.0

echo "📦 Executando npm install geral..."
docker exec chat-academico-backend-1 npm install

echo "✅ Dependências instaladas com sucesso!"

# Reiniciar containers para garantir que tudo foi carregado
echo "🔄 Reiniciando containers..."
docker-compose restart

echo "🚀 Pronto! Os containers devem estar funcionando agora."
