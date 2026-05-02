import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const adminEmails = getAdminEmails();
    const isAdmin = adminEmails.includes(userData.user.email.toLowerCase());
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await adminClient
      .from('price_intentions')
      .select('plan_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const rows = data ?? [];
    const now = Date.now();
    const last24h = rows.filter((r: any) => now - new Date(r.created_at).getTime() <= 24 * 60 * 60 * 1000).length;
    const byPlan = rows.reduce(
      (acc: Record<string, number>, r: any) => {
        acc[r.plan_name] = (acc[r.plan_name] || 0) + 1;
        return acc;
      },
      { Free: 0, Pro: 0, Team: 0 }
    );

    return new Response(
      JSON.stringify({
        total: rows.length,
        last24h,
        byPlan,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), { status: 500 });
  }
}

