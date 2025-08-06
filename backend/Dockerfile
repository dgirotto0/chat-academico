FROM node:18-alpine

WORKDIR /app

# Instalar dependências de build para canvas/chartjs-node-canvas
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  libc6-compat \
  pixman-dev \
  cairo-dev \
  pango-dev \
  giflib-dev \
  jpeg-dev

# Copiar package.json primeiro para aproveitar cache de layers
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar resto do código
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["npm", "start"]
