import { NextResponse } from 'next/server';
import { createServerSupabaseClientSync } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClientSync();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes.user) {
    return NextResponse.json({ ok: false, error: userErr?.message ?? 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { resume?: { id?: string; url?: string; filename?: string } };
  const resume = body.resume;

  const { data: journey, error } = await supabase
    .from('ai_journeys')
    .insert({
      user_id: userRes.user.id,
      title: '求职陪跑',
      current_stage: 'onboarding',
      stages: [],
      resume_file_id: resume?.id ?? null,
      resume_url: resume?.url ?? null,
      resume_filename: resume?.filename ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, journey });
}
