import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Telegram Client Notification
 * POST /api/telegram/client-notify
 * Body: { contact_id, message, type? }
 * Sends a message directly to the client's personal Telegram chat.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { contact_id, message, type = 'custom' } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot no configurado' }, { status: 503 });
    }

    if (!contact_id || !message) {
      return NextResponse.json({ error: 'contact_id y message son requeridos' }, { status: 400 });
    }

    // Get the client's Telegram chat ID
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('name, email, telegram_chat_id')
      .eq('id', contact_id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    if (!contact.telegram_chat_id) {
      return NextResponse.json({
        error: 'El cliente no tiene un Chat ID de Telegram configurado',
        hint: 'El cliente debe iniciar una conversación con el bot y proporcionar su Chat ID',
      }, { status: 422 });
    }

    // Format luxury message for client
    const luxuryMessage = formatClientMessage(contact.name, message, type);

    // Send via Telegram Bot API
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: contact.telegram_chat_id,
        text: luxuryMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const result = await res.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return NextResponse.json({ error: 'Error al enviar mensaje por Telegram', details: result.description }, { status: 502 });
    }

    // Log in bot_messages
    await supabaseAdmin.from('bot_messages').insert({
      contact_id,
      direction: 'outbound',
      channel: 'telegram',
      message_text: luxuryMessage,
      telegram_msg_id: String(result.result?.message_id ?? ''),
    });

    return NextResponse.json({ ok: true, message_id: result.result?.message_id });
  } catch (err) {
    console.error('Client notify error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

function formatClientMessage(clientName: string, message: string, type: string): string {
  const firstName = clientName.split(' ')[0];

  const prefix: Record<string, string> = {
    welcome:     `🌟 *The Singular Choice*\n\nEstimado ${firstName},\n\n`,
    itinerary:   `✈️ *Actualización de su itinerario*\n\nEstimado ${firstName},\n\n`,
    reminder:    `📅 *Recordatorio*\n\nEstimado ${firstName},\n\n`,
    document:    `📎 *Nuevo documento disponible*\n\nEstimado ${firstName},\n\n`,
    experience:  `✨ *Una propuesta especial para usted*\n\nEstimado ${firstName},\n\n`,
    custom:      `💎 *The Singular Choice*\n\nEstimado ${firstName},\n\n`,
  };

  const footer = '\n\n_Su concierge personal, siempre a su disposición._\n🌐 The Singular Choice';

  return (prefix[type] || prefix.custom) + message + footer;
}
