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

module.exports = { OWNER_WA, buildWaMeLink, sendWhatsAppCloud };
