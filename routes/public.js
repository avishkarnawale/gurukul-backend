const express = require('express');
const {
  submitInquiry,
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,
  getPublicContact,
} = require('../controllers/publicController');

const router = express.Router();

router.get('/contact', getPublicContact);
router.post('/inquiry', submitInquiry);
router.get('/whatsapp/webhook', verifyWhatsAppWebhook);
router.post('/whatsapp/webhook', handleWhatsAppWebhook);

module.exports = router;
