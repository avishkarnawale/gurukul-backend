const OWNER_WA = process.env.WHATSAPP_OWNER_NUMBER || '919307181827';

function buildWaMeLink(text, phone = OWNER_WA) {
  const digits = String(phone).replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Send text via Meta WhatsApp Cloud API (requires env tokens). */
async function sendWhatsAppCloud(to, body) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { sent: false, reason: 'WhatsApp API not configured' };

  const toDigits = String(to).replace(/\D/g, '');
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toDigits,
      type: 'text',
      text: { body },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { sent: false, reason: data.error?.message || res.statusText, data };
  }
  return { sent: true, data };
}

/**
 * Send a one-time password over WhatsApp.
 * If WHATSAPP_OTP_TEMPLATE is set, sends via an approved Meta auth template
 * (the reliable, business-initiated way). Otherwise falls back to a plain text
 * message (works only inside a 24h customer-service window).
 */
async function sendWhatsAppOtp(to, otp) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { sent: false, reason: 'WhatsApp API not configured' };

  const template = process.env.WHATSAPP_OTP_TEMPLATE;
  if (!template) {
    return sendWhatsAppCloud(
      to,
      `Your Gurukul Classes password reset code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`,
    );
  }

  const toDigits = String(to).replace(/\D/g, '');
  const lang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'en_US';
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toDigits,
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: String(otp) }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(otp) }] },
        ],
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, reason: data.error?.message || res.statusText, data };
  return { sent: true, data };
}

module.exports = { OWNER_WA, buildWaMeLink, sendWhatsAppCloud, sendWhatsAppOtp };
