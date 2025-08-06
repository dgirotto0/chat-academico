require('dotenv').config();
console.log('🔑 MAILJET_API_KEY (server.js):', process.env.MAILJET_API_KEY);
console.log('🔑 MAILJET_SECRET_KEY (server.js):', process.env.MAILJET_SECRET_KEY);
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração correta do CORS
app.use(cors({
  origin: 'http://localhost:3000', // coloque o domínio do seu frontend
  credentials: true
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging para desenvolvimento

// Servir arquivos estáticos de upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rotas
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const fileRoutes = require('./routes/files'); // Adicionar esta linha
const hotmartRoutes = require('./routes/hotmart');

// Definir rotas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/files', fileRoutes); // Adicionar esta linha
app.use('/callbacks/hotmart', hotmartRoutes);

// Rota padrão
app.get('/', (req, res) => {
  res.json({ message: 'API do Scientifique AI' });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
