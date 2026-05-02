import { NextRequest, NextResponse } from 'next/server';

/**
 * Telegram Notification Service — Advisor Alerts
 * POST /api/telegram/notify
 * Body: { type, data }
 */
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADVISOR_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Telegram no configurado' }, { status: 503 });
    }

    const message = buildAdvisorMessage(type, data);
    const result = await sendTelegramMessage(botToken, chatId, message);

    return NextResponse.json({ ok: true, message_id: result.result?.message_id });
  } catch (err) {
    console.error('Telegram notify error:', err);
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 });
  }
}

function buildAdvisorMessage(type: string, data: Record<string, string>): string {
  const templates: Record<string, (d: Record<string, string>) => string> = {
    new_lead: (d) =>
      `🔔 *Nuevo Lead*\n\n` +
      `👤 *${d.name || 'Desconocido'}*\n` +
      `📧 ${d.email || ''}\n` +
      `📱 ${d.phone || 'Sin teléfono'}\n\n` +
      `💬 _"${d.message || 'Sin mensaje'}"_\n\n` +
      `🔗 Revisa el CRM para gestionar este lead.`,

    portal_viewed: (d) =>
      `👁 *Portal visitado*\n\n` +
      `El cliente *${d.client_name || 'desconocido'}* ha accedido a su portal privado.\n` +
      `_${d.times || '1'} vez(ces) hoy._`,

    payment_received: (d) =>
      `✅ *Pago recibido*\n\n` +
      `💰 *${d.amount || ''}€* — ${d.client_name || 'Cliente'}\n` +
      `📄 Propuesta: ${d.quote_title || '—'}\n\n` +
      `El depósito ha sido confirmado por Stripe.`,

    document_uploaded: (d) =>
      `📎 *Documento subido*\n\n` +
      `📁 ${d.file_name || 'Archivo'}\n` +
      `👤 Para: ${d.client_name || 'cliente'}`,

    experience_generated: (d) =>
      `✨ *Experiencia Luxury generada*\n\n` +
      `🌍 Destino: ${d.destination || '—'}\n` +
      `👤 Para: ${d.client_name || 'cliente'}\n\n` +
      `_La narrativa está lista para enviar al portal._`,
  };

  const template = templates[type];
  if (!template) {
    return `📌 *Notificación TSC*\n\nTipo: ${type}\n${JSON.stringify(data, null, 2)}`;
  }
  return template(data);
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
  return res.json();
}
