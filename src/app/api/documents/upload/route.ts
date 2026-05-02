import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contactId = formData.get('contact_id') as string;
    const userId = formData.get('user_id') as string;
    const portalId = formData.get('portal_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }
    if (!contactId || !userId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el límite de 50MB' }, { status: 413 });
    }

    // Allowed types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 });
    }

    // Generate unique storage path
    const ext = file.name.split('.').pop() || 'bin';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${contactId}/${Date.now()}_${sanitizedName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: 'Error al subir el archivo al almacenamiento' }, { status: 500 });
    }

    // Record in documents table
    const { data: docRecord, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: userId,
        contact_id: contactId,
        portal_id: portalId || null,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage upload
      await supabaseAdmin.storage.from('documents').remove([filePath]);
      console.error('DB error:', dbError);
      return NextResponse.json({ error: 'Error al registrar el documento' }, { status: 500 });
    }

    return NextResponse.json({ document: docRecord }, { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
