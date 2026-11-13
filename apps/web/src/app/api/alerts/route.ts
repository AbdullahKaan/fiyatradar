import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createPriceAlert, deleteAlert, getUserAlerts } from '@price-compare/shared';
import { getServerSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function authed() {
  if (!isSupabaseConfigured()) return { error: NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 503 }) } as const;
  const supabase = getServerSupabase(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Giriş yapmanız gerekiyor.' }, { status: 401 }) } as const;
  return { supabase, user } as const;
}

export async function GET() {
  const ctx = await authed();
  if ('error' in ctx) return ctx.error;
  try {
    return NextResponse.json({ alerts: await getUserAlerts(ctx.user.id, ctx.supabase) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await authed();
  if ('error' in ctx) return ctx.error;
  const body = (await req.json().catch(() => ({}))) as { product_id?: string; target_price?: number };
  if (!body.product_id || typeof body.target_price !== 'number' || !(body.target_price > 0)) {
    return NextResponse.json({ error: 'product_id ve pozitif target_price gerekli.' }, { status: 400 });
  }
  try {
    const alert = await createPriceAlert(ctx.user.id, body.product_id, body.target_price, ctx.supabase);
    return NextResponse.json({ alert }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await authed();
  if ('error' in ctx) return ctx.error;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id parametresi gerekli.' }, { status: 400 });
  try {
    // RLS restricts deletion to the owner's alerts.
    await deleteAlert(id, ctx.supabase);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
