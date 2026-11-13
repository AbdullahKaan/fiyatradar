import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseFilters, searchCatalog } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 503 });
  }
  const filters = parseFilters((k) => req.nextUrl.searchParams.get(k));
  try {
    const result = await searchCatalog(getPublicSupabase(), filters);
    return NextResponse.json(result, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
