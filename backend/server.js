require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://143.198.14.253:3000',
    'http://scientifique.ai',
  ], 
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); 

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const fileRoutes = require('./routes/files'); 
const hotmartRoutes = require('./routes/hotmart');


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/files', fileRoutes); 
app.use('/callbacks/hotmart', hotmartRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API do Scientifique AI' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
