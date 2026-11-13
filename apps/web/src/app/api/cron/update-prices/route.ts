import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * Triggers the Python scraper pipeline by dispatching the GitHub Actions workflow
 * (scripts/scraper runs there with Playwright), then revalidates ISR pages.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const provided = auth?.startsWith('Bearer ') ? auth.slice(7) : req.headers.get('x-cron-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  let pipeline: { triggered: boolean; detail: string };

  if (repo && token) {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/scraper-cron.yml/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ ref: process.env.GITHUB_REF_NAME || 'main' }),
    }).catch((e: Error) => ({ ok: false, status: 0, text: async () => e.message }) as const);
    pipeline = res.ok
      ? { triggered: true, detail: 'GitHub Actions scraper iş akışı tetiklendi.' }
      : { triggered: false, detail: `Tetikleme başarısız (${res.status}): ${await res.text()}` };
  } else {
    pipeline = { triggered: false, detail: 'GITHUB_REPO/GITHUB_TOKEN tanımlı değil; scraper 6 saatlik zamanlanmış iş ile çalışır.' };
  }

  revalidatePath('/');
  revalidatePath('/urun/[slug]', 'page');

  return NextResponse.json({ ok: pipeline.triggered, ...pipeline, revalidated: true, at: new Date().toISOString() }, { status: pipeline.triggered || !repo ? 200 : 502 });
}
