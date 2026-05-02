import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export const maxDuration = 30;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(request: NextRequest) {
  try {
    const { contact_id, destination, mood_tags = [], additional_notes = '' } = await request.json();

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id es requerido' }, { status: 400 });
    }

    // Get contact details for personalization
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('name, notes_text, summary_ai, lifestyle_prefs')
      .eq('id', contact_id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    const clientName = contact.name;
    const lifestyleContext = contact.lifestyle_prefs
      ? JSON.stringify(contact.lifestyle_prefs)
      : 'No hay preferencias registradas';
    const moodContext = mood_tags.length > 0 ? mood_tags.join(', ') : 'no especificado';
    const destContext = destination || 'destino a definir';

    // Build the prompt
    const systemPrompt = `Eres el redactor creativo de "The Singular Choice", la agencia de concierge de lujo de élite.
Tu escritura es poética, evocadora, cinematic. Inspiras al lector. Usas frases cortas con impacto.
Mezclas lo sensorial con lo emocional. Nunca usas clichés turísticos como "paraíso" o "magnífico".
Tu tono es el de una carta personal, íntima, de un experto que conoce profundamente al cliente.`;

    const userPrompt = `Escribe una narrativa luxury inmersiva para ${clientName}.

Destino: ${destContext}
Sensaciones buscadas: ${moodContext}
Preferencias personales del cliente: ${lifestyleContext}
${additional_notes ? `Contexto adicional: ${additional_notes}` : ''}
${contact.summary_ai ? `Perfil IA del cliente: ${contact.summary_ai}` : ''}

La narrativa debe:
1. Comenzar con una frase poderosa que evoque el destino en 1 línea
2. Describir 3-4 momentos únicos e irrepetibles de la experiencia (no hoteles genéricos)
3. Referirse al cliente de forma personal cuando sea natural
4. Terminar con una frase que invite a decir "sí" sin presión

Extensión: 180-250 palabras en español.
Incluye al inicio un título poético de 5-8 palabras para "Pursuit of Feeling".`;

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Extract feeling title (first line if it looks like a title)
    const lines = text.trim().split('\n').filter(l => l.trim());
    const firstLine = lines[0] || '';
    const isTitleLine = firstLine.length < 80 && !firstLine.endsWith('.');
    const feelingTitle = isTitleLine ? firstLine.replace(/^#+\s*/, '').trim() : undefined;
    const narrative = isTitleLine ? lines.slice(1).join('\n').trim() : text.trim();

    // Save to luxury_experiences table
    const { data: experience, error: dbError } = await supabaseAdmin
      .from('luxury_experiences')
      .insert({
        contact_id,
        destination: destContext,
        mood_tags,
        narrative,
        feeling_title: feelingTitle,
        sent_to_portal: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error saving experience:', dbError);
      // Still return the generated text even if DB fails
      return NextResponse.json({ narrative, feeling_title: feelingTitle, destination: destContext });
    }

    // Notify advisor via Telegram
    await fetch(`${request.nextUrl.origin}/api/telegram/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'experience_generated',
        data: { client_name: clientName, destination: destContext },
      }),
    }).catch(() => {}); // Non-blocking

    return NextResponse.json(experience);
  } catch (err) {
    console.error('Generate experience error:', err);
    return NextResponse.json({ error: 'Error al generar la experiencia' }, { status: 500 });
  }
}
