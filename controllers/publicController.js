const { asyncHandler } = require('../middleware/error');
const { buildWaMeLink, sendWhatsAppCloud, OWNER_WA } = require('../utils/whatsapp');

const OWNER_NAME = process.env.INSTITUTE_OWNER_NAME || 'Pruthviraj Navale';

// @desc    Submit contact inquiry — notifies owner on WhatsApp API if configured
// @route   POST /api/public/inquiry
// @access  Public
exports.submitInquiry = asyncHandler(async (req, res) => {
  const { name, phone, message, lang } = req.body;
  if (!name?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'Name and message are required' });
  }

  const lines = [
    lang === 'mr' ? '🔔 नवीन चौकशी — गुरुकुल क्लासेस' : '🔔 New inquiry — Gurukul Classes',
    `Name: ${name.trim()}`,
    phone ? `Phone: ${phone}` : null,
    `Message: ${message.trim()}`,
  ].filter(Boolean);

  const ownerText = lines.join('\n');
  const visitorText =
    lang === 'mr'
      ? `नमस्कार ${OWNER_NAME} सर, मी ${name.trim()} आहे. ${message.trim()}`
      : `Hello ${OWNER_NAME}, I am ${name.trim()}. ${message.trim()}`;

  const apiResult = await sendWhatsAppCloud(OWNER_WA, ownerText);

  res.json({
    success: true,
    message: apiResult.sent
      ? 'Inquiry sent to institute via WhatsApp'
      : 'Open WhatsApp to complete your message',
    apiSent: apiResult.sent,
    whatsappUrl: buildWaMeLink(visitorText),
    owner: { name: OWNER_NAME, phone: process.env.INSTITUTE_OWNER_PHONE || '9307181827' },
  });
});

// @desc    WhatsApp webhook verify (Meta Cloud API)
// @route   GET /api/public/whatsapp/webhook
exports.verifyWhatsAppWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// @desc    WhatsApp webhook events
// @route   POST /api/public/whatsapp/webhook
exports.handleWhatsAppWebhook = asyncHandler(async (req, res) => {
  // Acknowledge immediately; extend later for auto-replies
  console.log('WhatsApp webhook:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// @desc    Public contact info
// @route   GET /api/public/contact
exports.getPublicContact = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      ownerName: OWNER_NAME,
      phone: process.env.INSTITUTE_OWNER_PHONE || '9307181827',
      phoneDisplay: '+91 93071 81827',
      whatsapp: OWNER_WA,
      whatsappUrl: buildWaMeLink(
        'Hello, I would like to know more about Gurukul Classes.',
        OWNER_WA,
      ),
      apiConfigured: Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
      ),
    },
  });
});
