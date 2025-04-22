require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
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
const webhookRoutes = require('./routes/webhook');
const callbackRoutes = require('./routes/callbackRoutes'); // Adicionar esta linha

// Definir rotas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/callbacks', callbackRoutes); // Adicionar esta linha

// Rota padrão
app.get('/', (req, res) => {
  res.json({ message: 'API do Scientifique AI' });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
