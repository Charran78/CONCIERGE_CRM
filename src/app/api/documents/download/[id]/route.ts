import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/documents/download/[id]'>
) {
  try {
    const { id } = await ctx.params;

    // Get document record
    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Generate signed URL (valid 1 hour)
    const { data: signedUrl, error: signError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600, {
        download: doc.name,
      });

    if (signError || !signedUrl) {
      console.error('Signed URL error:', signError);
      return NextResponse.json({ error: 'Error al generar el enlace de descarga' }, { status: 500 });
    }

    // Log activity if we can find the portal
    if (doc.portal_id) {
      await supabaseAdmin.from('portal_activity').insert({
        portal_id: doc.portal_id,
        activity_type: 'document_downloaded',
        description: `Descarga: ${doc.name}`,
      }).then(() => {});
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
