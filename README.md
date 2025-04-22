# Scientifique AI

Aplicação web que simula as funcionalidades do GPT Plus para auxiliar alunos universitários, com sistema de autenticação e diferentes perfis de usuário.

## Tecnologias Utilizadas

### Backend
- Node.js com Express
- PostgreSQL com Sequelize ORM
- JWT para autenticação
- Multer para upload de arquivos
- API OpenAI para processamento de IA

### Frontend
- React com hooks
- Material UI para interface
- Axios para requisições HTTP
- React Router para navegação

## Estrutura do Projeto

```
/chat-academico
  ├── /backend
  │   ├── /config
  │   ├── /controllers
  │   ├── /middleware
  │   ├── /models
  │   ├── /routes
  │   └── /uploads
  │
  └── /frontend
      ├── /public
      └── /src
          ├── /components
          │   ├── /Admin
          │   ├── /Chat
          │   └── /Layout
          ├── /contexts
          ├── /pages
          └── /services
```

## Configuração Inicial

### Pré-requisitos
- Node.js (v14+)
- PostgreSQL
- Conta na OpenAI para obter a chave da API

### Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd chat-academico
```

2. Instale as dependências:
```bash
npm run install-all
```

3. Configure as variáveis de ambiente:
   - Edite o arquivo `.env` na pasta backend
   - Adicione sua chave da API da OpenAI
   - Verifique se as credenciais do banco de dados PostgreSQL estão corretas

4. Crie o banco de dados no PostgreSQL:
```sql
# Definir a senha para o usuário postgres (se necessário)
ALTER USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE chat_academico;
```

5. Inicialize o banco de dados com o usuário administrador:
```bash
npm run init-db
```

6. Inicie a aplicação em modo de desenvolvimento:
```bash
npm start
```

7. Acesse a aplicação pelo navegador:
   - Frontend: http://localhost:3000
   - Login inicial como administrador:
     - Email: admin@admin.com
     - Senha: admin123

## Funcionalidades

### Autenticação
- Login de usuários com perfis de Administrador ou Aluno
- Proteção de rotas baseada em perfil

### Chat com IA
- Interface de chat responsiva com envio e recebimento de mensagens
- Integração com a API da OpenAI para respostas inteligentes
- Upload e visualização de arquivos de diversos formatos

### Administração
- Dashboard administrativo para gestão de usuários
- Cadastro, edição e exclusão de alunos
- Visualização de todos os usuários do sistema

## Informações para Desenvolvimento

### API Endpoints

#### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Obter perfil do usuário logado

#### Chat
- `GET /api/chat` - Listar chats do usuário
- `POST /api/chat` - Criar novo chat
- `GET /api/chat/:chatId/messages` - Obter mensagens de um chat
- `POST /api/chat/:chatId/messages` - Enviar mensagem e obter resposta
- `PUT /api/chat/:chatId` - Atualizar título do chat
- `DELETE /api/chat/:chatId` - Excluir chat

#### Administração
- `GET /api/admin/users` - Listar todos os usuários
- `POST /api/admin/users` - Criar novo usuário
- `PUT /api/admin/users/:id` - Atualizar usuário
- `DELETE /api/admin/users/:id` - Excluir usuário

#### Upload
- `POST /api/upload/:messageId` - Fazer upload de arquivo para uma mensagem
- `DELETE /api/upload/:fileId` - Excluir arquivo

## Usuários Iniciais

Para acesso inicial, um usuário administrador deve ser criado diretamente no banco de dados:

```sql
INSERT INTO "Users" (name, email, password, role, active, "createdAt", "updatedAt")
VALUES ('Admin', 'admin@example.com', '$2b$10$X5HBXWGhRnGJ6p64zBJ1zuhKPLVEZHRrFVJGVHQ5gH0vDmdmILTbG', 'admin', true, NOW(), NOW());
```

A senha inserida no exemplo acima é 'admin123' (já com hash).

## Licença

Este projeto está licenciado sob a licença ISC.
