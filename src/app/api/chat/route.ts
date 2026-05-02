import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// Permite que la ejecución tarde hasta 30 segundos
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { prompt, system } = await req.json();

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: system || "Eres un asistente experto en ventas. Ayudas a redactar emails y resumir llamadas.",
      prompt: prompt,
    });

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en API Chat:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
