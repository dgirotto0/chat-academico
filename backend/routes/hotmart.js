// routes/hotmart.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/hotmartController');

router.post('/:token',
  express.json(),           
  ctrl.handleWebhook
);

module.exports = router;
