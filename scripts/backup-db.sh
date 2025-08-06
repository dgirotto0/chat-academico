#!/bin/bash

# Script de backup automático do PostgreSQL
BACKUP_DIR="/home/danielgirotto/Projetos/chat-academico/backup"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="chat-academico-db-1"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Fazer backup
docker exec "$CONTAINER_NAME" pg_dump -U postgres chat_academico > "$BACKUP_DIR/backup_$DATE.sql"

# Manter apenas os últimos 7 backups
find "$BACKUP_DIR" -name "backup_*.sql" -type f -mtime +7 -delete

echo "Backup realizado: backup_$DATE.sql"
  