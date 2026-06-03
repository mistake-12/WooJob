import { NextResponse } from 'next/server';
import { createServerSupabaseClientSync } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerSupabaseClientSync();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: data.user });
}
