import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_STYLES: Record<string, string> = {
  'Lead Frío':         'bg-slate-100 border-slate-200 text-slate-600',
  'Llamada Agendada':  'bg-blue-100 border-blue-200 text-blue-700',
  'Cliente Potencial': 'bg-orange-100 border-orange-200 text-orange-700',
  'Cliente Activo':    'bg-emerald-100 border-emerald-200 text-emerald-700',
};

export const ALL_STATUSES = [
  'Lead Frío',
  'Llamada Agendada',
  'Cliente Potencial',
  'Cliente Activo',
] as const;

const AI_MODEL = 'gemini-2.5-flash';

export async function fetchAI(prompt: string, systemInstruction = ''): Promise<string> {
  const url = '/api/chat';

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, system: systemInstruction }),
      });

      if (response.status === 429 || response.status === 503) {
        if (i < 4) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.text || '';
    } catch (error: any) {
      if (i === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return '';
}

/**
 * Extrae y parsea JSON de una respuesta de texto de la IA de forma robusta.
 * Maneja bloques de código markdown, comas finales y caracteres de escape comunes.
 */
export function extractJSON<T>(text: string): T {
  try {
    // 1. Limpieza básica de bloques de código markdown
    let cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
    
    // 2. Localizar el primer '{' o '[' y el último '}' o ']'
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const endIdx = (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) ? lastBrace : lastBracket;
    
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      throw new Error('No se encontró una estructura JSON válida en la respuesta.');
    }
    
    cleanText = cleanText.substring(startIdx, endIdx + 1);

    try {
      return JSON.parse(cleanText) as T;
    } catch (initialError) {
      // 3. Intento de reparación de errores comunes si el primer parse falla
      
      // A. Reemplazar saltos de línea literales dentro de las cadenas (error común de la IA)
      // Buscamos saltos de línea que estén precedidos por un número impar de comillas
      let fixedText = cleanText.replace(/\n/g, (match, offset, str) => {
        // Contamos cuántas comillas (no escapadas) hay antes de este salto de línea
        const before = str.substring(0, offset);
        const quoteCount = (before.match(/(?<!\\)"/g) || []).length;
        // Si el número es impar, estamos dentro de una cadena
        return (quoteCount % 2 === 1) ? "\\n" : match;
      });
      
      // B. Eliminar comas finales: {"a":1,} -> {"a":1} o [1,2,] -> [1,2]
      fixedText = fixedText.replace(/,\s*([}\]])/g, '$1');
      
      try {
        return JSON.parse(fixedText) as T;
      } catch (secondError) {
        console.error('JSON Extraction failed after repair attempts.');
        throw secondError;
      }
    }
  } catch (e) {
    console.error('JSON Extraction failed. Raw text:', text);
    console.error('Error details:', e);
    throw new Error('La IA no devolvió un formato JSON válido.');
  }
}
