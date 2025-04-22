const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

// Rota para receber webhooks do Hotmart
router.post('/hotmart', webhookController.processHotmartWebhook);

module.exports = router;
