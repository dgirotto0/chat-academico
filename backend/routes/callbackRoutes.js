const express = require('express');
const webhookController = require('../controllers/webhookController');
const hotmartController = require('../controllers/hotmartController');

const router = express.Router();

// Rota para callbacks Hotmart
router.post('/hotmart/:token', (req, res, next) => {
  const { token } = req.params;
  
  // Verificar se o token na URL corresponde ao esperado
  if (token === process.env.HOTMART_CALLBACK_TOKEN || token === 'HRsk3bsdcShrgnuTg3g9Kwpt') {
    // O token é válido, passar para o controlador adequado
    return hotmartController.handleWebhook(req, res);
  }
  
  // Token inválido
  return res.status(403).json({ message: 'Token inválido' });
});

// Rota alternativa para compatibilidade com implementações anteriores
router.post('/hotmart', webhookController.processHotmartWebhook);

module.exports = router;
